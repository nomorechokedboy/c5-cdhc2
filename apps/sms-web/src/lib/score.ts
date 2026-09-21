import type { Course, StudentGrades } from '@/types'

/** Điểm dưới mức này là chưa đạt và được khoanh đỏ */
export const PASS_MARK = 5

export const isFailing = (score: number) => score < PASS_MARK

export const formatScore = (score: number) => score.toFixed(2)

/**
 * Điểm tổng kết các môn, có trọng số theo tín chỉ. Chỉ các môn đã có điểm
 * được cộng; mẫu số là tổng tín chỉ của mọi môn. Không có tín chỉ thì là 0.
 */
export function overallScore(courses: Course[], grades: StudentGrades) {
	const totalCredits = courses.reduce((sum, c) => sum + (c.credits ?? 0), 0)
	if (totalCredits === 0) return 0

	const weighted = courses
		.filter((c) => grades[c.id])
		.reduce((sum, c) => sum + grades[c.id].finalScore * (c.credits ?? 1), 0)
	return weighted / totalCredits
}
