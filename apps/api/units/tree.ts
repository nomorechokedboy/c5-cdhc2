import { Unit, UnitLevelName } from '../schema/units'

/**
 * Gom id của `root` và toàn bộ đơn vị con cháu (tối đa 3 cấp:
 * tiểu đoàn → đại đội → lớp). Lọc theo `level` nếu truyền vào.
 */
export function collectUnitIds(
	root: Pick<Unit, 'id' | 'level'> & { children?: Unit[] },
	level?: UnitLevelName
): number[] {
	const ids: number[] = []
	const walk = (u: Pick<Unit, 'id' | 'level'> & { children?: Unit[] }) => {
		if (level === undefined || u.level === level) {
			ids.push(u.id)
		}
		u.children?.forEach(walk)
	}
	walk(root)
	return ids
}
