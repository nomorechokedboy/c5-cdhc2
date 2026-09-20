import { useState } from 'react'
import useUnitsData from '@/hooks/useUnitsData'
import useUnitOptions, { type UnitOption } from '@/hooks/useUnitOptions'
import FacetedFilter, {
	type GroupedOption,
	type Option
} from './faceted-filter'
import type { UnitLevel } from '@/types'
import FacetedFilterSkeleton from './faceted-filter-skeleton'
import FacetedFilterError from './facted-filter-error'

/** Option có `group` → GroupedOption (giữ thứ tự nhóm xuất hiện đầu tiên) */
function groupFacetedOptions(
	options: UnitOption[]
): (Option | GroupedOption)[] {
	const grouped = new Map<string, Option[]>()
	const ungrouped: Option[] = []
	for (const o of options) {
		const opt: Option = { label: o.label, value: o.value, key: o.value }
		if (o.group === undefined) ungrouped.push(opt)
		else grouped.set(o.group, [...(grouped.get(o.group) ?? []), opt])
	}
	return [
		...ungrouped,
		...Array.from(grouped, ([label, opts]) => ({ label, options: opts }))
	]
}

interface UnitFacetedFilterProps {
	level?: UnitLevel
	selectedUnits?: number[]
	onSelectionChange?: (selectedUnits: number[]) => void
	title?: string
}

export default function UnitFacetedFilter({
	level = 'battalion',
	selectedUnits = [],
	onSelectionChange,
	title = 'Đơn vị'
}: UnitFacetedFilterProps) {
	const [internalFilterValues, setInternalFilterValues] =
		useState<number[]>(selectedUnits)

	// Use internal state if no external control is provided
	const filterValues = onSelectionChange
		? selectedUnits
		: internalFilterValues
	const setFilterValues = onSelectionChange || setInternalFilterValues

	// `level` là cấp gốc của cây: gốc tiểu đoàn → chọn đại đội; gốc đại đội → chọn lớp
	const selectableLevel: UnitLevel =
		level === 'battalion' ? 'company' : 'class'
	const {
		options,
		isLoading: isLoadingUnits,
		isError,
		refetch: refetchUnits
	} = useUnitOptions(selectableLevel)
	const handleRetry = () => {
		refetchUnits()
	}
	if (isLoadingUnits) {
		return <FacetedFilterSkeleton />
	}

	if (isError) {
		return <FacetedFilterError title={title} onRetry={handleRetry} />
	}

	const unitOptions = groupFacetedOptions(options)

	const selectedValues = new Set(filterValues.map(String))

	return (
		<FacetedFilter
			options={unitOptions}
			title={title}
			selectedValues={selectedValues}
			onSelect={(value, isSelected) => {
				if (isSelected) {
					selectedValues.delete(value)
				} else {
					selectedValues.add(value)
				}
				const filteredValues = Array.from(selectedValues).map(Number)
				setFilterValues(filteredValues)
			}}
			onClear={() => {
				setFilterValues([])
			}}
		/>
	)
}

// Export the helper function as a custom hook for getting filtered class IDs
export function useFilteredClassIds(
	selectedUnits: number[],
	level: UnitLevel = 'battalion'
) {
	const { data: units } = useUnitsData({ level })

	return units?.flatMap((unit) =>
		unit.children
			?.filter((child) => selectedUnits.includes(child.id))
			.flatMap((child) => child.children?.map((cls) => cls.id) ?? [])
	)
}
