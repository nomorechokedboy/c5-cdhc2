import { useState } from 'react'
import useUnitsData from '@/hooks/useUnitsData'
import FacetedFilter, {
	type GroupedOption,
	type Option
} from './faceted-filter'
import type { UnitLevel } from '@/types'
import FacetedFilterSkeleton from './faceted-filter-skeleton'
import FacetedFilterError from './facted-filter-error'

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

	const {
		data: units,
		isLoading: isLoadingUnits,
		isError,
		refetch: refetchUnits
	} = useUnitsData({ level })
	const handleRetry = () => {
		refetchUnits()
	}
	if (isLoadingUnits) {
		return <FacetedFilterSkeleton />
	}

	if (isError) {
		return <FacetedFilterError title={title} onRetry={handleRetry} />
	}

	const unitOptions: (Option | GroupedOption)[] =
		units?.map((unit) => {
			if (unit.children !== undefined) {
				const childrenOpts: Option[] = unit.children.map((child) => ({
					label: child.name,
					value: child.id.toString(),
					key: child.id
				}))
				return { label: unit.name, options: childrenOpts }
			}

			return { label: unit.name, value: unit.alias }
		}) ?? []

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
			.flatMap((child) => child.classes?.map((cls) => cls.id) ?? [])
	)
}
