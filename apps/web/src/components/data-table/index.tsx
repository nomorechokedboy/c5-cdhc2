import {
	type AccessorKeyColumnDef,
	type ColumnDef,
	type ColumnFiltersState,
	type DisplayColumnDef,
	type SortingState,
	type VisibilityState,
	flexRender,
	getCoreRowModel,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { DataTablePagination } from './data-table-pagination'
import {
	DataTableToolbar,
	type DataTableToolbarProps
} from './data-table-toolbar'
import { type ComponentType, useEffect, useState } from 'react'
import { Button } from '../ui/button'
import { ArrowDownToLine } from 'lucide-react'
import type { ExportData } from '@/types'
import { toast } from 'sonner'
import { BaseSchema } from './data/schema'
import { AxiosError } from 'axios'
import type { QueryObserverResult } from '@tanstack/react-query'

type ToolbarProps<TData> = Omit<DataTableToolbarProps<TData>, 'table'>

const deleteDataToastId = 'selection-toast'

interface DataTableProps<TData, TValue> {
	cardClassName?: string
	cardComponent?: ComponentType<{ data: TData; index: number }>
	columns: ColumnDef<TData, TValue>[]
	data: TData[]
	defaultColumnVisibility?: VisibilityState
	defaultViewMode?: ViewMode
	toolbarProps?: ToolbarProps<TData>
	tableClassName?: string
	pagination?: boolean
	toolbarVisible?: boolean
	placeholder?: string
	exportButtonProps?: {
		hidden?: boolean
		onExport?: (data: ExportData) => void
	}
	onDeleteRows?: (
		ids: number[]
	) => Promise<QueryObserverResult<TData[], unknown>>
}

type ViewMode = 'table' | 'card'

type AccessorColumn<T> = AccessorKeyColumnDef<T, any> | DisplayColumnDef<T, any>

export function DataTable<TData, TValue>({
	cardClassName = '',
	cardComponent: CardComponent,
	columns,
	data,
	defaultColumnVisibility = {},
	defaultViewMode = 'table',
	toolbarProps,
	tableClassName,
	pagination = true,
	toolbarVisible = true,
	placeholder = 'Không có dữ liệu nào',
	exportButtonProps = { hidden: true, onExport: undefined },
	onDeleteRows
}: DataTableProps<TData, TValue>) {
	const [rowSelection, setRowSelection] = useState({})
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		defaultColumnVisibility
	)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [sorting, setSorting] = useState<SortingState>([])
	const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode)
	const [isDeleting, setIsDeleting] = useState(false)

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters
		},
		enableRowSelection: !isDeleting,
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		onColumnVisibilityChange: setColumnVisibility,
		getCoreRowModel: getCoreRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues()
	})

	const excludeKeys = ['actions', 'select']
	const getVisibleDataWithMetadata = (): Record<string, string>[] => {
		const visibleColumns = table
			.getVisibleLeafColumns()
			.filter((column) => !excludeKeys.includes(column.id))
		const selectedRows = table.getSelectedRowModel().rows
		let rows = table.getPrePaginationRowModel().rows
		if (selectedRows.length !== 0) {
			rows = selectedRows
		}

		// Create column metadata with proper type checking
		const columnMetadata = visibleColumns.map((column) => {
			const columnDef = column.columnDef as AccessorColumn<TData>
			return {
				id: column.id,
				key:
					'accessorKey' in columnDef
						? columnDef.accessorKey
						: column.id,
				header:
					typeof columnDef.header === 'string'
						? columnDef.header
						: column.id,
				label: columnDef.meta?.label || column.id,
				accessorFn: column.accessorFn
			}
		})

		// Extract data
		const visibleData = rows.map((row) => {
			const visibleRowData: Record<string, string> = {}
			columnMetadata.forEach(({ key, id, label }) => {
				const original = row.original as Record<string, string>
				if (key && original?.[key as string] !== undefined) {
					visibleRowData[label] = original[key as string]
				} else {
					try {
						visibleRowData[label] = row.getValue(id)
					} catch {
						visibleRowData[label] = original?.[id] || ''
					}
				}
			})
			return visibleRowData
		})

		return visibleData
	}

	const renderTableView = () => {
		return (
			<div className={`rounded-md border ${tableClassName}`}>
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											key={header.id}
											colSpan={header.colSpan}
										>
											{header.isPlaceholder
												? null
												: flexRender(
														header.column.columnDef
															.header,
														header.getContext()
													)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={
										row.getIsSelected() && 'selected'
									}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className='h-24 text-center'
								>
									{placeholder}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
		)
	}

	const renderCardView = () => {
		if (!CardComponent) {
			return (
				<div className='text-center py-8 text-muted-foreground'>
					No card component provided
				</div>
			)
		}

		const rows = table.getRowModel().rows

		if (!rows?.length) {
			return (
				<div className='text-center py-8 text-muted-foreground'>
					{placeholder}
				</div>
			)
		}

		return (
			<div
				className={`grid gap-4 ${cardClassName || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
			>
				{rows.map((row, index) => (
					<CardComponent
						key={row.id}
						data={row.original}
						index={index}
					/>
				))}
			</div>
		)
	}
	const selectedRow = table.getSelectedRowModel().rows

	function handleExport() {
		const data = getVisibleDataWithMetadata()
		exportButtonProps.onExport?.(data)
	}

	function handleReset() {
		table.resetRowSelection()
	}

	async function handleDeleteSelected() {
		const ids = selectedRow.map((r) => {
			const record = BaseSchema.parse(r.original)
			return record.id
		})

		try {
			setIsDeleting(true)
			await onDeleteRows?.(ids)

			toast.success('Xóa dữ liệu thành công!')
			table.resetRowSelection()
		} catch (err) {
			toast.error('Xóa dữ liệu bị lỗi!')
			if (err instanceof AxiosError) {
				console.error('Http error: ', err.response?.data)
			}
		} finally {
			setIsDeleting(false)
		}
	}

	useEffect(() => {
		if (selectedRow.length === 0) {
			toast.dismiss()
			return
		}

		toast('', {
			id: deleteDataToastId,
			duration: Number.POSITIVE_INFINITY,
			closeButton: false,
			position: 'bottom-center',
			description: `Đang chọn ${selectedRow.length}`,
			cancel: (
				<Button
					variant='outline'
					size='sm'
					onClick={handleReset}
					className='text-xs h-7 bg-transparent'
					disabled={isDeleting}
				>
					Bỏ chọn
				</Button>
			),
			action: (
				<Button
					variant='destructive'
					size='sm'
					onClick={handleDeleteSelected}
					className='text-xs h-7 ml-4'
					disabled={isDeleting}
				>
					Xóa dữ liệu
				</Button>
			)
		})
	}, [selectedRow, isDeleting, handleReset, handleDeleteSelected])

	return (
		<div className='space-y-4'>
			{toolbarVisible && (
				<DataTableToolbar
					table={table}
					onViewModeChange={setViewMode}
					{...toolbarProps}
					rightSection={
						<>
							{exportButtonProps.hidden !== true && (
								<Button onClick={handleExport}>
									<ArrowDownToLine />
									Xuất file
								</Button>
							)}
							{toolbarProps?.rightSection}
						</>
					}
				/>
			)}
			{viewMode === 'table' ? renderTableView() : renderCardView()}
			{pagination && <DataTablePagination table={table} />}
		</div>
	)
}
