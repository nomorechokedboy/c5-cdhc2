import { api } from 'encore.dev/api'
import { CronJob } from 'encore.dev/cron'
import log from 'encore.dev/log'
import { StudentDB, StudentParam, StudentQuery } from '../schema/student.js'
import studentController from './controller.js'
import notificationController from '../notifications/controller.js'
import {
	CreateBatchNotificationData,
	CreateBatchNotificationItemData
} from '../schema/notifications.js'
import dayjs from 'dayjs'

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

interface GetStudentsQuery {
	birthdayInMonth?: Month
	birthdayInQuarter?: Quarter
	birthdayInWeek?: boolean
	classId?: number
	hasReligion?: boolean
	ids?: Array<number>
	isEthnicMinority?: boolean
	isMarried?: boolean
	politicalOrg?: 'hcyu' | 'cpv'
}

export const GetStudents = api(
	{ expose: true, method: 'GET', path: '/students' },
	async (query: GetStudentsQuery): Promise<GetStudentsResponse> => {
		const q: StudentQuery = { ...query }
		log.trace('students.GetStudents query params', { params: q })
		const students = await studentController.find(q)
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

		const date = dayjs().format('DD/MM/YYYY')
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
	// schedule: '0 0 * * 1',
	schedule: '* * * * *',
	title: 'Birthday in week notification',
	endpoint: GetStudentWithBirthdayInWeek
})
