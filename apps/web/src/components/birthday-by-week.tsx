import { battalionStudentColumns } from '@/components/student-table/columns'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import { defaultBirthdayColumnVisibility } from './student-table/default-columns-visibility'
import { getCurrentWeekNumber } from '@/lib/utils'
import TableSkeleton from './table-skeleton'
import StudentTable from './student-table/new-student-table'
import FacetedFilter, {
	type GroupedOption,
	type Option
} from './faceted-filter'
import useUnitsData from '@/hooks/useUnitsData'
import { useState } from 'react'

export default function BirthdayByWeek() {
	const {
		data: units,
		isLoading: isLoadingUnits,
		refetch: refetchUnits
	} = useUnitsData({ level: 'battalion' })
	const unitOptions: (Option | GroupedOption)[] =
		units?.map((unit) => {
			if (unit.children !== undefined) {
				const childrenOpts: Option[] = unit.children.map((child) => ({
					label: child.name,
					value: child.id.toString()
				}))
				return { label: unit.name, options: childrenOpts }
			}

			return { label: unit.name, value: unit.alias }
		}) ?? []
	const [filterValues, setFilterValues] = useState<number[]>([])
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ birthdayInWeek: true })
	const { data: classes, refetch } = useClassData()
	const { createFacetedFilter } = useDataTableToolbarConfig()
	const weekNumber = getCurrentWeekNumber()
	const selectedValues = new Set(filterValues.map((el) => el.toString()))
	const filteredClassIds =
		units?.flatMap((unit) =>
			unit.children
				.filter((child) => filterValues.includes(child.id))
				.flatMap((child) => child.classes?.map((cls) => cls.id) ?? [])
		) ?? []

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
				params={{ birthdayInWeek: true }}
				columnVisibility={defaultBirthdayColumnVisibility}
				columns={battalionStudentColumns}
				leftSection={
					<FacetedFilter
						options={unitOptions}
						title='Đơn vị'
						selectedValues={selectedValues}
						onSelect={(value, isSelected) => {
							if (isSelected) {
								selectedValues.delete(value)
							} else {
								selectedValues.add(value)
							}
							const filteredValues = Array.from(
								selectedValues
							).map((el) => Number(el))
							setFilterValues(filteredValues)
						}}
						onClear={() => {
							setFilterValues([])
						}}
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
