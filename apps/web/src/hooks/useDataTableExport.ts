import type {
	AccessorKeyColumnDef,
	DisplayColumnDef,
	Table as TanStackTable
} from '@tanstack/react-table'
import { useMemo } from 'react'

export interface ExportableData {
	data: Record<string, string>[]
	selectedCount: number
	totalCount: number
	hasSelection: boolean
}

export interface DataTableExportHook {
	exportableData: ExportableData
	hasSelectedRows: boolean
	selectedRowCount: number
}

type AccessorColumn<T> = AccessorKeyColumnDef<T, any> | DisplayColumnDef<T, any>

export type useDataTableExportProps<TData> = {
	table: TanStackTable<TData>
	excludeKeys?: string[]
	isDynamic?: boolean
}

export default function useDataTableExport<TData>({
	table,
	excludeKeys = ['actions', 'select'],
	isDynamic = true
}: useDataTableExportProps<TData>): DataTableExportHook {
	const exporTableDataDynamically = useMemo((): ExportableData => {
		const visibleColumns = table
			.getVisibleLeafColumns()
			.filter((column) => !excludeKeys.includes(column.id))

		const selectedRows = table.getSelectedRowModel().rows
		let rows = table.getPrePaginationRowModel().rows
		const hasSelection = selectedRows.length > 0

		if (hasSelection) {
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
		const data = rows.map((row) => {
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

		return {
			data,
			selectedCount: selectedRows.length,
			totalCount: table.getPrePaginationRowModel().rows.length,
			hasSelection
		}
	}, [table, excludeKeys])

	const exporTableDataStatically = useMemo((): ExportableData => {
		const selectedRows = table.getSelectedRowModel().rows
		let rows = table.getPrePaginationRowModel().rows
		const hasSelection = selectedRows.length > 0

		if (hasSelection) {
			rows = selectedRows
		}

		// Extract data
		const data = rows.map((row) => {
			return row.original as Record<string, string>
		})

		return {
			data,
			selectedCount: selectedRows.length,
			totalCount: table.getPrePaginationRowModel().rows.length,
			hasSelection
		}
	}, [table, excludeKeys])

	return {
		exportableData: isDynamic
			? exporTableDataDynamically
			: exporTableDataStatically,
		hasSelectedRows: exporTableDataDynamically.selectedCount > 0,
		selectedRowCount: exporTableDataDynamically.selectedCount
	}
}
