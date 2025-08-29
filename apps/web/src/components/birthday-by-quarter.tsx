import { battalionStudentColumns } from '@/components/student-table/columns'
import useStudentData from '@/hooks/useStudents'
import type { Quarter, StudentQueryParams } from '@/types'
import { useState } from 'react'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { defaultBirthdayColumnVisibility } from './student-table/default-columns-visibility'
import { getCurrentQuarter } from '@/lib/utils'
import StudentTable from './student-table/new-student-table'
import UnitFacetedFilter, { useFilteredClassIds } from './unit-filter'
import { useStudentFacetedFilters } from '@/hooks/useStudentFacetedFilters'

const quarterOptions = [
	{
		value: 'Q1',
		label: 'Quý 1'
	},
	{
		value: 'Q2',
		label: 'Quý 2'
	},
	{
		value: 'Q3',
		label: 'Quý 3'
	},
	{
		value: 'Q4',
		label: 'Quý 4'
	}
]

export default function BirthdayByQuarter() {
	const [selectedUnits, setSelectedUnits] = useState<number[]>([])
	const filteredClassIds = useFilteredClassIds(selectedUnits)
	const [quarter, setQuarter] = useState<Quarter>(
		`Q${getCurrentQuarter()}` as Quarter
	)
	const studentQueryParams: StudentQueryParams = {
		birthdayInQuarter: quarter,
		classIds: filteredClassIds
	}
	const filename = `danh-sach-sinh-nhat-dong-doi-${quarter}`
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
					<div className='flex gap-2'>
						<h2 className='text-2xl font-bold tracking-tight'>
							Danh sách học viên có sinh nhật trong
						</h2>
						<Select
							value={quarter}
							onValueChange={(value) => {
								setQuarter(value as Quarter)
							}}
						>
							<SelectTrigger className='w-[180px]'>
								<SelectValue aria-label={quarter}>
									Quý {quarter}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{quarterOptions.map(({ label, value }) => (
										<SelectItem key={value} value={value}>
											{label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
					<p className='text-muted-foreground'>
						Đây là danh sách học viên có sinh nhật trong quý{' '}
						{quarter} của đại đội
					</p>
				</div>
			</div>
			<StudentTable
				params={studentQueryParams}
				columnVisibility={defaultBirthdayColumnVisibility}
				columns={battalionStudentColumns}
				facetedFilters={facetedFilters}
				exportConfig={{ filename }}
				leftSection={
					<UnitFacetedFilter
						level='battalion'
						selectedUnits={selectedUnits}
						onSelectionChange={setSelectedUnits}
						title='Đơn vị'
					/>
				}
				showRefreshButton
			/>
		</>
	)
}
