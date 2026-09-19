import { GetUnits } from '@/api'
import type { GetUnitQuery, Unit } from '@/types'
import { useQuery } from '@tanstack/react-query'

/** Bỏ các đơn vị cấp lớp (đệ quy) — dùng cho các form chọn đơn vị quản lý/sử dụng */
export function omitClassUnits(units: Unit[]): Unit[] {
	return units
		.filter((u) => u.level !== 'class')
		.map((u) => ({
			...u,
			children: omitClassUnits(u.children ?? [])
		}))
}

export default function useUnitsData(
	params?: GetUnitQuery,
	opts?: { excludeClasses?: boolean }
) {
	return useQuery({
		queryKey: ['units', params],
		queryFn: () => GetUnits(params),
		select: opts?.excludeClasses
			? (units) => omitClassUnits(units as unknown as Unit[])
			: undefined
	})
}
