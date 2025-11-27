import ClassForm from '@/components/class-form'
import ClassCard from '@/components/class-table/class-card'
import { columns } from '@/components/class-table/columns'
import { DataTable } from '@/components/data-table'
import useDataTableToolbarConfig from '@/hooks/useDataTableToolbarConfig'
import type { FacetedFilterConfig } from '@/types'
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
	const statusOptions = [
		{ label: 'Đang diễn ra', value: 'ongoing' },
		{ label: 'Đã tốt nghiệp', value: 'graduated' }
	]
	const { createFacetedFilter } = useDataTableToolbarConfig()
	const facetedFilters = [
		createFacetedFilter('status', 'Trạng thái', statusOptions)
	]

	return (
		<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
			<div className='flex items-center justify-between space-y-2'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh sách lớp của {company?.name} aa
					</h2>
				</div>
			</div>
			<DataTable
				placeholder='Đại đội chưa có lớp nào ha'
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
				facetedFilters={facetedFilters}
				defaultViewMode='card'
				toolbarProps={{
					rightSection: (
						<>
							<ClassForm
								onSuccess={handleFormSuccess}
								unitId={company?.id}
							/>
							<Button onClick={() => refetchUnits()}>
								<RefreshCw />
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
