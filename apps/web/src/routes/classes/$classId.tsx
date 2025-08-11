import { createFileRoute, redirect } from '@tanstack/react-router'
import { DataTable } from '@/components/data-table'
import { columns } from '@/components/student-table/columns'
import { SidebarInset } from '@/components/ui/sidebar'
import StudentForm from '@/components/student-form'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { EduLevelOptions } from '@/components/data-table/data/data'
import { EhtnicOptions } from '@/data/ethnics'
import useClassData from '@/hooks/useClasses'
import useStudentData from '@/hooks/useStudents'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ExportTableData } from '@/api'
import { toast } from 'sonner'
import type { ExportData } from '@/types'
import SpinnerCircle2 from '@/components/spinner-08'

export const Route = createFileRoute('/classes/$classId')({
	component: RouteComponent
})

function RouteComponent() {
	const { classId } = Route.useParams()

	const {
		data: students = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudent
	} = useStudentData({ classId: Number(classId) })
	const { data: classes, refetch } = useClassData()
	const { createFacetedFilter, createSearchConfig } =
		useDataTableToolbarConfig()

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
		refetchStudent()
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

	async function handleExport(data: ExportData) {
		try {
			const resp = await ExportTableData(data)
			const blob = new Blob([resp.data], {
				type: resp.headers['content-type']
			})

			const link = document.createElement('a')
			link.href = window.URL.createObjectURL(blob)
			link.download = 'my-file.docx'

			document.body.appendChild(link)
			link.click()

			document.body.removeChild(link)
			window.URL.revokeObjectURL(link.href)
		} catch (err) {
			toast.error('Chưa thể xuất file, đã có lỗi xảy ra!')
		}
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
						columns={columns}
						toolbarProps={{
							rightSection: (
								<StudentForm onSuccess={handleFormSuccess} />
							),
							searchConfig,
							facetedFilters
						}}
						exportButtonProps={{
							hidden: false,
							onExport: handleExport
						}}
					/>
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
