import type {
	Class,
	ClassBody,
	ClassResponse,
	DeleteStudentsBody,
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
import axios from 'axios'
import { mockNotificationsAPI } from './mockApi'
export function CreateClass(body: ClassBody) {
	return axios
		.post<ClassResponse>('http://localhost:4000/classes', body)
		.then((resp) => resp.data.data)
}

export async function GetClasses(): Promise<Class[]> {
	return axios
		.get<ClassResponse>('http://localhost:4000/classes')
		.then((resp) => resp.data.data)
}

export function CreateStudent(body: StudentBody) {
	return axios
		.post<StudentResponse>('http://localhost:4000/students', body)
		.then((resp) => resp.data.data)
}

export function DeleteStudents(params: DeleteStudentsBody) {
	return axios.delete('http://localhost:4000/students', { params })
}

export function UpdateStudents(params: UpdateStudentsBody) {
	return axios
		.patch('http://localhost:4000/students', params)
		.then((resp) => resp.data)
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
}

export function GetStudents(params?: StudentQueryParams): Promise<Student[]> {
	return axios
		.get<StudentResponse>('http://localhost:4000/students', {
			params
		})
		.then((resp) => resp.data.data)
}

export function GetStudentByLevel(level: UnitLevel): Promise<Unit[]> {
	return axios
		.get<UnitResponse>('http://localhost:4000/units', {
			params: { level: level.name }
		})
		.then((resp) => resp.data.data)
}
