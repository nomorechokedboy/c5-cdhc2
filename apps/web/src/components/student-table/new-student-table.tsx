import useStudentData from '@/hooks/useStudents'
import {
	defaultStudentColumnVisibility,
	type FacetedFilterConfig,
	type Student,
	type StudentQueryParams
} from '@/types'
import { DataTable } from '../data-table'
import TableSkeleton from '../table-skeleton'
import { Button } from '../ui/button'
import { ArrowDownToLine, RefreshCw } from 'lucide-react'
import { ExportStudentDataDialog } from '../export-student-data-dialog'
import StudentForm from '../student-form'
import { type ReactNode } from 'react'
import type { VisibilityState, ColumnDef } from '@tanstack/react-table'
import type { QueryObserverResult } from '@tanstack/react-query'

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
	}

	// UI configuration
	enableCreation?: boolean
	showRefreshButton?: boolean
	columnVisibility?: VisibilityState
	placeholder?: string

	// Custom toolbar sections
	leftToolbarSection?: ReactNode
	rightToolbarSection?: ReactNode

	// Event handlers
	onRefresh?: () => void
	onCreateSuccess?: () => void
	onDeleteRows?: (
		ids: number[]
	) => Promise<QueryObserverResult<Student[], unknown>>
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
	leftToolbarSection,
	rightToolbarSection,
	onRefresh,
	onCreateSuccess,
	onDeleteRows
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
					rightSection,
					facetedFilters
				}}
				onDeleteRows={onDeleteRows}
				renderToolbarActions={
					exportConfig?.disabled === true
						? undefined
						: ({ exportHook }) =>
								exportConfig ? (
									<ExportStudentDataDialog
										data={exportHook.exportableData.data}
										defaultFilename={exportConfig.filename}
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
