import { api, APIError } from 'encore.dev/api'
import {
	ExcelTemplateData,
	StudentCronEvent,
	StudentDB,
	StudentParam
} from '../schema/student.js'
import log from 'encore.dev/log'
import studentController from './controller.js'
import notificationController from '../notifications/controller.js'
import {
	CreateBatchNotificationData,
	CreateBatchNotificationItemData
} from '../schema/notifications.js'
import dayjs from 'dayjs'
import { readFile } from 'fs/promises'
import { createReport } from 'docx-templates'
import path from 'path'
import { AppError } from '../errors/index.js'
import { Unit } from '../units/units.js'
import { notiTopic } from '../topics/index.js'
import * as v from 'valibot'
import XlsxTemplate from 'xlsx-template'

interface ChildrenInfo {
	fullName: string
	dob: string
}

interface StudentBody {
	fullName: string
	birthPlace: string
	address: string
	dob: string
	rank: string
	previousUnit: string
	previousPosition: string
	ethnic: string
	religion: string
	enlistmentPeriod: string
	politicalOrg: 'hcyu' | 'cpv'
	politicalOrgOfficialDate: string
	cpvId: string | null
	educationLevel: string
	schoolName: string
	major: string
	isGraduated: boolean
	talent: string
	shortcoming: string
	policyBeneficiaryGroup: string
	fatherName: string
	fatherDob: string
	fatherPhoneNumber: string
	fatherJob: string
	// fatherJobAddress: string;
	motherName: string
	motherDob: string
	motherPhoneNumber: string
	motherJob: string
	// motherJobAddress: string;
	isMarried: boolean
	spouseName: string
	spouseDob: string
	spouseJob: string
	spousePhoneNumber: string
	familySize: number
	familyBackground: string
	familyBirthOrder: string
	achievement: string
	disciplinaryHistory: string
	childrenInfos: ChildrenInfo[]
	phone: string
	classId: number
}

interface StudentDBResponse extends StudentBody {
	id: number
	createdAt: string
	updatedAt: string
}

interface StudentResponse extends StudentDBResponse {
	class: { id: number; description: string; name: string }
}

interface BulkStudentResponse {
	data: StudentDBResponse[]
}

export const CreateStudent = api(
	{ expose: true, method: 'POST', path: '/students' },
	async (body: StudentBody): Promise<BulkStudentResponse> => {
		const studentParam: StudentParam = {
			...body
		}
		log.trace('students.CreateStudents body', { studentParam })

		const createdStudent = await studentController.create([studentParam])

		const resp = createdStudent.map((s) => ({ ...s }) as StudentDBResponse)

		return { data: resp }
	}
)

interface StudentBulkBody {
	data: StudentBody[]
}

export const CreateStudents = api(
	{ expose: false, method: 'POST', path: '/students/bulk' },
	async (body: StudentBulkBody): Promise<BulkStudentResponse> => {
		const studentParams = body.data.map((b) => ({ ...b }) as StudentParam)

		const createdStudent = await studentController.create(studentParams)

		const resp = createdStudent.map((s) => ({ ...s }) as StudentDBResponse)

		return { data: resp }
	}
)
interface GetStudentsResponse {
	data: StudentResponse[]
}

type Month =
	| '01'
	| '02'
	| '03'
	| '04'
	| '05'
	| '06'
	| '07'
	| '08'
	| '09'
	| '10'
	| '11'
	| '12'

type Quarter = 'Q1' | 'Q2' | 'Q3' | 'Q4'

export interface GetStudentsQuery {
	birthdayInMonth?: Month
	birthdayInQuarter?: Quarter
	birthdayInWeek?: boolean
	classId?: number
	hasReligion?: boolean
	ids?: Array<number>
	isEthnicMinority?: boolean
	isMarried?: boolean
	politicalOrg?: 'hcyu' | 'cpv'
	unitAlias?: string
	unitLevel?: 'battalion' | 'company'
	isCpvOfficialThisWeek?: boolean
	cpvOfficialInMonth?: Month
	cpvOfficialInQuarter?: Quarter
}

export const GetStudents = api(
	{ expose: true, method: 'GET', path: '/students' },
	async (query: GetStudentsQuery): Promise<GetStudentsResponse> => {
		log.trace('students.GetStudents query params', { params: query })
		const students = await studentController.find(query)
		const resp = students.map(
			(s) => ({ ...s }) as unknown as StudentResponse
		)

		return { data: resp }
	}
)

