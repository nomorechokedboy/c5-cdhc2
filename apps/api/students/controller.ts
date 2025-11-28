import { AppError } from '../errors'
import {
	StudentDB,
	StudentParam,
	Student,
	UpdateStudentMap,
	Month,
	Quarter,
	StudentCronJobEvent,
	BirthdayThisWeek,
	BirthdayThisMonth,
	CpvOfficialThisMonth,
	CpvOfficialThisQuarter,
	CpvOfficialThisWeek,
	BirthdayThisQuarter,
	StudentCronEvent,
	ExcelTemplateData,
	TemplateType,
	students
} from '../schema/student'
import { Repository } from './index'
import { Repository as UnitRepository } from '../units'
import studentRepo from './repo'
import { ExportStudentDataRequest, GetStudentsQuery } from './students'
import unitRepo from '../units/repo'
import log from 'encore.dev/log'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear.js'
import path from 'path'
import { createReport } from 'docx-templates'
import { APIError } from 'encore.dev/api'
import { readFile } from 'fs/promises'
import { createImageInjector, ImageProvider } from './img-provider'
import { ObjectStorageImageAdapter } from './minio-img-provider'
import orm, { DrizzleDatabase } from '../database'
import { inArray, eq, sql, and, ne, between, count } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'

dayjs.extend(quarterOfYear)

export class Controller {
	private templateMap: Record<TemplateType, string> = {
		CpvTempl: 'cpv-templ.docx',
		HcyuTempl: 'hcyu-templ.docx',
		StudentInfoTempl: 'student-info-templ.docx',
		StudentWithAdversityTempl: 'student-with-adversity-templ.docx',
		StudentEnrollmentFormTempl: 'student-enrollment-form-templ.docx'
	}

	constructor(
		private readonly repo: Repository,
		private readonly unitRepo: UnitRepository,
		private readonly imageStorage: ImageProvider,
		private db: DrizzleDatabase
	) { }

