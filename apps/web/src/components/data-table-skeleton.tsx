import { Skeleton } from '@/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'

interface DataTableSkeletonProps {
	columns?: number
	rows?: number
	showActions?: boolean
	className?: string
}

export default function DataTableSkeleton({
	columns = 4,
	rows = 8,
	showActions = true,
	className
}: DataTableSkeletonProps) {
	return (
		<div className={className}>
			<Table>
				<TableHeader>
					<TableRow>
						{/* Generate skeleton headers */}
						{Array.from({ length: columns }).map((_, index) => (
							<TableHead key={index}>
								<Skeleton className='h-4 w-20' />
							</TableHead>
						))}
						{/* Actions column */}
						{showActions && (
							<TableHead className='w-[100px]'>
								<Skeleton className='h-4 w-16' />
							</TableHead>
						)}
					</TableRow>
				</TableHeader>
				<TableBody>
					{/* Generate skeleton rows */}
					{Array.from({ length: rows }).map((_, rowIndex) => (
						<TableRow key={rowIndex}>
							{Array.from({ length: columns }).map(
								(_, colIndex) => (
									<TableCell key={colIndex}>
										<Skeleton
											className='h-4'
											style={{
												width: `${Math.floor(Math.random() * 40) + 60}%`
											}}
										/>
									</TableCell>
								)
							)}
							{/* Actions column with button skeletons */}
							{showActions && (
								<TableCell>
									<div className='flex items-center gap-2'>
										<Skeleton className='h-8 w-8 rounded' />
										<Skeleton className='h-8 w-8 rounded' />
									</div>
								</TableCell>
							)}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
