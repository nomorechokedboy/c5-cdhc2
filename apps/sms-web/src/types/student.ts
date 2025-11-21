export type StudentGrades = Record<string, StudentGradesSummary>

export interface StudentGradesSummary {
	grades: Record<string, number>
	finalScore: number
}
