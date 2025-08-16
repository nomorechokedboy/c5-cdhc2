import {
	Card,
	CardHeader,
	CardTitle,
	CardFooter,
	CardDescription
} from '@/components/ui/card'
import type { Class } from '@/types'
import { EllipsisText } from '@/components/data-table/ellipsis-text'
import { Link } from '@tanstack/react-router'
import { toVNTz } from '@/lib/utils'

interface ClassCardProps {
	data: Class
	index: number
}

export default function ClassCard({ data, index }: ClassCardProps) {
	return (
		<Link
			to={`/classes/$classId`}
			params={(prev) => ({ ...prev, classId: data.id })}
		>
			<Card className='@container/card'>
				<CardHeader>
					<CardTitle className='text-2xl font-semibold tabular-nums @[250px]/card:text-3xl'>
						{data.name}
					</CardTitle>
					<CardDescription>
						<EllipsisText>{data.description}</EllipsisText>
					</CardDescription>
				</CardHeader>
				<CardFooter className='flex-col items-start gap-1.5 text-sm'>
					<div className='line-clamp-1 flex gap-2 font-medium'>
						Tổng số học viên: {data.studentCount}
					</div>
					<div className='text-muted-foreground'>
						Tạo ngày: {toVNTz(data.createdAt)}
					</div>
				</CardFooter>
			</Card>
		</Link>
	)
}
