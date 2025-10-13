import { Card, CardContent, CardHeader } from '@repo/ui/components/ui/card'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'

export default function CourseDetailsSkeleton() {
	// Generate skeleton rows for the table
	const skeletonRows = Array.from({ length: 5 }, (_, i) => i)
	const skeletonColumns = Array.from({ length: 4 }, (_, i) => i)

	return (
		<div className='container mx-auto p-6 space-y-6 relative'>
			{/* Course Header Skeleton */}
			<Card className='border-border sticky top-16 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20'>
				<CardHeader className='pb-4'>
					<div className='flex items-start justify-between'>
						<div className='space-y-2 flex-1'>
							<div className='flex items-center gap-2'>
								<Skeleton className='h-6 w-6 rounded' />
								<Skeleton className='h-8 w-64' />
							</div>
							<Skeleton className='h-5 w-full max-w-2xl' />
							<Skeleton className='h-5 w-3/4 max-w-xl' />
						</div>
						<Skeleton className='h-7 w-28 rounded-full' />
					</div>
				</CardHeader>
				<CardContent>
					<div className='flex items-center gap-6'>
						<Skeleton className='h-4 w-48' />
						<Skeleton className='h-4 w-48' />
					</div>
				</CardContent>
			</Card>

			{/* Grades Table Skeleton */}
			<Card className='border-border'>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='space-y-2'>
							<Skeleton className='h-7 w-48' />
							<Skeleton className='h-4 w-96' />
						</div>
						<div className='flex gap-2'>
							<Skeleton className='h-10 w-32' />
							<Skeleton className='h-10 w-32' />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className='rounded-md border border-border overflow-hidden'>
						<Table>
							<TableHeader>
								<TableRow className='bg-muted/50'>
									<TableHead>
										<Skeleton className='h-5 w-32' />
									</TableHead>
									{skeletonColumns.map((col) => (
										<TableHead
											key={col}
											className='text-center'
										>
											<Skeleton className='h-5 w-24 mx-auto' />
										</TableHead>
									))}
									<TableHead className='text-center'>
										<Skeleton className='h-5 w-24 mx-auto' />
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{skeletonRows.map((row) => (
									<TableRow
										key={row}
										className='hover:bg-muted/30'
									>
										<TableCell>
											<Skeleton className='h-5 w-40' />
										</TableCell>
										{skeletonColumns.map((col) => (
											<TableCell
												key={col}
												className='text-center'
											>
												<Skeleton className='h-8 w-16 mx-auto' />
											</TableCell>
										))}
										<TableCell className='text-center'>
											<Skeleton className='h-6 w-12 mx-auto rounded-full' />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}
