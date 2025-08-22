import DataTableSkeleton from '@/components/data-table-skeleton'
import { Skeleton } from '@/components/ui/skeleton'

export default function TableSkeleton() {
	return (
		<div className='flex-1 rounded-xl bg-card p-6 shadow-sm border'>
			<div className='mb-4 flex flex-col gap-2'>
				<Skeleton className='h-4 w-xs hidden md:block' />
				<Skeleton className='h-4 w-40 hidden md:block' />
			</div>
			<DataTableSkeleton
				columns={5}
				rows={10}
				showActions={true}
				className='w-full'
			/>
		</div>
	)
}
