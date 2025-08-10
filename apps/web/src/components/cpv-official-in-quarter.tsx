import { DataTable } from '@/components/data-table'
import { columns } from '@/components/student-table/columns'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import type { Quarter } from '@/types'
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
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
import { defaultCpvOfficialColumnVisibility } from './student-table/default-columns-visibility'

dayjs.extend(quarterOfYear)

export default function CpvOfficialInQuarter() {
	const [quarter, setQuarter] = useState<Quarter>(
		`Q${dayjs().quarter()}` as Quarter
	)
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ cpvOfficialInQuarter: quarter })
	const { data: classes, refetch } = useClassData()
	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()

	if (isLoadingStudents) {
		return <div>Loading...</div>
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
	const classOptions = classes
		? classes.map((c) => ({
				label: c.name,
				value: c.name
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
							Danh sách học viên chuẩn bị chuyển Đảng chính thức
							trong
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
									{[
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
									].map(({ label, value }) => (
										<SelectItem value={value}>
											{label}
										</SelectItem>
									))}
								</SelectGroup>
							</SelectContent>
						</Select>
					</div>
					<p className='text-muted-foreground'>
						Đây là danh sách học viên chuẩn bị chuyển Đảng chính
						thức trong quý
						{quarter} của đại đội
					</p>
				</div>
			</div>
			<DataTable
				data={students}
				defaultColumnVisibility={defaultCpvOfficialColumnVisibility}
				columns={columns}
				toolbarProps={{
					rightSection: (
						<Button onClick={() => refetchStudents()}>
							<RefreshCw />
						</Button>
					),
					searchConfig,
					facetedFilters
				}}
			/>
		</>
	)
}
