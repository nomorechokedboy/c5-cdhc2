import useStudentData from '@/hooks/useStudents'
import {
	defaultStudentColumnVisibility,
	type FacetedFilterConfig,
	type Student,
	type StudentQueryParams,
	type TemplType
} from '@/types'
import { DataTable } from '../data-table'
import TableSkeleton from '../table-skeleton'
import { Button } from '../ui/button'
import { ArrowDownToLine, RefreshCw } from 'lucide-react'
import { ExportStudentDataDialog } from '../export-student-data-dialog'
import StudentForm from '../student-form'
import { type ReactNode } from 'react'
import type { VisibilityState, ColumnDef } from '@tanstack/react-table'
import { type QueryObserverResult } from '@tanstack/react-query'
import { DropdownMenu, DropdownMenuTrigger } from '../ui/dropdown-menu'

interface StudentTableProps {
	// Core data params
	params: StudentQueryParams

	// Required: Columns and filters from parent
	columns: ColumnDef<Student>[]
	facetedFilters?: Array<FacetedFilterConfig>

	// Export configuration
	exportConfig?: {
		filename: string
		disabled?: boolean
		defaultExportValues?: {
			underUnitName?: string
			unitName?: string
		}
	}

	// UI configuration
	enableCreation?: boolean
	showRefreshButton?: boolean
	columnVisibility?: VisibilityState
	placeholder?: string
	leftSection?: ReactNode

	// Custom toolbar sections
	leftToolbarSection?: ReactNode
	rightToolbarSection?: ReactNode

	// Event handlers
	onRefresh?: () => void
	onCreateSuccess?: () => void
	onDeleteRows?: (
		ids: number[]
	) => Promise<QueryObserverResult<Student[], unknown>>
	onConfirmRows?: (
		ids: number[],
		status: 'pending' | 'confirmed'
	) => Promise<QueryObserverResult<Student[], unknown>>
	templType?: TemplType
}

export default function StudentTable({
	params,
	columns,
	facetedFilters = [],
	exportConfig,
	enableCreation = false,
	showRefreshButton = false,
	columnVisibility = defaultStudentColumnVisibility,
	placeholder,
	leftSection,
	leftToolbarSection,
	rightToolbarSection,
	onRefresh,
	onCreateSuccess,
	onDeleteRows,
	onConfirmRows,
	templType = 'StudentInfoTempl'
}: StudentTableProps) {
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudent
	} = useStudentData(params)

	if (isLoadingStudents) {
		return <TableSkeleton />
	}

	const handleFormSuccess = () => {
		refetchStudent()
		onCreateSuccess?.()
	}

	const handleRefresh = () => {
		refetchStudent()
		onRefresh?.()
	}

	// Build right toolbar section
	const rightSection = (
		<>
			{leftToolbarSection}
			{enableCreation && <StudentForm onSuccess={handleFormSuccess} />}
			{showRefreshButton && (
				<Button onClick={handleRefresh}>
					<RefreshCw />
				</Button>
			)}
			{rightToolbarSection}
		</>
	)

	return (
		<div>
			<DataTable
				data={students}
				columns={columns}
				defaultColumnVisibility={columnVisibility}
				placeholder={placeholder}
				toolbarProps={{
					leftSection,
					rightSection,
					facetedFilters
				}}
				onDeleteRows={onDeleteRows}
				onConfirmRows={onConfirmRows}
				getRowId={(originalRow) => {
					return originalRow.id.toString()
				}}
				withDynamicColsData={false}
				renderToolbarActions={
					exportConfig?.disabled === true
						? undefined
						: ({ exportHook }) =>
								exportConfig ? (
									<ExportStudentDataDialog
										data={exportHook.exportableData.data}
										defaultFilename={exportConfig.filename}
										defaultValues={
											exportConfig.defaultExportValues
										}
										templType={templType}
									>
										<Button>
											<ArrowDownToLine />
											Xuất file
										</Button>
									</ExportStudentDataDialog>
								) : null
				}
			/>
		</div>
	)
}
