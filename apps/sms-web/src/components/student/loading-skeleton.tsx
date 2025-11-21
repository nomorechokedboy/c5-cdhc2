import { Card, CardContent, CardHeader } from '@repo/ui/components/ui/card'

export function CourseSkeleton() {
	return (
		<Card className='animate-pulse'>
			<CardHeader className='space-y-2'>
				<div className='h-6 bg-muted rounded w-3/4'></div>
				<div className='h-4 bg-muted rounded w-1/2'></div>
			</CardHeader>
			<CardContent className='space-y-3'>
				<div className='h-4 bg-muted rounded w-full'></div>
				<div className='h-4 bg-muted rounded w-5/6'></div>
				<div className='flex gap-4 pt-4'>
					<div className='h-4 bg-muted rounded w-1/4'></div>
					<div className='h-4 bg-muted rounded w-1/4'></div>
				</div>
			</CardContent>
		</Card>
	)
}

export function DetailPageSkeleton() {
	return (
		<div className='container mx-auto p-6 space-y-6'>
			<div className='h-10 bg-muted rounded w-24 animate-pulse'></div>

			<Card className='animate-pulse'>
				<CardHeader className='space-y-4'>
					<div className='flex justify-between items-start'>
						<div className='space-y-2 flex-1'>
							<div className='h-8 bg-muted rounded w-3/4'></div>
							<div className='h-4 bg-muted rounded w-1/2'></div>
						</div>
						<div className='h-10 bg-muted rounded w-20'></div>
					</div>
					<div className='h-4 bg-muted rounded w-full'></div>
					<div className='flex gap-6 pt-4'>
						<div className='h-4 bg-muted rounded w-1/4'></div>
						<div className='h-4 bg-muted rounded w-1/4'></div>
					</div>
				</CardHeader>
			</Card>

			<Card className='animate-pulse'>
				<CardHeader>
					<div className='h-6 bg-muted rounded w-1/3'></div>
				</CardHeader>
				<CardContent className='space-y-2'>
					{[...Array(4)].map((_, i) => (
						<div key={i} className='h-10 bg-muted rounded'></div>
					))}
				</CardContent>
			</Card>
		</div>
	)
}