interface DeleteStudentRequest {
	ids: number[]
}

interface DeleteStudentResponse {
	ids: number[]
}

export const DeleteStudents = api(
	{ expose: true, method: 'DELETE', path: '/students' },
	async (body: DeleteStudentRequest): Promise<DeleteStudentResponse> => {
		log.trace('students.DeleteStudents body', { body })

		const students: StudentDB[] = body.ids.map(
			(id) => ({ id }) as StudentDB
		)
		await studentController.delete(students)

		return { ids: body.ids }
	}
)

interface UpdatePayload extends Partial<StudentBody> {
	id: number
}

interface UpdateStudentBody {
	data: UpdatePayload[]
}

export const UpdateStudents = api(
	{ expose: true, method: 'PATCH', path: '/students' },
	async (body: UpdateStudentBody) => {
		const students: StudentDB[] = body.data.map(
			(s) => ({ ...s }) as StudentDB
		)

		await studentController.update(students)

		return {}
	}
)

async function getTypedRequestBody<T>(
	req: any,
	schema: v.BaseSchema<unknown, T, v.BaseIssue<unknown>>
): Promise<T> {
	const chunks: Buffer[] = []

	req.on('data', (chunk: Buffer) => {
		chunks.push(chunk)
	})

	await new Promise<void>((resolve, reject) => {
		req.on('end', () => resolve())
		req.on('error', reject)
	})

	const body = Buffer.concat(chunks).toString('utf-8')

	try {
		const rawBody = JSON.parse(body)

		// Validate and parse using valibot schema
		const result = v.safeParse(schema, rawBody)

		if (!result.success) {
			log.error('Request body validation failed', {
				issues: result.issues,
				body: rawBody
			})
			throw AppError.invalidArgument(
				`Invalid request body: ${result.issues.map((issue) => issue.message).join(', ')}`
			)
		}

		return result.output
	} catch (error) {
		if (error instanceof SyntaxError) {
			log.error('Invalid JSON in request body', { error, body })
			throw AppError.invalidArgument('Invalid JSON body')
		}
		// Re-throw validation errors and other custom errors
		throw error
	}
}

const ExportStudentDataRequestSchema = v.object({
	city: v.string(),
	commanderName: v.string(),
	commanderPosition: v.string(),
	commanderRank: v.string(),
	data: v.pipe(v.array(v.record(v.string(), v.string())), v.minLength(1)),
	date: v.optional(
		v.pipe(v.string(), v.isoDate()),
		dayjs().format('YYYY-MM-DD')
	),
	reportTitle: v.string(),
	underUnitName: v.string(),
	unitName: v.string()
})

