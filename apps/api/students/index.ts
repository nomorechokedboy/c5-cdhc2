import {
	PoliticsQualityRow,
	Student,
	StudentDB,
	StudentParam,
	StudentQuery,
	UpdateStudentMap
} from '../schema/student.js'

export interface Repository {
	create(params: StudentParam[]): Promise<StudentDB[]>
	delete(students: StudentDB[]): Promise<StudentDB[]>
	find(q: StudentQuery): Promise<Student[]>
	findOne(c: StudentDB): Promise<Student>
	update(params: UpdateStudentMap): Promise<StudentDB[]>
	updateStatus(
		ids: number[],
		status: 'pending' | 'confirmed'
	): Promise<StudentDB[]>
	politicsQualityReport(classIds: number[]): Promise<PoliticsQualityRow[]>
}
