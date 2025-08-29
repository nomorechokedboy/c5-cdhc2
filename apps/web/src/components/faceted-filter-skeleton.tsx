import { Skeleton } from '@/components/ui/skeleton'

interface FacetedFilterSkeletonProps {
	withPopover?: boolean
}

export default function FacetedFilterSkeleton({
	withPopover = false
}: FacetedFilterSkeletonProps) {
	return (
		<div className='inline-flex flex-col'>
			{/* Button placeholder */}
			<Skeleton className='h-8 w-[120px] rounded-md' />

			{/* Optional popover placeholder */}
			{withPopover && (
				<div className='mt-2 w-[240px] rounded-md border bg-popover p-2 shadow-sm'>
					<Skeleton className='h-6 w-3/4 mb-2' />
					<div className='space-y-2'>
						<Skeleton className='h-4 w-full' />
						<Skeleton className='h-4 w-5/6' />
						<Skeleton className='h-4 w-2/3' />
					</div>
				</div>
			)}
		</div>
	)
}