export const ExportStudentData = api.raw(
	{ expose: true, method: 'POST', path: '/students/export' },
	async (req, resp) => {
		try {
			const body = await getTypedRequestBody(
				req,
				ExportStudentDataRequestSchema
			)

			log.info('ExportStudentData request body: ', { body })
			const {
				city,
				data,
				date,
				underUnitName,
				reportTitle,
				unitName,
				commanderPosition,
				commanderName,
				commanderRank
			} = body

			// Read the template file
			const templatePath = path.join(
				'./templates',
				'dynamic-docx-template.docx'
			)
			const template = await readFile(templatePath)

			// Prepare data for template
			const selectedColumns = Object.keys(data[0] || {})

			// Prepare rows data
			const rows = data.map((student) => {
				// Create an array of cell values in the same order as columns
				const cellValues = selectedColumns.map((col) => {
					let cellValue = student[col]

					// Format different data types
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

				return cellValues
			})

			const dateObj = dayjs(date)
			const day = dateObj.format('DD')
			const month = dateObj.format('MM')
			const year = dateObj.year()

			const templateData: ExcelTemplateData = {
				city,
				columns: selectedColumns,
				commanderName,
				commanderPosition,
				commanderRank,
				day,
				month,
				reportTitle,
				rows: data,
				underUnitName,
				unitName,
				year
			}

			// Generate the report
			const buffer = await createReport({
				template,
				data: templateData,
				cmdDelimiter: ['{', '}']
			})

			resp.setHeader(
				'Content-Type',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			)
			resp.writeHead(200, { Connection: 'close' })
			return resp.end(buffer)
		} catch (err) {
			console.error('SOS', err)

			log.error('Template processing error', { err })
			throw APIError.internal('Internal error for exporting file')
		}
	}
)

type StudentParamsCronEvent =
	| 'birthdayThisWeek'
	| 'birthdayThisMonth'
	| 'birthdayThisQuarter'
	| 'cpvOfficialThisWeek'
	| 'cpvOfficialThisMonth'
	| 'cpvOfficialThisQuarter'

export const StudentCronjob = api(
	{ expose: true, method: 'GET', path: '/students/cron' },
	async (params: { event: StudentParamsCronEvent }) => {
		log.trace('students.StudentCronjob is running with params: ', {
			params
		})

		const students = await studentController.getStudentsByCronEvent({
			event: params.event as StudentCronEvent
		})

		if (
			students === undefined ||
			students === null ||
			students.length === 0
		) {
			log.trace('students.StudentCronjob stop. students is empty')
			return {}
		}

		log.trace('students.StudentCronjob students results', { students })
		const items: CreateBatchNotificationItemData = students.map((s) => ({
			notifiableId: s.id,
			notifiableType: 'students'
		}))
		const isCpvEvent = params.event.includes('cpv')
		const date = dayjs().unix()

		const firstStudent = students[0]
		let periodText
		switch (params.event) {
			case 'birthdayThisMonth':
			case 'cpvOfficialThisMonth':
				periodText = 'Tháng'
				break
			case 'birthdayThisQuarter':
			case 'cpvOfficialThisQuarter':
				periodText = 'Quý'
				break

			case 'birthdayThisWeek':
			case 'cpvOfficialThisWeek':
			default:
				periodText = 'Tuần'
				break
		}

		const baseMessage = `${periodText} này có sinh nhật của đồng chí ${firstStudent.fullName}`
		let batchNotification: CreateBatchNotificationData = {
			notificationType: 'birthday',
			title: 'Sinh nhật đồng đội',
			message:
				students.length === 1
					? baseMessage
					: `${baseMessage} và ${students.length - 1} đồng chí khác`,
			batchKey: `birthday_${params.event}_${date}`,
			items
		}

		if (isCpvEvent) {
			const baseCpvMessage = `${periodText} này có sự kiện chuyển Đảng chính thức của đồng chí ${firstStudent.fullName}`
			batchNotification = {
				notificationType: 'officialCpv',
				title: 'Chuyển Đảng chính thức',
				message:
					students.length === 1
						? baseCpvMessage
						: `${baseCpvMessage} và ${students.length - 1} đồng chí khác`,
				batchKey: `cpvOfficial_${params.event}_${date}`,
				items
			}
		}

		await notificationController.createBatch(batchNotification).then(() => {
			notiTopic.publish({
				message: batchNotification.message,
				title: batchNotification.title,
				userId: 0,
				type: params.event
			})
		})

		log.info('students.StudentCronjob complete!')
	}
)

interface GetPoliticsQualityReportRequest {
	unitId: number
}

interface GetPoliticsQualityReportResponse {
	data: Record<number, Record<string, any>>
	unit: Unit
}

export const GetPoliticsQualityReport = api(
	{ expose: true, method: 'GET', path: '/students/politics-quality-report' },
	async ({
		unitId
	}: GetPoliticsQualityReportRequest): Promise<GetPoliticsQualityReportResponse> => {
		const { data, unit: u } =
			await studentController.politicsQualityReport(unitId)
		const unit = { ...u } as Unit

		return { data, unit }
	}
)

const PoliticsQualitySummarySchema = v.object({
	idx: v.number(),
	className: v.string(),
	total: v.number(),
	totalColonel: v.number(),
	totalLieutenant: v.number(),
	totalProSoldierCommander: v.number(),
	totalProSoldier: v.number(),
	totalSoldier: v.number(),
	totalWorker: v.number(),
	kinh: v.number(),
	hoa: v.number(),
	otherEthnics: v.number(),
	buddhism: v.number(),
	christianity: v.number(),
	caodaism: v.number(),
	protestantism: v.number(),
	hoahaoism: v.number(),
	secondarySchool: v.number(),
	highSchool: v.number(),
	universityAndOthers: v.number(),
	postGraduate: v.number(),
	cpv: v.number(),
	hcyu: v.number(),
	cm: v.number(),
	nguy: v.number(),
	aboard: v.number(),
	male: v.number(),
	female: v.number(),
	note: v.optional(v.string(), '')
})

const ExportPoliticsQualityReportSchema = v.object({
	data: v.pipe(v.array(PoliticsQualitySummarySchema), v.minLength(1)),
	date: v.optional(
		v.pipe(v.string(), v.isoDate()),
		dayjs().format('YYYY-MM-DD')
	),
	title: v.string()
})

const sheetNumber = 1

export const ExportPoliticsQualityReport = api.raw(
	{
		expose: true,
		method: 'POST',
		path: '/students/politics-quality-report/export'
	},
	async (req, resp) => {
		try {
			const body = await getTypedRequestBody(
				req,
				ExportPoliticsQualityReportSchema
			)

			log.info('ExportPoliticsQualityReport body', { body })
			const { data, date, title } = body
			/* const data = [
                {
                    idx: 1,
                    className: 'KCL1',
                    total: 21,
                    totalColonel: 12,
                    totalLieutenant: 1,
                    totalProSoldierCommander: 1,
                    totalProSoldier: 0,
                    totalSoldier: 0,
                    totalWorker: 0,
                    kinh: 20,
                    hoa: 0,
                    otherEthnics: 1,
                    buddhism: 0,
                    christianity: 0,
                    caodaism: 0,
                    protestantism: 0,
                    hoahaoism: 0,
                    secondarySchool: 15,
                    highSchool: 11,
                    universityAndOthers: 10,
                    postGraduate: 22,
                    cpv: 30,
                    hcyu: 50,
                    cm: 0,
                    nguy: 0,
                    aboard: 0,
                    male: 0,
                    female: 0,
                    note: ''
                },
                {
                    idx: 2,
                    className: 'K1',
                    total: 21,
                    totalColonel: 12,
                    totalLieutenant: 1,
                    totalProSoldierCommander: 1,
                    totalProSoldier: 0,
                    totalSoldier: 0,
                    totalWorker: 0,
                    kinh: 20,
                    hoa: 0,
                    otherEthnics: 1,
                    buddhism: 0,
                    christianity: 0,
                    caodaism: 0,
                    protestantism: 0,
                    hoahaoism: 0,
                    secondarySchool: 15,
                    highSchool: 11,
                    universityAndOthers: 20,
                    postGraduate: 22,
                    cpv: 30,
                    hcyu: 50,
                    cm: 0,
                    nguy: 0,
                    aboard: 0,
                    male: 0,
                    female: 0,
                    note: ''
                },
                {
                    idx: 3,
                    className: 'K2',
                    total: 21,
                    totalColonel: 12,
                    totalLieutenant: 1,
                    totalProSoldierCommander: 1,
                    totalProSoldier: 0,
                    totalSoldier: 0,
                    totalWorker: 0,
                    kinh: 20,
                    hoa: 0,
                    otherEthnics: 1,
                    buddhism: 0,
                    christianity: 0,
                    caodaism: 0,
                    protestantism: 0,
                    hoahaoism: 0,
                    secondarySchool: 15,
                    highSchool: 11,
                    universityAndOthers: 20,
                    postGraduate: 22,
                    cpv: 30,
                    hcyu: 50,
                    cm: 0,
                    nguy: 0,
                    aboard: 0,
                    male: 0,
                    female: 0,
                    note: ''
                }
            ] */
			const dateObj = dayjs(date)
			const day = dateObj.format('DD')
			const month = dateObj.format('MM')
			const year = dateObj.year()

			const templatePath = path.join('./templates', 'xlsx-template.xlsx')
			const templateFile = await readFile(templatePath)
			const template = new XlsxTemplate(templateFile)
			template.substitute(sheetNumber, {
				data,
				endRowNum: 10 + data.length - 1,
				title,
				day,
				month,
				year
			})

			const binBuffer = template.generate({ type: 'nodebuffer' })
			resp.writeHead(200, { connection: 'close' })
			return resp.end(binBuffer)
		} catch (err) {
			console.error('ExportPoliticsQualityReport errror', err)
			log.error('ExportPoliticsQualityReport err', { err })
			throw APIError.internal('Internal error for exporting file')
		}
	}
)
