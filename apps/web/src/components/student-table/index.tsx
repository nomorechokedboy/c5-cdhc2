import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import useStudentData from '@/hooks/useStudents'
import {
	defaultStudentColumnVisibility,
	type StudentQueryParams
} from '@/types'
import { DataTable } from '../data-table'
import { columns } from '@/components/student-table/columns'
import { EhtnicOptions } from '@/data/ethnics'
import { EduLevelOptions } from '@/components/data-table/data/data'
import StudentForm from '../student-form'
import SpinnerCircle2 from '../spinner-08'

interface StudentTableProps {
	params: StudentQueryParams
}

const StudentTable: React.FC<StudentTableProps> = ({ params }) => {
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudent
	} = useStudentData(params)

	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()

	if (isLoadingStudents) {
		return (
			<div className='flex h-full items-center justify-center'>
				<SpinnerCircle2 />
			</div>
		)
	}

	const handleFormSuccess = () => {
		refetchStudent()
	}

	const searchConfig = [
		createSearchConfig('fullName', 'Tìm kiếm theo tên...')
	]

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
				columns={columns}
				defaultColumnVisibility={defaultStudentColumnVisibility}
				toolbarProps={{
					rightSection: <StudentForm onSuccess={handleFormSuccess} />,
					searchConfig,
					facetedFilters
				}}
			/>
		</div>
	)
}

export default StudentTable
