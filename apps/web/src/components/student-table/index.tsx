import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import useStudentData from '@/hooks/useStudents'
import {
	defaultStudentColumnVisibility,
	type StudentQueryParams,
	type TemplType
} from '@/types'
import { DataTable } from '../data-table'
import { columnsWithoutAction } from '@/components/student-table/columns'
import { EhtnicOptions } from '@/data/ethnics'
import { EduLevelOptions } from '@/components/data-table/data/data'
import TableSkeleton from '../table-skeleton'
import { Button } from '../ui/button'
import { ArrowDownToLine } from 'lucide-react'
import { ExportStudentDataDialog } from '../export-student-data-dialog'
import StudentForm from '../student-form'

interface StudentTableProps {
	params: StudentQueryParams
	filename: string
	enabledCreation?: boolean
	templType?: TemplType
}

export default function StudentTable({
	params,
	filename,
	enabledCreation = false,
	templType = 'StudentInfoTempl'
}: StudentTableProps) {
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData(params)

	const { createFacetedFilter } = useDataTableToolbarConfig()

	if (isLoadingStudents) {
		return <TableSkeleton />
	}

	const handleFormSuccess = () => {
		refetchStudents()
	}

	const militaryRankSet = new Set(
		students.filter((s) => !!s.rank).map((s) => s.rank)
	)
	const militaryRankOptions = Array.from(militaryRankSet).map((rank) => ({
		label: rank,
		value: rank
	}))

	const previousUnitSet = new Set(
		students.filter((s) => !!s.previousUnit).map((s) => s.previousUnit)
	)
	const previousUnitOptions = Array.from(previousUnitSet).map((pu) => ({
		label: pu,
		value: pu
	}))
	const facetedFilters = [
		createFacetedFilter('rank', 'Cấp bậc', militaryRankOptions),
		createFacetedFilter('previousUnit', 'Đơn vị cũ', previousUnitOptions),
		createFacetedFilter('ethnic', 'Dân tộc', EhtnicOptions),
		createFacetedFilter(
			'educationLevel',
			'Trình độ học vấn',
			EduLevelOptions
		)
	]

	return (
		<div>
			<DataTable
				data={students}
				columns={columnsWithoutAction}
				defaultColumnVisibility={defaultStudentColumnVisibility}
				toolbarProps={{
					rightSection:
						enabledCreation === true ? (
							<StudentForm onSuccess={handleFormSuccess} />
						) : undefined,
					facetedFilters
				}}
				withDynamicColsData={false}
				renderToolbarActions={({ exportHook }) => (
					<ExportStudentDataDialog
						data={exportHook.exportableData.data}
						defaultFilename={filename}
						templType={templType}
					>
						<Button>
							<ArrowDownToLine />
							Xuất file
						</Button>
					</ExportStudentDataDialog>
				)}
			/>
		</div>
	)
}
