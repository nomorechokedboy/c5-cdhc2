import type { entities, mdlapi } from '@/api/client'
import type { StudentGrades, StudentGradesSummary } from './student'
import { calculateFinalGrade } from '@/lib/utils'
export * from './student'

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
			itemmodule as ModuleType,
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

export class Teacher {
	constructor(
		readonly id: number,
		readonly fullName: string,
		readonly avatar: string
	) {}

	public static From(mdlTeacher: mdlapi.Teacher) {
		return new Teacher(
			mdlTeacher.id,
			mdlTeacher.fullname,
			mdlTeacher.picture
		)
	}
}

export class Course {
	constructor(
		readonly id: number,
		readonly title: string,
		readonly description: string,
		readonly startDate: number,
		readonly endDate: number,
		readonly gradeCategories: {
			label: string
			value: number
			itemNumber: number
			type: ModuleType
		}[],
		readonly students: Student[],
		readonly teachers?: Teacher[],
		readonly semester?: number,
		readonly credits?: number
	) {}

	public static DefaultCourse() {
		return new Course(0, 'Khóa học...', 'Chưa có mô tả ', 0, 0, [], [], [])
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
		const gradeCategories = modules.map((m) => {
			return {
				label: m.name,
				value: m.cmid,
				itemNumber: m.itemnumber,
				type: m.type as ModuleType
			}
		})
		return new Course(
			id,
			fullname,
			summary === '' ? 'Chưa có mô tả' : summary,
			startdate,
			enddate,
			gradeCategories,
			courseStudents,
			[]
		)
	}

	public static ToCourses(
		studentGrades: mdlapi.GetUserGradesResponse
	): Course[] {
		return studentGrades.courses.map((c) => {
			const metadata = c.metadata.reduce(
				(obj, curr) => {
					obj[curr.name] = curr.value
					return obj
				},
				{} as Record<string, number>
			)

			const teachers = c.teachers.map(Teacher.From)

			const gradeCategories = c.grades.map((g) => ({
				label: g.modulename,
				value: g.moduleid,
				itemNumber: g.itemnumber,
				type: g.itemmodule as ModuleType
			}))

			return new Course(
				c.courseid,
				c.coursename,
				'',
				0,
				0,
				gradeCategories,
				[],
				teachers,
				metadata['semester'],
				metadata['credit']
			)
		})
	}
}

export function GetStudentGrades(
	courses: mdlapi.GetUserGradesResponse['courses']
): StudentGrades {
	const userGrades: StudentGrades = {}
	courses.forEach(
		(c) => (userGrades[c.courseid] = ToStudentGradesSummary(c.grades))
	)

	return userGrades
}

export function ToStudentGradesSummary(
	grades: mdlapi.Grade[]
): StudentGradesSummary {
	const studentGrades: Record<string, number> = {}
	const studentGradesMap: Record<string, Grade> = {}
	grades.forEach((g) => {
		studentGrades[g.modulename] = g.grade
		studentGradesMap[g.modulename] = Grade.From(g)
	})
	const finalScore = calculateFinalGrade(studentGradesMap)

	return { grades: studentGrades, finalScore }
}
