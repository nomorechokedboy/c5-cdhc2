import * as React from 'react'
import type { Column } from '@tanstack/react-table'
import { FacetedFilter } from '@/components/faceted-filter'

interface DataTableFacetedFilterProps<TData, TValue> {
	column?: Column<TData, TValue>
	title?: string
	options: {
		label: string
		value: string
		icon?: React.ComponentType<{ className?: string }>
	}[]
}

export function DataTableFacetedFilter<TData, TValue>({
	column,
	title,
	options
}: DataTableFacetedFilterProps<TData, TValue>) {
	const facets = column?.getFacetedUniqueValues()
	const selectedValues = new Set(column?.getFilterValue() as string[])

	function handleSelect(value: string, isSelected: boolean) {
		if (isSelected) {
			selectedValues.delete(value)
		} else {
			selectedValues.add(value)
		}
		const filterValues = Array.from(selectedValues)
		column?.setFilterValue(filterValues.length ? filterValues : undefined)
	}

	function handleClear() {
		column?.setFilterValue(undefined)
	}

	return (
		<FacetedFilter
			title={title}
			options={options}
			facets={facets}
			selectedValues={selectedValues}
			onSelectValue={handleSelect}
			onClear={handleClear}
		/>
	)
}
