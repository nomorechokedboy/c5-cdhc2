import { useMemo } from 'react'
import useUnitsData from '@/hooks/useUnitsData'
import type { SearchableOption } from '@/components/ui/searchable-select'
import type { GetUnitQuery, Unit, UnitLevel } from '@/types'

export type UnitOption = SearchableOption & { unit: Unit }

/**
 * Đơn vị → option có nhóm theo đơn vị cha.
 * - class    → nhóm theo đại đội
 * - company  → nhóm theo tiểu đoàn
 * - battalion → không nhóm
 * `keywords` chứa alias + tên cha để tìm kiếm theo mã/đại đội.
 */
export function buildUnitOptions(units: Unit[]): UnitOption[] {
	return units.map((unit) => ({
		value: String(unit.id),
		label: unit.name,
		group: unit.parent?.name,
		keywords: [unit.alias, unit.parent?.name, unit.parent?.alias]
			.filter(Boolean)
			.join(' '),
		unit
	}))
}

/** Danh sách option đơn vị dùng chung cho mọi dropdown chọn đơn vị */
export default function useUnitOptions(
	level: UnitLevel,
	params?: Omit<GetUnitQuery, 'level'>
) {
	const query = useUnitsData({ ...params, level })
	const options = useMemo(
		() => buildUnitOptions((query.data ?? []) as unknown as Unit[]),
		[query.data]
	)
	return { ...query, options }
}
