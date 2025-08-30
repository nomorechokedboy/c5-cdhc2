import { battalionStudentColumnsWithoutAction } from '@/components/student-table/columns'
import useStudentData from '@/hooks/useStudents'
import { defaultCpvOfficialColumnVisibility } from './student-table/default-columns-visibility'
import { getCurrentWeekNumber } from '@/lib/utils'
import StudentTable from './student-table/new-student-table'
import { useStudentFacetedFilters } from '@/hooks/useStudentFacetedFilters'
import UnitFacetedFilter, { useFilteredClassIds } from './unit-filter'
import { useState } from 'react'
import type { StudentQueryParams } from '@/types'

export default function CpvOfficialThisWeek() {
	const [selectedUnits, setSelectedUnits] = useState<number[]>([])
	const filteredClassIds = useFilteredClassIds(selectedUnits)
	const studentQueryParams: StudentQueryParams = {
		isCpvOfficialThisWeek: true,
		classIds: filteredClassIds
	}
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData(studentQueryParams)
	const facetedFilters = useStudentFacetedFilters(students)

	return (
		<>
			<div className='flex items-center justify-between space-y-2'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh sách học viên chuẩn bị chuyển Đảng chính thức trong
						tuần
					</h2>
					<p className='text-muted-foreground'>
						Đây là danh sách học viên chuẩn bị chuyển Đảng chính
						thức trong tuần của đại đội
					</p>
				</div>
			</div>
			<StudentTable
				params={studentQueryParams}
				columnVisibility={defaultCpvOfficialColumnVisibility}
				columns={battalionStudentColumnsWithoutAction}
				facetedFilters={facetedFilters}
				exportConfig={{
					filename: `danh-sach-chuyen-dang-chinh-thuc-tuan-${getCurrentWeekNumber()}`
				}}
				leftSection={
					<UnitFacetedFilter
						selectedUnits={selectedUnits}
						onSelectionChange={setSelectedUnits}
					/>
				}
				showRefreshButton
			/>
		</>
	)
}
