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
	const { data: classes } = useClassData({
		unitIds: company?.id !== undefined ? [company?.id] : []
	})
	const handleFormSuccess = () => {
		refetchUnits()
	}

	const searchConfig = [
		createSearchConfig('name', 'Tìm kiếm theo tên lớp...')
	]
	const facetedFilters: FacetedFilterConfig[] = []

	return (
		<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
			<div className='flex items-center justify-between space-y-2'>
				<div>
					<h2 className='text-2xl font-bold tracking-tight'>
						Danh sách lớp của {company?.name}
					</h2>
				</div>
			</div>
			<DataTable
				placeholder='Đại đội chưa có lớp nào'
				columns={columns}
				cardComponent={({ data }) => (
					<ClassCard
						data={data}
						onEdit={() => refetchUnits()}
						onDelete={() => refetchUnits()}
					/>
				)}
				cardClassName='grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
				data={classes ?? []}
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
