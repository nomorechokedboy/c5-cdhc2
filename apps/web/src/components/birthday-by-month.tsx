import { battalionStudentColumns } from '@/components/student-table/columns'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import type { Month, StudentQueryParams } from '@/types'
import dayjs from 'dayjs'
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
import TableSkeleton from './table-skeleton'
import StudentTable from './student-table/new-student-table'
import UnitFacetedFilter, { useFilteredClassIds } from './unit-filter'

const monthOptions = [
	{
		value: '01',
		label: 'Tháng 1'
	},
	{
		value: '02',
		label: 'Tháng 2'
	},
	{
		value: '03',
		label: 'Tháng 3'
	},
	{
		value: '04',
		label: 'Tháng 4'
	},
	{
		value: '05',
		label: 'Tháng 5'
	},
	{
		value: '06',
		label: 'Tháng 6'
	},
	{
		value: '07',
		label: 'Tháng 7'
	},
	{
		value: '08',
		label: 'Tháng 8'
	},
	{
		value: '09',
		label: 'Tháng 9'
	},
	{
		value: '10',
		label: 'Tháng 10'
	},
	{
		value: '11',
		label: 'Tháng 11'
	},
	{
		value: '12',
		label: 'Tháng 12'
	}
]

export default function BirthdayByMonth() {
	const [month, setMonth] = useState<Month>(dayjs().format('MM') as Month)
	const [selectedUnits, setSelectedUnits] = useState<number[]>([])
	const filteredClassIds = useFilteredClassIds(selectedUnits)
	const studentQueryParams: StudentQueryParams = {
		birthdayInMonth: month,
		classIds: filteredClassIds
	}
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData(studentQueryParams)
	const { data: classes, refetch } = useClassData()
	const { createFacetedFilter } = useDataTableToolbarConfig()
	if (isLoadingStudents) {
		return <TableSkeleton />
	}

	const militaryRankSet = new Set(
		students.filter((s) => !!s.rank).map((s) => s.rank)
	)
	const militaryRankOptions = Array.from(militaryRankSet).map((rank) => ({
		label: rank,
		value: rank
	}))
	const classOptions = classes
		? classes.map((c) => ({
				label: `${c.name} - ${c.unit.alias}`,
				value: `${c.name} - ${c.unit.alias}`
			}))
		: []

	const previousUnitSet = new Set(
		students.filter((s) => !!s.previousUnit).map((s) => s.previousUnit)
	)
	const previousUnitOptions = Array.from(previousUnitSet).map((pu) => ({
		label: pu,
		value: pu
	}))

	const facetedFilters = [
		createFacetedFilter('class.name', 'Lớp', classOptions),
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
		<>
			<div className='flex items-center justify-between space-y-2'>
				<div>
					<div className='flex gap-2'>
						<h2 className='text-2xl font-bold tracking-tight'>
							Danh sách học viên có sinh nhật trong
						</h2>
						<Select
							value={month}
							onValueChange={(value) => {
								setMonth(value as Month)
							}}
						>
							<SelectTrigger className='w-[180px]'>
								<SelectValue aria-label={month}>
									Tháng {month}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								<SelectGroup>
									{monthOptions.map(({ label, value }) => (
										<SelectItem value={value} key={value}>
											{label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
					<p className='text-muted-foreground'>
						Đây là danh sách học viên có sinh nhật trong tháng{' '}
						{month} của đại đội
					</p>
				</div>
			</div>
			<StudentTable
				params={studentQueryParams}
				columns={battalionStudentColumns}
				leftSection={
					<UnitFacetedFilter
						level='battalion'
						selectedUnits={selectedUnits}
						onSelectionChange={setSelectedUnits}
						title='Đơn vị'
					/>
				}
				facetedFilters={facetedFilters}
				exportConfig={{
					filename: `danh-sach-sinh-nhat-thang-${month}`
				}}
				columnVisibility={defaultBirthdayColumnVisibility}
				showRefreshButton={true}
			/>
		</>
	)
}
