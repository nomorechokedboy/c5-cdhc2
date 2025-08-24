import { battalionStudentColumns } from '@/components/student-table/columns'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import type { Quarter } from '@/types'
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
import TableSkeleton from './table-skeleton'
import StudentTable from './student-table/new-student-table'

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
	const [quarter, setQuarter] = useState<Quarter>(
		`Q${getCurrentQuarter()}` as Quarter
	)
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ birthdayInQuarter: quarter })
	const { data: classes, refetch } = useClassData()
	const { createFacetedFilter } = useDataTableToolbarConfig()
	const filename = `danh-sach-sinh-nhat-dong-doi-${quarter}`

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
				params={{ cpvOfficialInQuarter: quarter }}
				columnVisibility={defaultBirthdayColumnVisibility}
				columns={battalionStudentColumns}
				facetedFilters={facetedFilters}
				exportConfig={{ filename }}
				showRefreshButton
			/>
		</>
	)
}
