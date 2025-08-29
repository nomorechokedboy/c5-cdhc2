import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import useClassData from '@/hooks/useClasses'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import type { Student } from '@/types'

export function useStudentFacetedFilters(students: Student[]) {
	const { data: classes } = useClassData()
	const { createFacetedFilter } = useDataTableToolbarConfig()

	// Military Rank Options
	const militaryRankSet = new Set(
		students.filter((s) => !!s.rank).map((s) => s.rank)
	)
	const militaryRankOptions = Array.from(militaryRankSet).map((rank) => ({
		label: rank,
		value: rank
	}))

	// Class Options
	const classOptions = classes
		? classes.map((c) => ({
				label: `${c.name} - ${c.unit.alias}`,
				value: `${c.name} - ${c.unit.alias}`
			}))
		: []

	// Previous Unit Options
	const previousUnitSet = new Set(
		students.filter((s) => !!s.previousUnit).map((s) => s.previousUnit)
	)
	const previousUnitOptions = Array.from(previousUnitSet).map((pu) => ({
		label: pu,
		value: pu
	}))

	return [
		createFacetedFilter('class.name', 'Lớp', classOptions),
		createFacetedFilter('rank', 'Cấp bậc', militaryRankOptions),
		createFacetedFilter('previousUnit', 'Đơn vị cũ', previousUnitOptions),
		createFacetedFilter('ethnic', 'Dân tộc', EhtnicOptions),
		createFacetedFilter(
			'educationLevel',
			'Trình độ học vấn',
			EduLevelOptions
		)
	]
}
