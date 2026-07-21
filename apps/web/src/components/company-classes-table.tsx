import ClassForm from '@/components/class-form'
import ClassCard from '@/components/class-table/class-card'
import { columns } from '@/components/class-table/columns'
import ImportMoodleClassesDialog from '@/components/import-moodle-classes-dialog'
import { DataTable } from '@/components/data-table'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import { Button } from './ui/button'
import { RefreshCw } from 'lucide-react'
import useUnitData from '@/hooks/useUnitData'
import useClassData from '@/hooks/useClasses'

type CompanyClassesTableProps = {
	companyAlias: string
}

export default function CompanyClassesTable({
	companyAlias
}: CompanyClassesTableProps) {
	const { createSearchConfig } = useDataTableToolbarConfig()
	const { data: company, refetch: refetchUnits } = useUnitData({
		alias: companyAlias
	})
	const { data: classes, refetch: refetchClasses } = useClassData({
		unitIds: company?.id !== undefined ? [company?.id] : []
	})
	const handleFormSuccess = () => {
		refetchUnits()
		refetchClasses()
	}

	const searchConfig = [
		createSearchConfig('name', 'Tìm kiếm theo tên lớp...')
	]
	const { createFacetedFilter } = useDataTableToolbarConfig()

	const statusOptions = [
		{ label: 'Đang diễn ra', value: 'ongoing' },
		{ label: 'Đã tốt nghiệp', value: 'graduated' }
	]

	const facetedFilters = [
		createFacetedFilter('status', 'Trạng thái', statusOptions)
	]

	return (
		<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
			<div className='flex items-center justify-between space-y-2'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh sách lớp của {company?.name}
					</h2>
					<p className='text-sm text-muted-foreground mt-1'>
						Học chung khóa: thêm lớp tay hoặc import từ Moodle ·
						hiển thị bảng ngang
					</p>
				</div>
			</div>
			<DataTable
				placeholder='Đại đội chưa có lớp nào — dùng «Thêm lớp» hoặc «Thêm từ Moodle»'
				columns={columns}
				cardComponent={({ data }) => (
					<ClassCard
						data={data}
						onEdit={handleFormSuccess}
						onDelete={handleFormSuccess}
					/>
				)}
				cardClassName='grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
				data={classes ?? []}
				defaultViewMode='table'
				defaultColumnFilters={[{ id: 'status', value: ['ongoing'] }]}
				toolbarProps={{
					rightSection: (
						<>
							<ImportMoodleClassesDialog
								unitId={company?.id}
								onSuccess={handleFormSuccess}
							/>
							<ClassForm
								onSuccess={handleFormSuccess}
								unitId={company?.id}
							/>
							<Button
								variant='outline'
								onClick={() => {
									refetchUnits()
									refetchClasses()
								}}
							>
								<RefreshCw className='w-4 h-4' />
							</Button>
						</>
					),
					searchConfig,
					facetedFilters
				}}
			/>
		</div>
	)
}
