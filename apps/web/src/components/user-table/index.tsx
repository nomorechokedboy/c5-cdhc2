import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import useUserData from '@/hooks/useUsers'
import { defaultStudentColumnVisibility, type TemplType } from '@/types'
import { DataTable } from '../data-table'
import { baseStudentsColumns } from '@/components/user-table/columns'
import { EhtnicOptions } from '@/data/ethnics'
import { EduLevelOptions } from '@/components/data-table/data/data'
import TableSkeleton from '../table-skeleton'
import { Button } from '../ui/button'
import { ArrowDownToLine } from 'lucide-react'
import { ExportStudentDataDialog } from '../export-student-data-dialog'
import StudentForm from '../student-form'

interface UserTableProps {
	filename: string
	enabledCreation?: boolean
	templType?: TemplType
}

export default function UserTable({
	filename,
	enabledCreation = false,
	templType = 'UserInfoTempl'
}: UserTableProps) {
	const {
		data: users = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useUserData()

	// const { createFacetedFilter } = useDataTableToolbarConfig()

	if (isLoadingStudents) {
		return <TableSkeleton />
	}

	const handleFormSuccess = () => {
		refetchStudents()
	}

	// const militaryRankSet = new Set(
	//     students.filter((s) => !!s.rank).map((s) => s.rank)
	// )
	// const militaryRankOptions = Array.from(militaryRankSet).map((rank) => ({
	//     label: rank,
	//     value: rank
	// }))

	// const previousUnitSet = new Set(
	//     students.filter((s) => !!s.previousUnit).map((s) => s.previousUnit)
	// )
	// const previousUnitOptions = Array.from(previousUnitSet).map((pu) => ({
	//     label: pu,
	//     value: pu
	// }))
	// const facetedFilters = [
	//     createFacetedFilter('rank', 'Cấp bậc', militaryRankOptions),
	//     createFacetedFilter('previousUnit', 'Đơn vị cũ', previousUnitOptions),
	//     createFacetedFilter('ethnic', 'Dân tộc', EhtnicOptions),
	//     createFacetedFilter(
	//         'educationLevel',
	//         'Trình độ học vấn',
	//         EduLevelOptions
	//     )
	// ]

	return (
		<div>
			<DataTable
				data={users}
				columns={baseStudentsColumns}
				defaultColumnVisibility={defaultStudentColumnVisibility}
				// toolbarProps={{
				//     rightSection:
				//         enabledCreation === true ? (
				//             <StudentForm onSuccess={handleFormSuccess} />
				//         ) : undefined,
				//     facetedFilters
				// }}
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
