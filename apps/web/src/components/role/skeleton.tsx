export default function RoleCardSkeleton() {
	return (
		<div className='space-y-4 rounded-lg border border-border bg-card p-6'>
			{/* Title skeleton */}
			<div className='h-6 w-32 animate-pulse rounded bg-muted' />

			{/* Description skeleton */}
			<div className='space-y-2'>
				<div className='h-4 w-full animate-pulse rounded bg-muted' />
				<div className='h-4 w-3/4 animate-pulse rounded bg-muted' />
			</div>

			{/* Permission badges skeleton */}
			<div className='space-y-2'>
				<div className='h-4 w-24 animate-pulse rounded bg-muted' />
				<div className='flex flex-wrap gap-1'>
					{Array.from({ length: 3 }).map((_, i) => (
						<div
							key={i}
							className='h-6 w-20 animate-pulse rounded-full bg-muted'
						/>
					))}
				</div>
			</div>

			{/* User count skeleton */}
			<div className='h-4 w-16 animate-pulse rounded bg-muted' />

			{/* Action buttons skeleton */}
			<div className='flex gap-2 pt-2'>
				<div className='h-9 flex-1 animate-pulse rounded bg-muted' />
				<div className='h-9 w-10 animate-pulse rounded bg-muted' />
				<div className='h-9 w-10 animate-pulse rounded bg-muted' />
			</div>
		</div>
	)
}
