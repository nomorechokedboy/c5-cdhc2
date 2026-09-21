import { describe, expect, it } from 'vitest'
import { buildBoard } from './unit-board'

const unit = (
	id: number,
	level: 'battalion' | 'company' | 'class',
	parentId: number | null,
	extra: { studentCount?: number; status?: 'ongoing' | 'graduated' } = {}
) => ({ id, alias: `u${id}`, name: `Đơn vị ${id}`, level, parentId, ...extra })

const units = [
	unit(1, 'battalion', null),
	unit(2, 'company', 1),
	unit(3, 'company', 1),
	unit(4, 'class', 2, { studentCount: 30, status: 'ongoing' }),
	unit(5, 'class', 2, { studentCount: 10, status: 'graduated' }),
	unit(6, 'class', 3, { studentCount: 20 }),
	unit(7, 'battalion', null),
	unit(8, 'company', 7),
	unit(9, 'class', 8, { studentCount: 20, status: 'ongoing' })
]

describe('buildBoard', () => {
	const board = buildBoard(units)

	it('adds class students up through companies to battalions', () => {
		expect(board.rows.map((r) => r.students)).toEqual([60, 20])
		expect(board.rows[0].children.map((c) => c.students)).toEqual([40, 20])
		expect(board.totalStudents).toBe(80)
	})

	it('counts only classes that have not graduated, but keeps their students', () => {
		expect(board.rows[0].children[0].classes).toBe(1)
		expect(board.rows[0].children[0].students).toBe(40)
		expect(board.totalClasses).toBe(3)
	})

	it('scales share against the largest unit of the same level', () => {
		expect(board.rows[0].share).toBe(1)
		expect(board.rows[1].share).toBeCloseTo(1 / 3)
		expect(board.rows[0].children[0].share).toBe(1)
		expect(board.rows[0].children[1].share).toBe(0.5)
	})

	it('is empty and finite when there are no units or no students', () => {
		expect(buildBoard([])).toEqual({
			rows: [],
			totalStudents: 0,
			totalClasses: 0
		})
		const empty = buildBoard([unit(1, 'battalion', null)])
		expect(empty.rows[0].share).toBe(0)
	})
})
