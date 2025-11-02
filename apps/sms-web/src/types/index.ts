import type { entities, mdlapi } from '@/api/client'

export type AppToken = {
	accessToken: string
	refreshToken: string
}

export type TokenEvent = {
	token: AppToken
}

export class CourseCategory {
	constructor(
		public id: number,
		public name: string,
		public description: string,
		public idnumber: string,
		public visible: boolean,
		public updatedAt: number
	) {}

	static fromEntity({
		id,
		name,
		description,
		idnumber,
		visible,
		timemodified
	}: entities.Category) {
		return new CourseCategory(
			id,
			name ?? '',
			description ?? '',
			idnumber ?? '',
			visible ?? false,
			timemodified ?? Date.now()
		)
	}
}

export const moduleTypes = ['quiz', 'assign'] as const

export type ModuleType = (typeof moduleTypes)[number]

export const examTypes = ['15P', '1T', 'Thi'] as const

export type ExamType = (typeof examTypes)[number]

export class Grade {
	constructor(
		readonly itemInstace: number,
		readonly moduleId: number,
		readonly moduleName: string,
		readonly type: ModuleType,
		readonly examType: ExamType,
		readonly grade: number,
		readonly itemModule: string,
		readonly itemNumber: number
	) {}

	public static From({
		type,
		grade,
		moduleid,
		modulename,
		examtype,
		itemmodule,
		itemnumber,
		iteminstance
	}: mdlapi.Grade): Grade {
		return new Grade(
			iteminstance,
			moduleid,
			modulename,
			type as ModuleType,
			examtype as unknown as ExamType,
			grade,
			itemmodule,
			itemnumber
		)
	}
}

export class Student {
	constructor(
		readonly id: number,
		readonly name: string,
		readonly grades: Record<string, Grade>
	) {}

	public static From({ id, fullname, grades }: mdlapi.Student): Student {
		const studentGrades: Record<string, Grade> = {}
		for (const grade of grades) {
			studentGrades[grade.modulename] = Grade.From(grade)
		}
		return new Student(id, fullname, studentGrades)
	}
}

export class Course {
	constructor(
		readonly id: number,
		readonly title: string,
		readonly description: string,
		readonly startDate: number,
		readonly endDate: number,
		readonly gradeCategories: string[],
		readonly students: Student[]
	) {}

	public static DefaultCourse() {
		return new Course(0, 'Khóa học...', 'Chưa có mô tả ', 0, 0, [], [])
	}

	public static From(
		resp: mdlapi.GetCourseGradesResponse | undefined
	): Course {
		if (resp === undefined) {
			return this.DefaultCourse()
		}

		const {
			course: { id, fullname, summary, enddate, startdate },
			modules,
			students
		} = resp
		const courseStudents = students.map(Student.From)
		const gradeCategories = modules.map((m) => m.name)
		return new Course(
			id,
			fullname,
			summary === '' ? 'Chưa có mô tả' : summary,
			startdate,
			enddate,
			gradeCategories,
			courseStudents
		)
	}
}
