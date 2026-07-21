/**
 * Cấu trúc đơn vị quản lý học viên của trường (cố định):
 * - Tiểu đoàn 1: Đại đội 1, 2, 3
 * - Tiểu đoàn 2: Đại đội 4, 5
 *
 * Các đơn vị khác (TD3, D6–D9, khoa/ban) dùng cho vật tư — không hiện trong
 * menu HV / thống kê chính trị.
 */

export const STUDENT_UNIT_TREE: Record<string, string[]> = {
	d1: ['D1', 'D2', 'D3'],
	d2: ['D4', 'D5']
}

export const STUDENT_BATTALION_ALIASES = Object.keys(STUDENT_UNIT_TREE)

export function isStudentBattalionAlias(
	alias: string | undefined | null
): boolean {
	if (!alias) return false
	return alias in STUDENT_UNIT_TREE
}

export function isStudentCompanyAlias(
	battalionAlias: string,
	companyAlias: string | undefined | null
): boolean {
	if (!companyAlias) return false
	const allowed = STUDENT_UNIT_TREE[battalionAlias]
	if (!allowed) return false
	return allowed
		.map((a) => a.toUpperCase())
		.includes(companyAlias.toUpperCase())
}

type UnitLike = {
	alias: string
	name?: string
	children?: UnitLike[]
	classes?: unknown[]
	[key: string]: unknown
}

/** Lọc tree đơn vị: chỉ TD1/TD2 và đại đội đúng danh sách */
export function filterStudentUnitTree<T extends UnitLike>(
	units: T[] | undefined | null
): T[] {
	if (!units?.length) return []
	return units
		.filter((u) => isStudentBattalionAlias(u.alias))
		.map((u) => {
			const order = (STUDENT_UNIT_TREE[u.alias] || []).map((a) =>
				a.toUpperCase()
			)
			const children = (u.children || [])
				.filter((c) => order.includes((c.alias || '').toUpperCase()))
				.sort(
					(a, b) =>
						order.indexOf((a.alias || '').toUpperCase()) -
						order.indexOf((b.alias || '').toUpperCase())
				)
			return { ...u, children } as T
		})
		.sort((a, b) => {
			const oa = STUDENT_BATTALION_ALIASES.indexOf(a.alias)
			const ob = STUDENT_BATTALION_ALIASES.indexOf(b.alias)
			return oa - ob
		})
}

/** Đếm đại đội (company) trong tree HV đã lọc */
export function countStudentCompanies<T extends UnitLike>(
	units: T[] | undefined | null
): number {
	return filterStudentUnitTree(units).reduce(
		(n, u) => n + (u.children?.length || 0),
		0
	)
}
