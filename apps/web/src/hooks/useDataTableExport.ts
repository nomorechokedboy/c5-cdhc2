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

export default function useDataTableExport<TData>(
	table: TanStackTable<TData>,
	excludeKeys: string[] = ['actions', 'select']
): DataTableExportHook {
	const exportableData = useMemo((): ExportableData => {
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

	return {
		exportableData,
		hasSelectedRows: exportableData.selectedCount > 0,
		selectedRowCount: exportableData.selectedCount
	}
}
