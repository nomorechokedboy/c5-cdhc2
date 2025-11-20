import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import type { Grade } from '@/types'

dayjs.locale('vi')

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export const formatDate = (timestamp: string | number) => {
	let date = dayjs(timestamp)
	if (typeof timestamp === 'number') {
		date = dayjs.unix(timestamp)
	}

	return date.format('D MMMM, YYYY')
}

export const calculateAverage = (grades: number[]) => {
	const total = grades.reduce((curr, accum) => curr + accum, 0)
	const gradesLen = grades.length

	return total / gradesLen
}

export const calculateConditionalGrade = ({
	avg1TGrades,
	avg15MGrades
}: {
	avg1TGrades: number
	avg15MGrades: number
}) => {
	return (avg15MGrades + avg1TGrades * 2) / 3
}

export const calculateFinalGrade = (studentGrades: Record<string, Grade>) => {
	const grades = Object.values(studentGrades)
	if (grades.length === 0) {
		return 0
	}

	const grade15M = grades.filter((v) => v.examType === '15P')
	const grade1T = grades.filter((v) => v.examType === '1T')
	const gradeFinalExam = grades.filter((v) => v.examType === 'Thi')

	const avg15MGrades = calculateAverage(grade15M.map((g) => g.grade)) || 0
	const avg1TGrades = calculateAverage(grade1T.map((g) => g.grade)) || 0
	const avgFinalExamGrades =
		calculateAverage(gradeFinalExam.map((g) => g.grade)) || 0

	const conditionalGrade = calculateConditionalGrade({
		avg1TGrades,
		avg15MGrades
	})

	return conditionalGrade * 0.4 + avgFinalExamGrades * 0.6
}

export const getGradeColor = (average: number) => {
	if (average >= 9) return 'bg-sky-100 text-sky-800 border-sky-200'
	if (average >= 8) return 'bg-teal-100 text-teal-800 border-teal-200'
	if (average >= 6) return 'bg-green-100 text-green-800 border-green-200'
	if (average >= 5) return 'bg-orange-100 text-orange-800 border-orange-200'
	return 'bg-red-100 text-red-800 border-red-200'
}
