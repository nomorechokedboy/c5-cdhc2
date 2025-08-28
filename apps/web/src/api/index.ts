import type {
	AppNotification,
	AppNotificationQuery,
	AppNotificationResponse,
	Class,
	ClassBody,
	ClassResponse,
	DeleteStudentsBody,
	ExportData,
	ExportPoliticsQualityReport,
	GetUnitQuery,
	GetUnitResponse,
	GetUnreadNotificationCountResponse,
	MarkAsReadNotificationParams,
	Student,
	StudentBody,
	StudentResponse,
	Unit,
	UnitLevel,
	UpdateStudentsBody
} from '@/types'
import axios, { appFetcher } from '@/lib/axios'
import Client, { auth, students, units } from './client'
import { ApiUrl } from '@/lib/const'

export const requestClient = new Client(ApiUrl, {
	fetcher: appFetcher
})

export function CreateClass(body: ClassBody) {
	return axios
		.post<ClassResponse>('/classes', body)
		.then((resp) => resp.data.data)
}

export function DeleteClasses(ids: number[]) {
	return axios.delete('/classes', {
		params: { ids },
		paramsSerializer: { indexes: null }
	})
}

export function UpdateClasses(data: Class[]) {
	return axios
		.patch<ClassResponse>('/classes', { data })
		.then((resp) => resp.data.data)
}

export async function GetClasses(): Promise<Class[]> {
	return axios.get<ClassResponse>('/classes').then((resp) => resp.data.data)
}

export function GetClassById(id: number): Promise<Class | undefined> {
	return requestClient.classes
		.GetClassById(id)
		.then((resp) =>
			resp === undefined ? resp : ({ ...resp.data } as Class)
		)
}

export function CreateStudent(body: StudentBody) {
	return axios
		.post<StudentResponse>('/students', body)
		.then((resp) => resp.data.data)
}

// export function CreateStudent, body: StudentBody[])
export function CreateStudents(body: StudentBody[]) {
	return axios
		.post<StudentResponse>('/students/bulk', { data: body })
		.then((resp) => resp.data.data)
}


export function GetStudents(
	params?: students.GetStudentsQuery
): Promise<Student[]> {
	return requestClient.students
		.GetStudents(params ?? {})
		.then((resp) => resp.data.map((s) => ({ ...s }) as unknown as Student))
}

export function DeleteStudents(params: DeleteStudentsBody) {
	return axios.delete('/students', {
		params,
		paramsSerializer: { indexes: null }
	})
}

export function UpdateStudents(params: UpdateStudentsBody) {
	return axios.patch('/students', params).then((resp) => resp.data)
}

export function GetNotifications(
	params?: AppNotificationQuery
): Promise<AppNotification[]> {
	return axios
		.get<AppNotificationResponse>('/notifications', { params })
		.then((resp) => resp.data.data)
}

export function MarkAsRead(params: MarkAsReadNotificationParams) {
	return axios.patch('/notifications/mark-as-read', params)
}

export function GetStudentByLevel(level: UnitLevel): Promise<Unit[]> {
	return axios
		.get<GetUnitResponse>('/units', {
			params: { level }
		})
		.then((resp) => resp.data.data)
}

export function GetUnits(params?: GetUnitQuery) {
	return axios
		.get<GetUnitResponse>('/units', { params })
		.then((resp) => resp.data.data)
}

export function GetUnit({
	alias,
	...params
}: units.GetUnitRequest & { alias: string }) {
	return requestClient.units.GetUnit(alias, params).then((resp) => resp.data)
}

export function GetUnreadNotificationsCount(): Promise<number> {
	return axios
		.get<GetUnreadNotificationCountResponse>('/notifications/unread')
		.then((resp) => resp.data.data.count)
}

export function ExportTableData(data: ExportData) {
	return axios.post('/students/export', data, { responseType: 'blob' })
}

export function ExportPoliticsQualityData(data: ExportPoliticsQualityReport) {
	return axios.post('/students/politics-quality-report/export', data, {
		responseType: 'blob'
	})
}

export function GetPoliticsQualityReport() {
	return requestClient.students.GetPoliticsQualityReport({ unitId: 7 })
}

export function Login(req: auth.LoginRequest) {
	return requestClient.auth.Login(req)
}

export function GetUserInfo() {
	return requestClient.auth.GetUserInfo().then((resp) => resp.data)
}
