import type {
	AppNotification,
	AppNotificationQuery,
	Class,
	ClassBody,
	DeleteStudentsBody,
	ExportData,
	ExportPoliticsQualityReport,
	GetUnitQuery,
	GetUnitResponse,
	InitAdminRequest,
	MarkAsReadNotificationParams,
	Student,
	StudentBody,
	Unit,
	UnitLevel,
	UpdateStudentsBody,
	UpdateUserBody,
	UserBody
} from '@/types'
import axios, { appFetcher } from '@/lib/axios'
import Client, { auth, classes, students, units } from './client'
import { ApiUrl } from '@/lib/const'

export const requestClient = new Client(ApiUrl, {
	fetcher: appFetcher
})

export function CreateClass(body: ClassBody) {
	return requestClient.classes.CreateClass(body).then((resp) => resp.data)
}

export function DeleteClasses(ids: number[]) {
	return requestClient.classes.DeleteClasss({ ids }).then((resp) => resp.data)
}

export function UpdateClasses(data: Class[]) {
	return requestClient.classes.UpdateClasss({ data }).then((resp) => resp)
}

export async function GetClasses(
	params: classes.GetClassesRequest = {}
): Promise<Class[]> {
	return requestClient.classes
		.GetClasses(params)
		.then((resp) => resp.data.map((d) => ({ ...d }) as unknown as Class))
}

export function GetClassById(id: number): Promise<Class | undefined> {
	return requestClient.classes
		.GetClassById(id)
		.then((resp) =>
			resp === undefined ? resp : ({ ...resp.data } as Class)
		)
}

export function CreateStudent(body: StudentBody) {
	return requestClient.students
		.CreateStudent(body ?? {})
		.then((resp) => resp.data)
}

// export function CreateStudent, body: StudentBody[])
export function CreateStudents(body: StudentBody[]) {
	return requestClient.students
		.CreateStudents({ data: body ?? [] })
		.then((resp) => resp.data)
}

export function GetStudents(
	params?: students.GetStudentsQuery
): Promise<Student[]> {
	return requestClient.students
		.GetStudents(params ?? {})
		.then((resp) => resp.data.map((s) => ({ ...s }) as unknown as Student))
}

export function DeleteStudents(params: DeleteStudentsBody) {
	return requestClient.students.DeleteStudents(params).then((resp) => resp)
}

export function UpdateStudents(params: UpdateStudentsBody) {
	return requestClient.students.UpdateStudents(params).then((resp) => resp)
}

export function UpdateStudentStatus(studentIds: number[]) {
	return requestClient.students
		.updateStudentStatus({ studentIds, status: 'confirmed' })
		.then((resp) => resp)
}

export function GetNotifications(
	params?: AppNotificationQuery
): Promise<AppNotification[]> {
	return requestClient.notifications
		.GetNotifications({ page: params?.page, pageSize: params?.pageSize })
		.then((resp) => resp.data)
}

export function MarkAsRead(params: MarkAsReadNotificationParams) {
	return requestClient.notifications.MarkAsRead(params)
}

export function GetStudentByLevel(level: UnitLevel): Promise<Unit[]> {
	return axios
		.get<GetUnitResponse>('/units', {
			params: { level }
		})
		.then((resp) => resp.data.data)
}

export function GetUnits(params?: GetUnitQuery) {
	return requestClient.units.GetUnits(params ?? {}).then((resp) => resp.data)
}

export function GetUnit({
	alias,
	...params
}: units.GetUnitRequest & { alias: string }) {
	return requestClient.units.GetUnit(alias, params).then((resp) => resp.data)
}

export function GetUnreadNotificationsCount(): Promise<number> {
	return requestClient.notifications
		.GetUnreadCount()
		.then((resp) => resp.data.count)
}

export function ExportTableData(data: ExportData) {
	return axios.post('/students/export', data, { responseType: 'blob' })
}

export function ExportPoliticsQualityData(data: ExportPoliticsQualityReport) {
	return axios.post('/students/politics-quality-report/export', data, {
		responseType: 'blob'
	})
}

export function GetPoliticsQualityReport(unitIds: number[]) {
	return requestClient.students.GetPoliticsQualityReport({ unitIds })
}

export function CreateUser(body: UserBody) {
	return requestClient.users.CreateUser(body).then((resp) => resp.data)
}

export function UpdateUser(body: UpdateUserBody) {
	return requestClient.users.UpdateUser(body).then((resp) => resp.data)
}

export function Login(req: auth.LoginRequest) {
	return requestClient.auth.Login(req)
}

export function RefreshToken(token: string) {
	return requestClient.auth.RefreshToken({ token })
}

export function DeleteUsers(ids: number[]) {
	return requestClient.users.DeleteUsers({ ids })
}

export function GetUserInfo() {
	return requestClient.auth.GetUserInfo().then((resp) => resp.data)
}

export function GetUsers() {
	return requestClient.users.GetUsers().then((resp) => resp.data)
}

export function UploadFiles(body: BodyInit) {
	return requestClient.media
		.UploadFiles('POST', body)
		.then((resp) => resp.json() as Promise<{ data: { uris: string[] } }>)
		.then((resp) => resp.data)
}

export function IsInitAdmin() {
	return requestClient.users.IsInitAdmin().then((resp) => resp.data)
}

export function InitAdmin(req: InitAdminRequest) {
	return requestClient.users.InitAdmin(req)
}
