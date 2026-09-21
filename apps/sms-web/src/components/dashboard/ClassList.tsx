import { Card, CardContent } from '@repo/ui/components/ui/card'
import { ClassBook, type ClassCategory } from './ClassBook'

/** Lưới các lớp, kèm khung chờ khi đang tải và dòng thông báo khi không có lớp nào. */
export function ClassList({
	categories,
	isLoading,
	emptyText,
	skeletonCount = 6
}: {
	categories: ClassCategory[]
	isLoading: boolean
	emptyText: string
	skeletonCount?: number
}) {
	if (isLoading) {
		return (
			<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
				{Array.from({ length: skeletonCount }).map((_, i) => (
					<Card
						key={i}
						className='border-l-muted h-[5.5rem] animate-pulse border-l-[6px]'
					/>
				))}
			</div>
		)
	}

	if (categories.length === 0) {
		return (
			<Card className='border-dashed'>
				<CardContent className='text-muted-foreground text-center'>
					{emptyText}
				</CardContent>
			</Card>
		)
	}

	return (
		<div className='grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
			{categories.map((cat) => (
				<ClassBook key={cat.id} category={cat} />
			))}
		</div>
	)
}