	create(params: StudentParam[], classIds: number[]): Promise<StudentDB[]> {
		const checkCLassIds = params.every((c) => classIds.includes(c.classId))
		if (checkCLassIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					'You are not authorized create with this classid'
				)
			)
		}
		return this.repo.create(params).catch(AppError.handleAppErr)
	}



	async delete(studentsTodelete: StudentDB[]) {
		const validClassIds = getAuthData()!.validClassIds

		const classIdsToCheck = await  this.db.select({ id: students.classId })
			.from(students)
			.where(inArray(students.id, studentsTodelete.map(s => s.id))
			)
		const hasPermission = classIdsToCheck.every((c) => validClassIds.includes(c.id));

		if (!hasPermission) {
			throw AppError.handleAppErr(
				AppError.permissionDenied(
					"You don't have permission Delete student!"
				)
			)
		}
		return this.repo.delete(studentsTodelete).catch(AppError.handleAppErr);
	}

	async find(
		{ unitAlias, unitLevel, classId, classIds, ...q }: GetStudentsQuery,
		validClassIds: number[]
	): Promise<Student[]> {
		const isUnitAliasExist = unitAlias !== undefined
		const isUnitLevelExist = unitLevel !== undefined
		const isUnitQueryParamsValid = isUnitAliasExist && isUnitLevelExist

		if (
			(isUnitAliasExist && !isUnitLevelExist) ||
			(!isUnitAliasExist && isUnitLevelExist)
		) {
			throw AppError.invalidArgument('missing unitAlias or unitLevel')
		}

		if (isUnitQueryParamsValid) {
			const u = await this.unitRepo
				.findOne({ alias: unitAlias, level: unitLevel })
				.catch(AppError.handleAppErr)
			if (u === undefined) {
				throw AppError.handleAppErr(
					AppError.notFound(
						`unit with alias: ${unitAlias} and level: ${unitLevel} not found`
					)
				)
			}

			if (u.level === 'battalion') {
				const classIds = u.children
					.map((c) => c.classes.map((cl) => cl.id))
					.flat()
				log.trace('studentRepo.find battalion case classIds', {
					classIds,
					query: q
				})

				const classIdCheck = classIds?.every((id) =>
					validClassIds.includes(id)
				)

				if (classIdCheck === false) {
					AppError.handleAppErr(
						AppError.unauthorized(
							"You don't have permission to read one of those studentId"
						)
					)
				}

				if (classIds.length === 0) {
					AppError.handleAppErr(
						AppError.internal("You don't have classId")
					)
				}

				return this.repo
					.find({ ...q, classIds })
					.catch(AppError.handleAppErr)
			}

			if (u.level === 'company') {
				const classIds = u.classes.map((c) => c.id)
				log.trace('studentRepo.find company case classIds', {
					classIds,
					query: q
				})

				const classIdCheck = classIds?.every((id) =>
					validClassIds.includes(id)
				)

				if (classIdCheck === false) {
					AppError.handleAppErr(
						AppError.unauthorized(
							"You don't have permission to read one of those studentId"
						)
					)
				}

				if (classIds.length === 0) {
					AppError.handleAppErr(
						AppError.internal("You don't have classId")
					)
				}

				return this.repo
					.find({ ...q, classIds })
					.catch(AppError.handleAppErr)
			}
		}

		const cIds: number[] = []
		if (classIds !== undefined) {
			cIds.push(...classIds)
		}

		if (classId !== undefined) {
			cIds.push(classId)
		}
		if (cIds.length === 0) {
			cIds.push(...validClassIds)
		}

		return this.repo
			.find({ ...q, classIds: cIds.length !== 0 ? cIds : undefined })
			.catch(AppError.handleAppErr)
	}

	async update(
		params: StudentDB[],
		validClassIds: number[]
	): Promise<StudentDB[]> {
		const ids = params.map((s) => s.id)
		const isIdsEmpty = ids.length === 0
		const isIdsValid = !ids || isIdsEmpty
		if (isIdsValid) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('No record IDs provided')
			)
		}
		const checkCLassIds = params.every((c) =>
			validClassIds.includes(c.classId)
		)
		if (checkCLassIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission update this student"
				)
			)
		}

		const updateMap: UpdateStudentMap = params.map(
			({ id, ...updatePayload }) => {
				const cleanupPayload = Object.fromEntries(
					Object.entries(updatePayload).filter(
						([_, value]) => value !== undefined
					)
				)

				const isUpdatePayloadEmpty =
					Object.keys(cleanupPayload).length === 0
				if (isUpdatePayloadEmpty) {
					throw AppError.handleAppErr(
						AppError.invalidArgument(
							`No update data provided At least one field must be provided to update record with id: ${id}`
						)
					)
				}

				return { id, updatePayload: cleanupPayload }
			}
		)
		return this.repo.update(updateMap).catch(AppError.handleAppErr)
	}

	getStudentsByCronEvent(params: {
		event: StudentCronEvent
	}): Promise<Array<Student>> {
		let cronEvent: StudentCronJobEvent
		const thisMonth = dayjs().format('MM') as Month
		const thisQuarter = `Q${dayjs().quarter()}` as Quarter

		switch (params.event) {
			case 'birthdayThisWeek':
				cronEvent = new BirthdayThisWeek()
				break
			case 'birthdayThisMonth':
				cronEvent = new BirthdayThisMonth(thisMonth)
				break
			case 'birthdayThisQuarter':
				cronEvent = new BirthdayThisQuarter(thisQuarter)
				break
			case 'cpvOfficialThisWeek':
				cronEvent = new CpvOfficialThisWeek()
				break
			case 'cpvOfficialThisMonth':
				cronEvent = new CpvOfficialThisMonth(thisMonth)
				break
			case 'cpvOfficialThisQuarter':
				cronEvent = new CpvOfficialThisQuarter(thisQuarter)
				break
			default:
				throw AppError.handleAppErr(
					AppError.invalidArgument(`Invalid event: ${params.event}`)
				)
		}

		return this.repo.find(cronEvent.getQueryParams())
	}

	async politicsQualityReport(unitIds: number[]) {
		const units = await this.unitRepo.find({
			ids: unitIds
		})
		if (units.length === 0) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid unitIds')
			)
		}

		const classIds = units.flatMap((unit) => {
			if (unit.level === 'battalion') {
				return unit.children.flatMap((child) =>
					child.classes.map((c) => c.id)
				)
			}

			return unit.classes.map((c) => c.id)
		})

		const educationLevelMap = {
			'7/12': 'Cấp II',
			'8/12': 'Cấp II',
			'9/12': 'Cấp II',
			'10/12': 'Cấp III',
			'11/12': 'Cấp III',
			'12/12': 'Cấp III',
			'Cao đẳng': 'TC-CĐ-ĐH',
			'Đại học': 'TC-CĐ-ĐH',
			'Trung cấp': 'TC-CĐ-ĐH',
			'Sau đại học': 'Sau ĐH'
		}
		const data: Record<number, Record<string, any>> = {}
		const rows = await this.repo.politicsQualityReport(classIds)
		for (const { count, value, classId, category } of rows) {
			if (!data[classId]) {
				data[classId] = {}
			}

			if (category === 'classId') {
				data[classId].total = count
			} else {
				if (!data[classId][category]) {
					data[classId][category] = {}
				}

				const educationLevelMapKey = String(
					value
				) as keyof typeof educationLevelMap

				if (educationLevelMap[educationLevelMapKey] !== undefined) {
					const valueLabel = educationLevelMap[educationLevelMapKey]
					if (
						data[classId][category][valueLabel] === undefined ||
						data[classId][category][valueLabel] === null
					) {
						data[classId][category][valueLabel] = 0
					}

					data[classId][category][valueLabel] += count
				} else {
					data[classId][category][String(value)] = count
				}
			}
		}

		return { data, units }
	}

	getTemplate(templateType: TemplateType): Promise<Buffer> {
		if (this.templateMap[templateType] === undefined || '') {
			throw AppError.invalidArgument('Invalid template file')
		}

		const templateFile = this.templateMap[templateType]
		const templatePath = path.join('./templates', templateFile)
		return readFile(templatePath)
	}

	async handleExportStudentData(
		req: ExportStudentDataRequest
	): Promise<Uint8Array> {
		try {
			log.info('ExportStudentData starting')
			const {
				city,
				data,
				date,
				underUnitName,
				unitName,
				commanderPosition,
				commanderName,
				commanderRank,
				templateType
			} = req

			// Prepare rows data
			const rows: Record<string, any>[] = data.map((student, idx) => {
				Object.keys(student).forEach((col) => {
					let cellValue = student[col]

					if (cellValue === null || cellValue === undefined) {
						cellValue = ''
					} else if (typeof cellValue === 'boolean') {
						cellValue = cellValue ? 'Có' : 'Không'
					} else if (Array.isArray(cellValue)) {
						cellValue =
							cellValue.length > 0 ? cellValue.join(', ') : ''
					} else {
						cellValue = String(cellValue)
					}

					return cellValue
				})

				if (templateType === 'CpvTempl') {
					const ethnic = student['ethnic']
					const isKinh = ethnic === 'Kinh'
					const isTay = ethnic === 'Tày'
					const isNung = ethnic === 'Nùng '
					if (isKinh || isTay || isNung) {
						student['ethnic'] = 'Không'
					}
				}

				return { idx: ++idx, ...student }
			})

			const dateObj = dayjs(date)
			const day = dateObj.format('DD')
			const month = dateObj.format('MM')
			const year = dateObj.year()

			const templateData: ExcelTemplateData = {
				city,
				commanderName,
				commanderPosition,
				commanderRank,
				day,
				month,
				rows,
				underUnitName,
				unitName,
				year
			}

			const template = await this.getTemplate(templateType!)

			let templData: any = {}
			if (templateType !== 'StudentEnrollmentFormTempl') {
				templData = { ...templateData }
			} else {
				const stu = rows.at(0)
				if (stu === undefined) {
					AppError.handleAppErr(
						AppError.invalidArgument('Student data is empty')
					)
				}

				const parentUnit = await this.unitRepo
					.getOne({ id: stu.class.unit.parentId })
					.catch(AppError.handleAppErr)

				const { rows: _, ...templateDataWithoutRows } = templateData
				templData = {
					stu,
					companyName: stu.class.unit.name,
					batalionName: parentUnit?.name,
					...templateDataWithoutRows
				}
			}

			// Get the student's avatar key from storage
			// Assuming the avatar key is stored in the student data
			const studentAvatarKey = rows[0]?.avatar || 'default-avatar.png'

			// Generate the report with image from object storage
			const buffer = await createReport({
				template,
				data: templData,
				cmdDelimiter: ['{', '}'],
				additionalJsContext: {
					// Use the image injector with object storage
					injectAvt: createImageInjector(
						studentAvatarKey,
						this.imageStorage,
						{ width: 3, height: 4 }
					)
				}
			})

			return buffer
		} catch (err) {
			console.error('handleExportStudentData error', err)
			log.error('handleExportStudentData error', { err })

			throw APIError.internal('Internal error for exporting file')
		}
	}
}

const studentController = new Controller(
	studentRepo,
	unitRepo,
	ObjectStorageImageAdapter,
	orm
)

export default studentController
