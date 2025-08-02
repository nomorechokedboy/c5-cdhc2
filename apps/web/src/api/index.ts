import type {
	Class,
	ClassBody,
	ClassResponse,
	DeleteStudentsBody,
	GetUnitQuery,
	NotificationResponse,
	Student,
	StudentBody,
	StudentQueryParams,
	StudentResponse,
	Unit,
	UnitLevel,
	UnitResponse,
	UpdateStudentsBody
} from '@/types'
import { mockNotificationsAPI } from './mockApi'
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

export async function fetchNotifications({
	pageParam = null
}: {
	pageParam?: string | null
}): Promise<NotificationResponse> {
	// In a real Vite app, you might use a different base URL or environment variable
	// For development, you could use the mock API directly
	if (import.meta.env.DEV) {
		// Use mock API in development
		return mockNotificationsAPI(pageParam)
	}

	// In production, you would call your actual API endpoint
	const url = new URL('/api/notifications', window.location.origin)
	if (pageParam) {
		url.searchParams.set('cursor', pageParam)
	}

	const response = await fetch(url.toString())
	if (!response.ok) {
		throw new Error('Failed to fetch notifications')
	}

	return response.json()
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
