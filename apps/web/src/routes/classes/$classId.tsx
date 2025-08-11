import { createFileRoute } from '@tanstack/react-router'
import { DataTable } from '@/components/data-table'
import { columnsWithoutAction } from '@/components/student-table/columns'
import { SidebarInset } from '@/components/ui/sidebar'
import StudentForm from '@/components/student-form'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import ProtectedRoute from '@/components/ProtectedRoute'
import SpinnerCircle2 from '@/components/spinner-08'
import useExportButton from '@/hooks/useExportButton'
import useDeleteStudents from '@/hooks/useDeleteStudents'
import useActionColumn from '@/hooks/useActionColumn'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'

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
	const { data: classes, refetch } = useClassData()
	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()
	const thisClass = classes?.find((c) => c.id === Number(classId))
	const exportButtonProps = useExportButton({
		filename: `danh-sach-hoc-vien-lop-${thisClass?.name}`
	})
	const {
		mutateAsync: deleteStudentMutate,
		isPending: isDeletingStudents,
		error: deleteStudentsErr,
		isError
	} = useDeleteStudents()
	const actionColumn = useActionColumn(handleRefreshStudents)

	if (isLoadingStudents) {
		return (
			<>
				<div className='flex h-full items-center justify-center'>
					<SpinnerCircle2 />
				</div>
			</>
		)
	}

	const handleFormSuccess = () => {
		refetchStudents()
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

	async function handleDeleteRows(ids: Array<number>) {
		return deleteStudentMutate({ ids }).then(() => refetchStudents())
	}

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
					<DataTable
						data={students}
						defaultColumnVisibility={{
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
						toolbarProps={{
							rightSection: (
								<>
									<StudentForm
										onSuccess={handleFormSuccess}
									/>
									<Button onClick={handleRefreshStudents}>
										<RefreshCw />
									</Button>
								</>
							),
							searchConfig,
							facetedFilters
						}}
						exportButtonProps={exportButtonProps}
						onDeleteRows={handleDeleteRows}
					/>
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
