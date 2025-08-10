import {
	type ColumnDef,
	type ColumnFiltersState,
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
import { type ComponentType, useState } from 'react'
import StudentInfoTabs from '../student-info-tabs'
import type { Student } from '@/types'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogClose
} from '@/components/ui/dialog'

type ToolbarProps<TData> = Omit<DataTableToolbarProps<TData>, 'table'>

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
}

type ViewMode = 'table' | 'card'

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
	placeholder = 'Không có dữ liệu nào'
}: DataTableProps<TData, TValue>) {
	const [rowSelection, setRowSelection] = useState({})
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
		defaultColumnVisibility
	)
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
	const [sorting, setSorting] = useState<SortingState>([])
	const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode)
	const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

	const table = useReactTable({
		data,
		columns,
		state: {
			sorting,
			columnVisibility,
			rowSelection,
			columnFilters
		},
		enableRowSelection: true,
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
									onClick={() => {
										setSelectedStudent(
											row.original as Student
										)
										console.log(
											'Selected student:',
											row.original
										)
									}}
									className='cursor-pointer hover:bg-muted/50'
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

	return (
		<div className='space-y-4'>
			{toolbarVisible && (
				<DataTableToolbar
					table={table}
					onViewModeChange={setViewMode}
					{...toolbarProps}
				/>
			)}
			{viewMode === 'table' ? renderTableView() : renderCardView()}
			{/* Modal Student Info */}
			{selectedStudent && (
				<Dialog
					open={!!selectedStudent}
					onOpenChange={(open) => {
						if (!open) setSelectedStudent(null)
					}}
				>
					<DialogContent className='max-w-7xl h-[90vh] overflow-y-auto p-6'>
						<DialogHeader className='flex items-center justify-between'>
							<DialogTitle>Thông tin học viên</DialogTitle>
							{/* <DialogClose asChild>
								
							</DialogClose> */}
						</DialogHeader>
						<StudentInfoTabs student={selectedStudent} />
					</DialogContent>
				</Dialog>
			)}
			{pagination && <DataTablePagination table={table} />}
		</div>
	)
}
