import { describe, expect, it } from 'vitest'
import { buildLogQuery, pageWindow } from './query'
import { EMPTY_FILTERS } from './types'

describe('buildLogQuery', () => {
	it('carries only paging when no filter is set', () => {
		expect(buildLogQuery(2, 50, EMPTY_FILTERS).toString()).toBe(
			'page=2&limit=50'
		)
	})

	it('adds the filters that are filled in and sends dates as ISO', () => {
		const q = buildLogQuery(1, 20, {
			...EMPTY_FILTERS,
			outcome: 'failure',
			search: 'grade',
			from: '2026-01-02T03:04'
		})
		expect(q.get('outcome')).toBe('failure')
		expect(q.get('search')).toBe('grade')
		expect(q.get('from')).toBe(new Date('2026-01-02T03:04').toISOString())
		expect(q.has('to')).toBe(false)
		expect(q.has('actor_id')).toBe(false)
	})
})

describe('pageWindow', () => {
	it('centres on the current page', () => {
		expect(pageWindow(5, 10)).toEqual([3, 4, 5, 6, 7])
	})

	it('stays inside the first and last pages', () => {
		expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5])
		expect(pageWindow(10, 10)).toEqual([6, 7, 8, 9, 10])
	})

	it('shows every page when there are fewer than five', () => {
		expect(pageWindow(1, 3)).toEqual([1, 2, 3])
		expect(pageWindow(2, 2)).toEqual([1, 2])
	})
})
