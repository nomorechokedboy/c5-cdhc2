import { DataTable } from '@/components/data-table'
import { battalionStudentColumns } from '@/components/student-table/columns'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import { defaultBirthdayColumnVisibility } from './student-table/default-columns-visibility'
/* import useUnitsData from '@/hooks/useUnitsData'
import { useState } from 'react'
import UnitDropdown from './unit-dropdown' */
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
import useExportButton from '@/hooks/useExportButton'
import { getCurrentWeekNumber } from '@/lib/utils'
import TableSkeleton from './table-skeleton'

export default function BirthdayByWeek() {
	/* const {
        data: units,
        isLoading: isLoadingUnits,
        refetch: refetchUnits
    } = useUnitsData()
    const unitOptions =
        units?.map((unit) => ({ label: unit.name, value: unit.alias })) ?? []
    const [selectedValues, setSelectedValues] = useState<Set<string>>(new Set()) */
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ birthdayInWeek: true })
	const { data: classes, refetch } = useClassData()
	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()
	const weekNumber = getCurrentWeekNumber()
	const exportButtonProps = useExportButton({
		filename: `danh-sach-sinh-nhat-dong-doi-tuan-${weekNumber}`
	})

	if (isLoadingStudents) {
		return <TableSkeleton />
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
			<DataTable
				data={students}
				defaultColumnVisibility={defaultBirthdayColumnVisibility}
				columns={battalionStudentColumns}
				toolbarProps={{
					rightSection: (
						<Button onClick={() => refetchStudents()}>
							<RefreshCw />
						</Button>
					),
					searchConfig,
					facetedFilters
				}}
				exportButtonProps={exportButtonProps}
			/>
		</>
	)
}
