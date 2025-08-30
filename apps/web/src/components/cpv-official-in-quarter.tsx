import { useState } from 'react'
import type { Quarter, StudentQueryParams } from '@/types'
import { getCurrentQuarter } from '@/lib/utils'
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { defaultCpvOfficialColumnVisibility } from './student-table/default-columns-visibility'
import { battalionStudentColumnsWithoutAction } from '@/components/student-table/columns'
import useStudentData from '@/hooks/useStudents'
import StudentTable from './student-table/new-student-table'
import UnitFacetedFilter, { useFilteredClassIds } from './unit-filter'
import { useStudentFacetedFilters } from '@/hooks/useStudentFacetedFilters'

const quarterOptions = [
	{ value: 'Q1', label: 'Quý 1' },
	{ value: 'Q2', label: 'Quý 2' },
	{ value: 'Q3', label: 'Quý 3' },
	{ value: 'Q4', label: 'Quý 4' }
]

export default function CpvOfficialInQuarter() {
	const [quarter, setQuarter] = useState<Quarter>(
		`Q${getCurrentQuarter()}` as Quarter
	)
	const [selectedUnits, setSelectedUnits] = useState<number[]>([])
	const filteredClassIds = useFilteredClassIds(selectedUnits)
	const studentQueryParams: StudentQueryParams = {
		cpvOfficialInQuarter: quarter,
		classIds: filteredClassIds
	}
	const { data: students = [], refetch: refetchStudents } =
		useStudentData(studentQueryParams)
	const facetedFilters = useStudentFacetedFilters(students)

	return (
		<>
			<div className='flex items-center justify-between space-y-2'>
				<div>
					<div className='flex gap-2'>
						<h2 className='text-2xl font-bold tracking-tight'>
							Danh sách học viên chuẩn bị chuyển Đảng chính thức
							trong
						</h2>
						<Select
							value={quarter}
							onValueChange={(value) =>
								setQuarter(value as Quarter)
							}
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
						Đây là danh sách học viên chuẩn bị chuyển Đảng chính
						thức trong quý {quarter} của đại đội
					</p>
				</div>
			</div>

			<StudentTable
				params={studentQueryParams}
				columns={battalionStudentColumnsWithoutAction}
				facetedFilters={facetedFilters}
				exportConfig={{
					filename: `danh-sach-chuyen-dang-chinh-thuc-${quarter}`
				}}
				columnVisibility={defaultCpvOfficialColumnVisibility}
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
