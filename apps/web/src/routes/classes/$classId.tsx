import { createFileRoute } from '@tanstack/react-router'
import { columnsWithoutAction } from '@/components/student-table/columns'
import { SidebarInset } from '@/components/ui/sidebar'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import ProtectedRoute from '@/components/ProtectedRoute'
import useActionColumn from '@/hooks/useActionColumn'
import useOnDeleteStudents from '@/hooks/useOnDeleteStudents'
import TableSkeleton from '@/components/table-skeleton'
import StudentTable from '@/components/student-table/new-student-table'
import { useQuery } from '@tanstack/react-query'
import { GetClassById } from '@/api'

export const Route = createFileRoute('/classes/$classId')({
	component: RouteComponent
})

function RouteComponent() {
	const { classId } = Route.useParams()

	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useStudentData({ classId: Number(classId) })
	const { data: classes } = useClassData()
	const { data: thisClass } = useQuery({
		queryKey: ['classById', classId],
		queryFn: () => GetClassById(Number(classId)),
		enabled: !!classId
	})
	const { createFacetedFilter } = useDataTableToolbarConfig()
	const filename = `danh-sach-hoc-vien-lop-${thisClass?.name}`
	const actionColumn = useActionColumn(handleRefreshStudents)
	const handleDeleteRows = useOnDeleteStudents(refetchStudents)

	if (isLoadingStudents) {
		return <TableSkeleton />
	}

	const handleFormSuccess = () => {
		refetchStudents()
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

	function handleRefreshStudents() {
		return refetchStudents()
	}

	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
					<div className='flex items-center justify-between space-y-2'>
						<div>
							<h2 className='text-2xl font-bold tracking-tight'>
								Danh sách học viên
							</h2>
							<p className='text-muted-foreground'>
								Đây là danh sách học viên của đại đội
							</p>
						</div>
					</div>
					<StudentTable
						params={{ classId: Number(classId) }}
						columnVisibility={{
							enlistmentPeriod: false,
							isGraduated: false,
							major: false,
							phone: false,
							position: false,
							policyBeneficiaryGroup: false,
							politicalOrg: false,
							politicalOrgOfficialDate: false,
							cpvId: false,
							previousPosition: false,
							religion: false,
							schoolName: false,
							shortcoming: false,
							talent: false,
							fatherName: false,
							fatherJob: false,
							fatherPhoneNumber: false,
							motherName: false,
							motherJob: false,
							motherPhoneNumber: false,
							cpvOfficialAt: false,
							ethnic: false,
							educationLevel: false
						}}
						columns={[...columnsWithoutAction, actionColumn]}
						facetedFilters={facetedFilters}
						exportConfig={{
							filename,
							defaultExportValues: {
								underUnitName: `LỚP ${thisClass?.name}`,
								unitName: thisClass?.unit.name.toUpperCase()
							}
						}}
						onDeleteRows={handleDeleteRows}
						onCreateSuccess={handleFormSuccess}
						enableCreation
						showRefreshButton
					/>
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
