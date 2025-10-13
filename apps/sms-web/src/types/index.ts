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

export class Student {
	constructor(
		readonly id: number,
		readonly name: string,
		readonly grades: Record<string, number>
	) {}

	public static From({ id, fullname, grades }: mdlapi.Student): Student {
		const studentGrades: Record<string, number> = {}
		for (const grade of grades) {
			studentGrades[grade.modulename] = grade.grade
		}
		return new Student(id, fullname, studentGrades)
	}
}

export class Course {
	constructor(
		readonly id: number,
		readonly title: string,
		readonly description: string,
		readonly startDate: string,
		readonly endDate: string,
		readonly gradeCategories: string[],
		readonly students: Student[]
	) {}

	public static DefaultCourse() {
		return new Course(0, '', '', 'N/A', 'N/A', [], [])
	}

	public static From(
		resp: mdlapi.GetCourseGradesResponse | undefined
	): Course {
		if (resp === undefined) {
			return this.DefaultCourse()
		}

		const {
			course: { id, fullname },
			modules,
			students
		} = resp
		const courseStudents = students.map(Student.From)
		const gradeCategories = modules.map((m) => m.name)
		return new Course(
			id,
			fullname,
			'',
			'N/A',
			'N/A',
			gradeCategories,
			courseStudents
		)
	}
}
