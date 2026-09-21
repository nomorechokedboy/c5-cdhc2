import { describe, expect, it } from 'vitest'
import type { Course, StudentGrades } from '@/types'
import { formatScore, isFailing, overallScore } from './score'

const course = (id: number, credits?: number) => ({ id, credits }) as Course
const grades = (o: Record<number, number>): StudentGrades =>
	Object.fromEntries(
		Object.entries(o).map(([id, finalScore]) => [
			id,
			{ grades: {}, finalScore }
		])
	)

describe('isFailing', () => {
	it('fails below 5 and passes from 5', () => {
		expect(isFailing(4.99)).toBe(true)
		expect(isFailing(5)).toBe(false)
		expect(isFailing(0)).toBe(true)
	})
})

describe('formatScore', () => {
	it('always shows two decimals', () => {
		expect(formatScore(7)).toBe('7.00')
		expect(formatScore(6.234)).toBe('6.23')
	})
})

describe('overallScore', () => {
	it('weights each course by its credits', () => {
		const cs = [course(1, 3), course(2, 1)]
		expect(overallScore(cs, grades({ 1: 8, 2: 4 }))).toBe(7)
	})

	it('is 0 when there are no credits instead of NaN', () => {
		expect(overallScore([course(1)], grades({ 1: 8 }))).toBe(0)
		expect(overallScore([], {})).toBe(0)
	})

	it('skips courses without grades in the sum but not in the divisor', () => {
		const cs = [course(1, 2), course(2, 2)]
		expect(overallScore(cs, grades({ 1: 8 }))).toBe(4)
	})
})
