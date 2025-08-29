import { battalionStudentColumns } from '@/components/student-table/columns'
import useStudentData from '@/hooks/useStudents'
import { defaultBirthdayColumnVisibility } from './student-table/default-columns-visibility'
import { getCurrentWeekNumber } from '@/lib/utils'
import StudentTable from './student-table/new-student-table'
import { useState } from 'react'
import type { StudentQueryParams } from '@/types'
import UnitFacetedFilter, { useFilteredClassIds } from './unit-filter'
import { useStudentFacetedFilters } from '@/hooks/useStudentFacetedFilters'

export default function BirthdayByWeek() {
	const [selectedUnits, setSelectedUnits] = useState<number[]>([])
	const filteredClassIds = useFilteredClassIds(selectedUnits)
	const studentQueryParams: StudentQueryParams = {
		birthdayInWeek: true,
		classIds: filteredClassIds
	}
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData(studentQueryParams)
	const weekNumber = getCurrentWeekNumber()
	const facetedFilters = useStudentFacetedFilters(students)

	return (
		<>
			<div className='flex items-center justify-between space-y-2'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh sách học viên có sinh nhật trong tuần
					</h2>
					<p className='text-muted-foreground'>
						Đây là danh sách học viên có sinh nhật trong tuần của
						đại đội
					</p>
				</div>
			</div>
			<StudentTable
				params={studentQueryParams}
				columnVisibility={defaultBirthdayColumnVisibility}
				columns={battalionStudentColumns}
				leftSection={
					<UnitFacetedFilter
						selectedUnits={selectedUnits}
						onSelectionChange={setSelectedUnits}
					/>
				}
				facetedFilters={facetedFilters}
				exportConfig={{
					filename: `danh-sach-sinh-nhat-dong-doi-tuan-${weekNumber}`
				}}
				showRefreshButton
			/>
		</>
	)
}
