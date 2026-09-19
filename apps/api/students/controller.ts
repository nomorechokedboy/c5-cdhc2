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
	TemplateType
} from '../schema/student'
import { Repository } from './index'
import { Repository as UnitRepository } from '../units'
import studentRepo from './repo'
import { ExportStudentDataRequest, GetStudentsQuery } from './students'
import unitRepo from '../units/repo'
import { collectUnitIds } from '../units/tree'
import log from 'encore.dev/log'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear.js'
import path from 'path'
import { createReport } from 'docx-templates'
import { APIError } from 'encore.dev/api'
import { readFile } from 'fs/promises'
import { createImageInjector, ImageProvider } from './img-provider'
import { ObjectStorageImageAdapter } from './minio-img-provider'
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
		private readonly imageStorage: ImageProvider
	) {}

	/** Học viên chỉ được thuộc đơn vị cấp lớp (units.level = 'class') */
	private async assertClassUnits(unitIds: number[]) {
		const ids = [...new Set(unitIds)]
		if (ids.length === 0) return

		const found = await this.unitRepo
			.find({ ids, with: { parent: false, children: false } })
			.catch(AppError.handleAppErr)
		const isAllClass =
			found.length === ids.length &&
			found.every((u) => u.level === 'class')
		if (!isAllClass) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'Học viên chỉ được thuộc đơn vị cấp lớp'
				)
			)
		}
	}

	async create(
		params: StudentParam[],
		validUnitIds: number[]
	): Promise<StudentDB[]> {
		const checkUnitIds = params.every((c) =>
			validUnitIds.includes(c.unitId)
		)
		if (checkUnitIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					'You are not authorized create with this unitId'
				)
			)
		}
		await this.assertClassUnits(params.map((c) => c.unitId))
		return this.repo.create(params).catch(AppError.handleAppErr)
	}

	async delete(studentsTodelete: StudentDB[], validUnitIds: number[]) {
		const ids = studentsTodelete.map((student) => student.id)
		const students = await this.repo.find({ ids })
		const studentsUnitIds = students.map((student) => student.unit.id)
		const hasPermission = studentsUnitIds.every((id) =>
			validUnitIds.includes(id)
		)
		if (!hasPermission) {
			throw AppError.handleAppErr(
				AppError.permissionDenied(
					"You don't have permission Delete student!"
				)
			)
		}

		return this.repo.delete(studentsTodelete).catch(AppError.handleAppErr)
	}

	async find(
		{ unitAlias, unitLevel, unitId, unitIds, ...q }: GetStudentsQuery,
		validUnitIds: number[]
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

			// Học viên thuộc đơn vị cấp lớp: gom lớp con cháu của đơn vị được chọn
			const classUnitIds = collectUnitIds(u, 'class')
			log.trace('studentRepo.find unit case classUnitIds', {
				classUnitIds,
				query: q
			})

			const isValidUnitIds = classUnitIds.every((id) =>
				validUnitIds.includes(id)
			)
			if (isValidUnitIds === false) {
				throw AppError.handleAppErr(
					AppError.unauthorized(
						"You don't have permission to read one of those studentId"
					)
				)
			}

			return this.repo
				.find({ ...q, unitIds: classUnitIds })
				.catch(AppError.handleAppErr)
		}

		const cIds: number[] = []
		if (unitIds !== undefined) {
			cIds.push(...unitIds)
		}

		if (unitId !== undefined) {
			cIds.push(unitId)
		}
		if (cIds.length === 0) {
			cIds.push(...validUnitIds)
		}

		return this.repo
			.find({ ...q, unitIds: cIds.length !== 0 ? cIds : undefined })
			.catch(AppError.handleAppErr)
	}

	async update(
		params: StudentDB[],
		validUnitIds: number[]
	): Promise<StudentDB[]> {
		const ids = params.map((s) => s.id)
		const isIdsEmpty = ids.length === 0
		const isIdsValid = !ids || isIdsEmpty
		if (isIdsValid) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('No record IDs provided')
			)
		}
		// Học viên hiện tại phải nằm trong phạm vi đơn vị của người dùng
		const existing = await this.repo
			.find({ ids })
			.catch(AppError.handleAppErr)
		// unitId là tuỳ chọn khi cập nhật; nếu chuyển lớp thì lớp mới cũng phải hợp lệ
		const changedUnitIds = params
			.map((c) => c.unitId)
			.filter((id): id is number => id !== undefined)
		const checkUnitIds =
			existing.every((student) =>
				validUnitIds.includes(student.unit.id)
			) && changedUnitIds.every((id) => validUnitIds.includes(id))
		if (checkUnitIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission update this student"
				)
			)
		}

		await this.assertClassUnits(changedUnitIds)

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

	async updateStatus(
		ids: number[],
		status: 'pending' | 'confirmed',
		validUnitIds: number[]
	): Promise<StudentDB[]> {
		log.info('StudentController.updateStatus params: ', {
			ids,
			status,
			validUnitIds
		})

		if (!ids || ids.length === 0) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('No student IDs provided')
			)
		}

		// get students to check their unitIds
		const students = await this.repo
			.find({ ids })
			.catch(AppError.handleAppErr)

		if (students.length === 0) {
			throw AppError.handleAppErr(
				AppError.notFound('No students found with provided IDs')
			)
		}

		// auth check
		const checkUnitIds = students.every((student) =>
			validUnitIds.includes(student.unit.id)
		)

		if (!checkUnitIds) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission to update status of these students"
				)
			)
		}

		// update status
		return this.repo.updateStatus(ids, status).catch(AppError.handleAppErr)
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

	async politicsQualityReport(unitIds: number[], validUnitIds: number[]) {
		const isValidUnitIds = unitIds.every((unitId) =>
			validUnitIds.includes(unitId)
		)
		if (isValidUnitIds === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission on those unitIds"
				)
			)
		}

		const units = await this.unitRepo.find({
			ids: unitIds
		})
		if (units.length === 0) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid unitIds')
			)
		}

		const classUnitIds = [
			...new Set(units.flatMap((unit) => collectUnitIds(unit, 'class')))
		]

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
		const rows = await this.repo.politicsQualityReport(classUnitIds)
		for (const { count, value, unitId, category } of rows) {
			if (!data[unitId]) {
				data[unitId] = {}
			}

			if (category === 'unitId') {
				data[unitId].total = count
			} else {
				if (!data[unitId][category]) {
					data[unitId][category] = {}
				}

				const educationLevelMapKey = String(
					value
				) as keyof typeof educationLevelMap

				if (educationLevelMap[educationLevelMapKey] !== undefined) {
					const valueLabel = educationLevelMap[educationLevelMapKey]
					if (
						data[unitId][category][valueLabel] === undefined ||
						data[unitId][category][valueLabel] === null
					) {
						data[unitId][category][valueLabel] = 0
					}

					data[unitId][category][valueLabel] += count
				} else {
					data[unitId][category][String(value)] = count
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

				// stu.unit là lớp; parent = đại đội; parent.parent = tiểu đoàn
				const company = stu.unit?.parent
				const parentUnit =
					company?.parentId != null
						? await this.unitRepo
								.findOne({ id: company.parentId })
								.catch(AppError.handleAppErr)
						: undefined

				const { rows: _, ...templateDataWithoutRows } = templateData
				templData = {
					// Template docx cũ dùng {stu.class.name}
					stu: { ...stu, class: stu.unit },
					companyName: company?.name,
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
	ObjectStorageImageAdapter
)

export default studentController
