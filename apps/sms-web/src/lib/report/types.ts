// Shapes of the sms-api `usrreports` JSON. Nothing here is computed in the browser.

export type Band =
	| 'xuat_sac'
	| 'gioi'
	| 'kha'
	| 'trung_binh_kha'
	| 'trung_binh'
	| 'yeu'

export type ConductLabel =
	| 'xuat_sac'
	| 'tot'
	| 'kha'
	| 'trung_binh'
	| 'yeu'
	| 'kem'

export interface ReportClass {
	id: number
	name: string
	idnumber: string
}

export interface ReportCourse {
	id: number
	shortname: string
	fullname: string
	credits: number
}

export interface Conduct {
	score: number
	label: ConductLabel
}

export interface StudentRow {
	id: number
	idnumber: string
	fullname: string
	/** courseId (as string) → ĐMH, or null when the course is not scored */
	scores: Record<string, number | null>
	gpa: number | null
	classification: Band | null
	rank: number | null
	conduct: Conduct | null
}

export interface CourseStats {
	bands: Partial<Record<Band, number>>
	mean: number | null
}

export interface TopEntry {
	rank: number
	fullname: string
	gpa: number
}

export interface Summary {
	headcount: number
	classGpa: number | null
	maxGpa: number | null
	byClassification: Partial<Record<Band, number>>
	perCourse?: Record<string, CourseStats>
	top: TopEntry[]
}

export type WarningCode =
	| 'course_no_grade_items'
	| 'exam_not_held'
	| 'test_count_mismatch'
	| 'course_no_credits'

export interface ReportWarning {
	code: WarningCode
	courseId?: number
}

export interface SemesterReport {
	class: ReportClass
	year: number
	semester: number
	totalCredits: number
	courses: ReportCourse[]
	students: StudentRow[]
	summary: Summary
	warnings: ReportWarning[]
}

export interface YearRow {
	id: number
	idnumber: string
	fullname: string
	gpa: number | null
	classification: Band | null
	rank: number | null
	conduct: Conduct | null
}

export interface YearReport {
	class: ReportClass
	year: number
	totalCredits: number
	periods: SemesterReport[]
	students: YearRow[]
	summary: Summary
	warnings: ReportWarning[]
}

export interface Period {
	year: number
	semester: number
	courses: number
}

export interface UnassignedCourse {
	id: number
	shortname: string
	missing: string[]
}

export interface PeriodsResponse {
	class: ReportClass
	periods: Period[]
	unassigned: UnassignedCourse[]
}

export interface MyPeriodsResponse {
	class: ReportClass
	periods: Period[]
}

export interface MySemester {
	class: ReportClass
	year: number
	semester: number
	totalCredits: number
	courses: ReportCourse[]
	ranked: number
	row: StudentRow
}

export interface MyYear {
	class: ReportClass
	year: number
	totalCredits: number
	ranked: number
	row: YearRow
	periods: MySemester[]
}

export interface ConductEntry {
	studentId: number
	year: number
	semester: number
	/** null deletes the stored score */
	score: number | null
}
