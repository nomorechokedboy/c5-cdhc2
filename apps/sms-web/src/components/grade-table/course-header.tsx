import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { CalendarDays, Users, BookOpen } from 'lucide-react'
import type { Course } from '@/types'
import { formatDate } from '@/lib/utils'

interface CourseHeaderProps {
	course: Course
	studentCount: number
}

export default function CourseHeader({
	course,
	studentCount
}: CourseHeaderProps) {
	return (
		<Card className='border-border sticky top-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-20'>
			<CardHeader className='pb-4'>
				<div className='flex items-start justify-between'>
					<div className='space-y-2'>
						<CardTitle className='text-2xl font-bold text-foreground flex items-center gap-2'>
							<BookOpen className='h-6 w-6 text-primary' />
							{course.title}
						</CardTitle>
						<CardDescription className='text-muted-foreground text-base leading-relaxed'>
							{course.description}
						</CardDescription>
					</div>
					<Badge
						variant='secondary'
						className='text-sm bg-blue-500 text-white dark:bg-blue-600 font-bold'
					>
						<Users className='h-4 w-4 mr-1' />
						{studentCount} Học viên
					</Badge>
				</div>
			</CardHeader>
			<CardContent>
				<div className='flex items-center gap-6 text-sm text-muted-foreground'>
					<div className='flex items-center gap-2'>
						<CalendarDays className='h-4 w-4' />
						<span>
							Ngày bắt đầu:{' '}
							{course.startDate === 0
								? 'Chưa có'
								: formatDate(course.startDate)}
						</span>
					</div>
					<div className='flex items-center gap-2'>
						<CalendarDays className='h-4 w-4' />
						<span>
							Ngày kết thúc:{' '}
							{course.endDate === 0
								? 'Chưa có'
								: formatDate(course.endDate)}
						</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
