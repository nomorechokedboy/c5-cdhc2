import type { Unit } from '@/types'

/** Một dòng của bảng giao ban: tiểu đoàn hoặc đại đội. */
export interface BoardRow {
	id: number
	alias: string
	name: string
	level: 'battalion' | 'company'
	/** Số lớp đang học (chưa tốt nghiệp) thuộc đơn vị */
	classes: number
	/** Học viên của mọi lớp thuộc đơn vị, đã cộng dồn */
	students: number
	/** Tỉ trọng so với đơn vị lớn nhất cùng cấp, 0..1 */
	share: number
	children: BoardRow[]
}

export interface Board {
	rows: BoardRow[]
	totalStudents: number
	totalClasses: number
}

type FlatUnit = Pick<
	Unit,
	'id' | 'alias' | 'name' | 'level' | 'parentId' | 'status' | 'studentCount'
>

/**
 * Dựng bảng giao ban từ danh sách đơn vị phẳng (kèm `studentCount`). Học viên
 * chỉ gắn vào lớp, nên số của đại đội/tiểu đoàn là tổng các lớp bên dưới. Lớp đã
 * tốt nghiệp không tính vào số lớp đang học nhưng vẫn giữ học viên của nó.
 */
export function buildBoard(units: FlatUnit[]): Board {
	const byParent = new Map<number, FlatUnit[]>()
	for (const unit of units) {
		if (unit.parentId == null) continue
		byParent.set(unit.parentId, [
			...(byParent.get(unit.parentId) ?? []),
			unit
		])
	}

	const tally = (unit: FlatUnit) => {
		let classes = 0
		let students = 0
		for (const child of byParent.get(unit.id) ?? []) {
			if (child.level === 'class') {
				students += child.studentCount ?? 0
				if (child.status !== 'graduated') classes += 1
			}
		}
		return { classes, students }
	}

	const withShare = (rows: Omit<BoardRow, 'share'>[]): BoardRow[] => {
		const max = Math.max(0, ...rows.map((r) => r.students))
		return rows.map((r) => ({ ...r, share: max ? r.students / max : 0 }))
	}

	const companies = (battalion: FlatUnit) =>
		withShare(
			(byParent.get(battalion.id) ?? [])
				.filter((u) => u.level === 'company')
				.map((company) => ({
					id: company.id,
					alias: company.alias,
					name: company.name,
					level: 'company' as const,
					...tally(company),
					children: []
				}))
		)

	const rows = withShare(
		units
			.filter((u) => u.level === 'battalion')
			.map((battalion) => {
				const kids = companies(battalion)
				return {
					id: battalion.id,
					alias: battalion.alias,
					name: battalion.name,
					level: 'battalion' as const,
					classes: kids.reduce((sum, c) => sum + c.classes, 0),
					students: kids.reduce((sum, c) => sum + c.students, 0),
					children: kids
				}
			})
	)

	return {
		rows,
		totalStudents: rows.reduce((sum, r) => sum + r.students, 0),
		totalClasses: rows.reduce((sum, r) => sum + r.classes, 0)
	}
}
