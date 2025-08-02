import { generateMockNotifications } from '@/data'
import type {
	Class,
	ClassBody,
	ClassResponse,
	DeleteStudentsBody,
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
}

export async function GetNotifications(params: {
	page: number
	pageSize: number
}) {
	return generateMockNotifications(params.page, params.pageSize)
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
