export default function PermissionCardSkeleton() {
	return (
		<div className='flex items-center justify-between rounded-lg border border-border bg-card py-4 px-6'>
			<div className='flex-1 space-y-3'>
				<div className='flex items-center gap-2'>
					<div className='h-4 w-4 animate-pulse rounded bg-muted' />
					<div className='h-5 w-40 animate-pulse rounded bg-muted' />
				</div>
				<div className='h-4 w-32 animate-pulse rounded bg-muted' />
				<div className='h-3 w-64 animate-pulse rounded bg-muted' />
				<div className='h-5 w-36 animate-pulse rounded-full bg-muted' />
			</div>
			<div className='flex gap-2'>
				<div className='h-8 w-8 animate-pulse rounded bg-muted' />
				<div className='h-8 w-8 animate-pulse rounded bg-muted' />
			</div>
		</div>
	)
}
