import { DataTable } from '@/components/data-table'
import { battalionStudentColumns } from '@/components/student-table/columns'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
import { defaultCpvOfficialColumnVisibility } from './student-table/default-columns-visibility'
import useExportButton from '@/hooks/useExportButton'
import { getCurrentWeekNumber } from '@/lib/utils'
import TableSkeleton from './table-skeleton'

export default function CpvOfficialThisWeek() {
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ isCpvOfficialThisWeek: true })
	const { data: classes, refetch: refetchClasses } = useClassData()
	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()
	const exportButtonProps = useExportButton({
		filename: `danh-sach-chuyen-dang-chinh-thuc-tuan-${getCurrentWeekNumber()}`
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
						Danh sách học viên chuẩn bị chuyển Đảng chính thức trong
						tuần
					</h2>
					<p className='text-muted-foreground'>
						Đây là danh sách học viên chuẩn bị chuyển Đảng chính
						thức trong tuần của đại đội
					</p>
				</div>
			</div>
			<DataTable
				data={students}
				defaultColumnVisibility={defaultCpvOfficialColumnVisibility}
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
