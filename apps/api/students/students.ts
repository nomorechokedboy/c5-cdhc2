import { api, APIError } from 'encore.dev/api'
import { CronJob } from 'encore.dev/cron'
import { StudentCronEvent, StudentDB, StudentParam } from '../schema/student.js'
import log from 'encore.dev/log'
import studentController from './controller.js'
import notificationController from '../notifications/controller.js'
import {
	CreateBatchNotificationData,
	CreateBatchNotificationItemData
} from '../schema/notifications.js'
import dayjs from 'dayjs'
import { readFile, writeFile } from 'fs/promises'
import { createReport, listCommands } from 'docx-templates'
import path from 'path'
import { AppError } from '../errors/index.js'

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

async function getTypedRequestBody<T>(req: any): Promise<T> {
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
		const parsedBody = JSON.parse(body) as T
		return parsedBody
	} catch (error) {
		throw AppError.invalidArgument('Invalid JSON body')
	}
}

type ExportStudentDataRequest = {
	[k: string]: string
}[]

export const ExportStudentData = api.raw(
	{ expose: true, method: 'POST', path: '/students/export' },
	async (req, resp) => {
		const data = [
			{
				fullName: 'Đinh Bá Phong',
				birthPlace: 'Phường Thanh Bình, Tp. Hải Dương, tỉnh Hải Dương',
				address: 'Phường Thanh Bình, Tp. Hải Dương, tỉnh Hải Dương',
				dob: '2002-02-26',
				rank: 'Binh nhất',
				previousUnit: 'Quân đoàn 12',
				previousPosition: 'Công vụ',
				position: 'Học viên',
				ethnic: 'Kinh',
				religion: 'Không',
				enlistmentPeriod: '2023-06-02',
				talent: 'Đá bóng',
				isMarried: false
			}
		]

		const columnLabels: Record<string, string> = {
			fullName: 'Họ và tên',
			dob: 'Ngày sinh',
			birthPlace: 'Nơi sinh',
			address: 'Địa chỉ',
			rank: 'Cấp bậc',
			position: 'Chức vụ',
			previousUnit: 'Đơn vị cũ',
			previousPosition: 'Chức vụ cũ',
			ethnic: 'Dân tộc',
			religion: 'Tôn giáo',
			educationLevel: 'Trình độ học vấn',
			fatherName: 'Tên cha',
			motherName: 'Tên mẹ',
			isMarried: 'Tình trạng hôn nhân',
			classId: 'Lớp'
		}

		try {
			const body =
				await getTypedRequestBody<ExportStudentDataRequest>(req)
			log.info('ExportStudentData request body: ', { body })

			// Read the template file
			const templatePath = path.join(
				'./templates',
				'dynamic-columns-with-dynamic-rows.docx'
			)
			const template = await readFile(templatePath)

			// Prepare data for template
			const selectedColumns = Object.keys(body[0] || {})

			// Prepare columns data (headers)

			// Prepare rows data
			const rows = body.map((student) => {
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

			// Generate the report
			const buffer = await createReport({
				template,
				data: {
					/* reportTitle: 'BÁO CÁO DANH SÁCH HỌC VIÊN',
                        reportDate: new Date().toLocaleDateString('vi-VN'),
                        totalRecords: 2, */
					columns: selectedColumns,
					rows: body
				},
				cmdDelimiter: ['{', '}']
			})

			resp.setHeader(
				'Content-Type',
				'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
			)
			resp.writeHead(200, { Connection: 'close' })
			return resp.end(buffer)
		} catch (err) {
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

		const items: CreateBatchNotificationItemData = students.map((s) => ({
			notifiableId: s.id,
			notifiableType: 'students'
		}))
		const isCpvEvent = params.event.includes('cpv')
		const date = dayjs().unix()

		const firstStudent = students[0]
		const baseMessage = `Tuần này có sinh nhật của đồng chí ${firstStudent.fullName}`
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
			const baseMessage = `Tuần này có sự kiện chuyển Đảng chính thức đồng chí ${firstStudent.fullName}`
			batchNotification = {
				notificationType: 'officialCpv',
				title: 'Chuyển Đảng chính thức',
				message:
					students.length === 1
						? baseMessage
						: `${baseMessage} và ${students.length - 1} đồng chí khác`,
				batchKey: `cpvOfficial_${params.event}_${date}`,
				items
			}
		}
		await notificationController.createBatch(batchNotification)

		log.info('students.StudentCronjob complete!')
	}
)

export const GetStudentWithBirthdayInWeek = api(
	{ expose: true, method: 'GET', path: '/students/birthday/week' },
	async () => {
		log.trace('students.GetStudentWithBirthdayInWeek running...')
		const students = await studentController.find({
			birthdayInMonth: '07'
		})
		log.trace('students.GetStudentWithBirthdayInWeek processing data', {
			students
		})

		const items: CreateBatchNotificationItemData = students.map((s) => ({
			notifiableId: s.id,
			notifiableType: 'students'
		}))

		const date = dayjs().unix()
		const batchNotification: CreateBatchNotificationData = {
			notificationType: 'birthday',
			title: 'Sinh nhật đồng đội',
			message: 'Tuần này có sinh nhật của đồng chí',
			batchKey: `birthday_${date}`,
			items
		}
		await notificationController.createBatch(batchNotification)

		log.info('students.GetStudentWithBirthdayInWeek complete')
	}
)

const _ = new CronJob('birthday-in-week', {
	schedule: '0 0 * * 1',
	title: 'Birthday in week notification',
	endpoint: GetStudentWithBirthdayInWeek
})
