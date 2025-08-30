import { EduLevelOptions } from '@/components/data-table/data/data'
import ProtectedRoute from '@/components/ProtectedRoute'
import { battalionStudentColumnsWithoutAction } from '@/components/student-table/columns'
import { defaultBirthdayColumnVisibility } from '@/components/student-table/default-columns-visibility'
import StudentTable from '@/components/student-table/new-student-table'
import TableSkeleton from '@/components/table-skeleton'
import { EhtnicOptions } from '@/data/ethnics'
import useActionColumn from '@/hooks/useActionColumn'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import useOnDeleteStudents from '@/hooks/useOnDeleteStudents'
import useStudentData from '@/hooks/useStudents'
import useUnitData from '@/hooks/useUnitData'
import { createFileRoute } from '@tanstack/react-router'
import z from 'zod'

const aliasSearchSchema = z.object({
	level: z.enum(['battalion', 'company']).default('battalion'),
	name: z.string().default('')
})

export const Route = createFileRoute('/tieu-doan/$alias')({
	component: RouteComponent,
	validateSearch: aliasSearchSchema
})

function RouteComponent() {
	const { alias } = Route.useParams()
	const { level } = Route.useSearch()

	const { createFacetedFilter } = useDataTableToolbarConfig()
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ unitAlias: alias, unitLevel: level })
	const { data: unit } = useUnitData({ alias, level })
	const filename = `danh-sach-hoc-vien-${alias}`
	const handleDeleteStudents = useOnDeleteStudents(refetchStudents)

	const handleFormSuccess = () => {
		refetchStudents()
	}
	const unitClasses = unit?.children.map((c) => ({
		classes: c.classes,
		unit: c
	}))
	const actionColumn = useActionColumn(() => {
		return refetchStudents()
	})

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
	const classOptions = unitClasses
		? unitClasses
				.map((unit) =>
					unit.classes?.map((c) => ({
						label: `${c?.name} - ${unit?.unit?.alias}`,
						value: `${c?.name} - ${unit?.unit?.alias}`
					}))
				)
				.flat()
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
		<ProtectedRoute>
			<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
				<div className='flex items-center justify-between space-y-2'>
					<div>
						<h2 className='text-2xl font-bold tracking-tight'>
							Danh sách học viên Tiểu đoàn
						</h2>
						<p className='text-muted-foreground'>
							Đây là danh sách học viên của {unit?.name}
						</p>
					</div>
				</div>
				<StudentTable
					params={{ unitAlias: alias, unitLevel: level }}
					columnVisibility={defaultBirthdayColumnVisibility}
					columns={[
						...battalionStudentColumnsWithoutAction,
						actionColumn
					]}
					facetedFilters={facetedFilters}
					placeholder='Chưa có thông tin học viên.'
					exportConfig={{
						filename,
						defaultExportValues: {
							unitName: 'Trường Cao đẳng hậu cần 2'.toUpperCase(),
							underUnitName: unit?.name.toUpperCase()
						}
					}}
					onDeleteRows={handleDeleteStudents}
					onCreateSuccess={handleFormSuccess}
					enableCreation
					showRefreshButton
				/>
			</div>
		</ProtectedRoute>
	)
}
