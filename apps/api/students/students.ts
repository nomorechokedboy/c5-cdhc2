import { api, APIError } from 'encore.dev/api'
import { CronJob } from 'encore.dev/cron'
import { StudentDB, StudentParam } from '../schema/student.js'
import log, { error } from 'encore.dev/log'
import studentController from './controller.js'
import notificationController from '../notifications/controller.js'
import {
	CreateBatchNotificationData,
	CreateBatchNotificationItemData
} from '../schema/notifications.js'
import dayjs from 'dayjs'
import fs, { writeFile } from 'fs/promises'
import { createReport } from 'docx-templates'
import path from 'path'
import {
	Document,
	Packer,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	WidthType
} from 'docx'

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

export const TestWordTemplate = api(
	{ expose: true, method: 'POST', path: '/students/export' },
	async () => {
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

		const selectedColumns = Object.keys(data[0] || {})

		try {
			const headerCells = selectedColumns.map(
				(col) =>
					new TableCell({
						children: [
							new Paragraph({
								children: [
									new TextRun({
										text: columnLabels[col] || col,
										bold: true
									})
								]
							})
						],
						width: {
							size: 100,
							type: WidthType.PERCENTAGE
						}
					})
			)

			// Create data rows
			const dataRows = data.map(
				(row) =>
					new TableRow({
						children: selectedColumns.map((col) => {
							let cellValue = row[col]

							// Format different data types
							if (cellValue === null || cellValue === undefined) {
								cellValue = ''
							} else if (typeof cellValue === 'boolean') {
								cellValue = cellValue ? 'Có' : 'Không'
							} else if (Array.isArray(cellValue)) {
								cellValue =
									cellValue.length > 0
										? cellValue.join(', ')
										: ''
							} else {
								cellValue = String(cellValue)
							}

							return new TableCell({
								children: [
									new Paragraph({
										children: [
											new TextRun({ text: cellValue })
										]
									})
								]
							})
						})
					})
			)

			// Create the table
			const table = new Table({
				rows: [
					new TableRow({
						children: headerCells,
						tableHeader: true
					}),
					...dataRows
				],
				width: {
					size: 100,
					type: WidthType.PERCENTAGE
				}
			})

			// Create document
			const doc = new Document({
				sections: [
					{
						children: [
							/* new Paragraph({
                                children: [
                                    new TextRun({
                                        text: 'Báo cáo danh sách học viên',
                                        bold: true,
                                        size: 32 // 16pt
                                    })
                                ]
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}`,
                                        size: 24 // 12pt
                                    })
                                ]
                            }),
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: `Tổng số bản ghi: ${data.length}`,
                                        size: 24 // 12pt
                                    })
                                ]
                            }), */
							new Paragraph({ text: '' }), // Empty line
							table
						]
					}
				]
			})

			// Generate buffer
			const buffer = await Packer.toBuffer(doc)

			const filename = `report-${Date.now()}.docx`
			const filePath = path.join('./temp', filename)
			await writeFile(filePath, buffer)

			return {
				headers: {
					'Content-Type':
						'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
					'Content-Disposition': `attachment; filename="report-${Date.now()}.docx"`,
					'Content-Length': buffer.length.toString()
				}
			}
		} catch (err) {
			console.error('Help me', err)

			log.error('Help me', { err })
			throw APIError.internal('Internal error for exporting file')
		}
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
	schedule: '0 0 * * 1',
	title: 'Birthday in week notification',
	endpoint: GetStudentWithBirthdayInWeek
})
