import { DataTable } from '@/components/data-table'
import { EduLevelOptions } from '@/components/data-table/data/data'
import ProtectedRoute from '@/components/ProtectedRoute'
import StudentForm from '@/components/student-form'
import { battalionStudentColumns } from '@/components/student-table/columns'
import { defaultBirthdayColumnVisibility } from '@/components/student-table/default-columns-visibility'
import { Button } from '@/components/ui/button'
import { EhtnicOptions } from '@/data/ethnics'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import useExportButton from '@/hooks/useExportButton'
import useStudentData from '@/hooks/useStudents'
import useUnitsData from '@/hooks/useUnitsData'
import { createFileRoute } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import z from 'zod'

const aliasSearchSchema = z.object({
	level: z.enum(['battalion', 'company']).default('battalion'),
	name: z.string().default('')
})

type _AliasBattalionSearch = z.infer<typeof aliasSearchSchema>

export const Route = createFileRoute('/tieu-doan/$alias')({
	component: RouteComponent,
	validateSearch: aliasSearchSchema
})

function RouteComponent() {
	const { alias } = Route.useParams()
	const { level } = Route.useSearch()

	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()
	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ unitAlias: alias, unitLevel: level })
	const { data: units, refetch: refetchUnits } = useUnitsData({
		level: 'battalion'
	})
	const exportButtonProps = useExportButton({
		filename: `danh-sach-hoc-vien-${alias}`
	})

	const handleFormSuccess = () => {
		refetchStudents()
	}
	const searchConfig = [
		createSearchConfig('fullName', 'Tìm kiếm theo tên...')
	]
	const flatUnits = units
		?.map((unit) => {
			if (unit.children.length !== 0) {
				return [unit, ...unit.children]
			}

			return [unit]
		})
		.flat()
	const unit = flatUnits?.find((unit) => unit.alias === alias)
	const unitClasses = unit?.children.map((c) => ({
		classes: c.classes,
		unit: c
	}))

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
				<DataTable
					data={students}
					defaultColumnVisibility={defaultBirthdayColumnVisibility}
					columns={battalionStudentColumns}
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
				/>
			</div>
		</ProtectedRoute>
	)
}
