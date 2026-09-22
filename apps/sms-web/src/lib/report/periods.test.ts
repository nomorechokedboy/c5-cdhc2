import { describe, expect, it } from 'vitest'
import { latestPeriod, resolvePeriod, semestersOf, yearsOf } from './periods'

const ps = [
	{ year: 1, semester: 1 },
	{ year: 1, semester: 2 },
	{ year: 2, semester: 1 },
	{ year: 2, semester: 2 },
	{ year: 2, semester: 3 }
]

describe('periods', () => {
	it('lists years and the semesters of a year, ascending', () => {
		expect(yearsOf([...ps].reverse())).toEqual([1, 2])
		expect(semestersOf(ps, 2)).toEqual([1, 2, 3])
		expect(semestersOf(ps, 9)).toEqual([])
	})

	it('finds the latest period, or none', () => {
		expect(latestPeriod(ps)).toEqual({ year: 2, semester: 3 })
		expect(latestPeriod([])).toBeNull()
	})

	it('keeps a valid choice', () => {
		expect(resolvePeriod(ps, { year: 1, semester: 2 })).toEqual({
			year: 1,
			semester: 2
		})
	})

	it('falls back to the latest semester of the year, then to the latest period', () => {
		expect(resolvePeriod(ps, { year: 1, semester: 9 })).toEqual({
			year: 1,
			semester: 2
		})
		expect(resolvePeriod(ps, { year: 1 })).toEqual({ year: 1, semester: 2 })
		expect(resolvePeriod(ps, { year: 7 })).toEqual({ year: 2, semester: 3 })
		expect(resolvePeriod(ps, {})).toEqual({ year: 2, semester: 3 })
		expect(resolvePeriod([], {})).toBeNull()
	})
})
