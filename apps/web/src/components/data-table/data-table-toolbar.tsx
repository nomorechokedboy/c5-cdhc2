import { LayoutGrid, TableIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTableViewOptions } from './data-table-view-options'
import { DataTableFacetedFilter } from './data-table-faceted-filter'
import type { Table } from '@tanstack/react-table'
import type { ReactNode } from 'react'
import type { FacetedFilterConfig, SearchInputConfig } from '@/types'

export interface DataTableToolbarProps<TData> {
	table: Table<TData>

	// Custom sections
	leftSection?: ReactNode
	rightSection?: ReactNode

	// Custom reset button text
	resetButton?: ReactNode

	// Custom styling
	className?: string
	searchContainerClassName?: string
	rightContainerClassName?: string

	// View mode config
	viewMode?: 'table' | 'card'
	showViewToggle?: boolean
	onViewModeChange?: (mode: 'table' | 'card') => void

	// Search configuration - can be single or multiple search inputs
	searchConfig?: SearchInputConfig | SearchInputConfig[]

	// Faceted filter configuration
	facetedFilters?: FacetedFilterConfig[]

	// Control which default features to show
	showColumnVisibility?: boolean
	showResetButton?: boolean
}

export function DataTableToolbar<TData>({
	table,
	leftSection: LeftSection,
	rightSection: RightSection,
	viewMode = 'table',
	showViewToggle = false,
	onViewModeChange,
	facetedFilters = [],
	showColumnVisibility = true,
	showResetButton = true,
	resetButton: ResetButton = 'Reset',
	className = '',
	searchContainerClassName = '',
	rightContainerClassName = ''
}: DataTableToolbarProps<TData>) {
	const isFiltered = table.getState().columnFilters.length > 0

	// Render faceted filters
	const renderFacetedFilters = () => {
		return facetedFilters.map((filterConfig) => {
			const column = table.getColumn(filterConfig.columnKey.toString())
			if (!column) return null

			return (
				<DataTableFacetedFilter
					key={`filter-${filterConfig.columnKey}`}
					column={column}
					title={filterConfig.title}
					options={filterConfig.options}
				/>
			)
		})
	}

	function handleResetColumnFilter() {
		table.resetColumnFilters()
	}

	return (
		<div className={`flex items-center justify-between ${className}`}>
			<div
				className={`flex flex-1 items-center space-x-2 ${searchContainerClassName}`}
			>
				{LeftSection}
				{/* Faceted filters */}
				{renderFacetedFilters()}

				{/* Reset button */}
				{showResetButton && isFiltered && (
					<Button
						variant='ghost'
						onClick={handleResetColumnFilter}
						className='h-8 px-2 lg:px-3'
					>
						{ResetButton}
						<X />
					</Button>
				)}
			</div>
			<div
				className={`flex items-center gap-2 ${rightContainerClassName}`}
			>
				{showViewToggle && onViewModeChange && (
					<div className='flex items-center rounded-md border'>
						<Button
							variant={viewMode === 'table' ? 'default' : 'ghost'}
							size='sm'
							onClick={() => onViewModeChange('table')}
							className='rounded-r-none'
						>
							<TableIcon className='h-4 w-4' />
						</Button>
						<Button
							variant={viewMode === 'card' ? 'default' : 'ghost'}
							size='sm'
							onClick={() => onViewModeChange('card')}
							className='rounded-l-none'
						>
							<LayoutGrid className='h-4 w-4' />
						</Button>
					</div>
				)}
				{showColumnVisibility && <DataTableViewOptions table={table} />}
				{RightSection}
			</div>
		</div>
	)
}
