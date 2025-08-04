import type {
	AppNotification,
	AppNotificationQuery,
	AppNotificationResponse,
	Class,
	ClassBody,
	ClassResponse,
	DeleteStudentsBody,
	GetUnitQuery,
	GetUnreadNotificationCountResponse,
	MarkAsReadNotificationParams,
	Student,
	StudentBody,
	StudentQueryParams,
	StudentResponse,
	Unit,
	UnitLevel,
	UnitResponse,
	UpdateStudentsBody
} from '@/types'
import axios from '@/lib/axios'

export function CreateClass(body: ClassBody) {
	return axios
		.post<ClassResponse>('/classes', body)
		.then((resp) => resp.data.data)
}

export async function GetClasses(): Promise<Class[]> {
	return axios.get<ClassResponse>('/classes').then((resp) => resp.data.data)
}

export function CreateStudent(body: StudentBody) {
	return axios
		.post<StudentResponse>('/students', body)
		.then((resp) => resp.data.data)
}

export function GetStudents(params?: StudentQueryParams): Promise<Student[]> {
	return axios
		.get<StudentResponse>('/students', {
			params
		})
		.then((resp) => resp.data.data)
}

export function DeleteStudents(params: DeleteStudentsBody) {
	return axios.delete('/students', { params })
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
		.get<UnitResponse>('/units', {
			params: { level: level.name }
		})
		.then((resp) => resp.data.data)
}

export function GetUnits(params?: GetUnitQuery) {
	return axios.get('/units', { params }).then((resp) => resp.data)
}

export function GetUnreadNotificationsCount(): Promise<number> {
	return axios
		.get<GetUnreadNotificationCountResponse>('/notifications/unread')
		.then((resp) => resp.data.data.count)
}
