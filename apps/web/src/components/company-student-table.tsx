import { DataTable } from '@/components/data-table'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { columns } from '@/components/student-table/columns'
import { SidebarInset } from '@/components/ui/sidebar'
import { EhtnicOptions } from '@/data/ethnics'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import useStudentData from '@/hooks/useStudents'
import useUnitsData from '@/hooks/useUnitsData'
import type { UnitLevel } from '@/types'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
import StudentForm from './student-form'
import { defaultBirthdayColumnVisibility } from './student-table/default-columns-visibility'
import useExportButton from '@/hooks/useExportButton'
import useOnDeleteStudents from '@/hooks/useOnDeleteStudents'

type CompanyStudentTableProps = { alias: string; level: UnitLevel }

export default function CompanyStudentTable({
	alias,
	level
}: CompanyStudentTableProps) {
	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()
	const searchConfig = [
		createSearchConfig('fullName', 'Tìm kiếm theo tên...')
	]
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ unitAlias: alias, unitLevel: level })
	const handleFormSuccess = () => {
		refetchStudents()
	}
	const handleDeleteStudents = useOnDeleteStudents(refetchStudents)

	const { data: units, refetch: _refetchUnits } = useUnitsData({
		level: 'battalion'
	})
	const flatUnits = units
		?.map((unit) => {
			if (unit.children.length !== 0) {
				return [unit, ...unit.children]
			}

			return [unit]
		})
		.flat()
	const exportButtonProps = useExportButton({
		filename: `danh-sach-hoc-vien-${alias}`
	})

	const unit = flatUnits?.find((unit) => unit.alias === alias)
	const unitClasses = unit?.classes

	if (isLoadingStudents) {
		return <div>Loading...</div>
	}

	const militaryRankSet = new Set(
		students.filter((s) => !!s.rank).map((s) => s.rank)
	)
	const militaryRankOptions = Array.from(militaryRankSet).map((rank) => ({
		label: rank,
		value: rank
	}))
	const classOptions = unitClasses
		? unitClasses.map((c) => ({
				label: c?.name,
				value: c?.name
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
		<SidebarInset>
			<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
				<div className='flex items-center justify-between space-y-2'>
					<div>
						<h2 className='text-2xl font-bold tracking-tight'>
							Danh sách học viên Đại đội
						</h2>
						<p className='text-muted-foreground'>
							Đây là danh sách học viên của {unit?.name}
						</p>
					</div>
				</div>
				<DataTable
					data={students}
					defaultColumnVisibility={defaultBirthdayColumnVisibility}
					columns={columns}
					toolbarProps={{
						rightSection: (
							<>
								<StudentForm onSuccess={handleFormSuccess} />
								<Button onClick={() => refetchStudents()}>
									<RefreshCw />
								</Button>
							</>
						),
						searchConfig,
						facetedFilters
					}}
					placeholder='Chưa có thông tin học viên.'
					exportButtonProps={exportButtonProps}
					onDeleteRows={handleDeleteStudents}
				/>
			</div>
		</SidebarInset>
	)
}
