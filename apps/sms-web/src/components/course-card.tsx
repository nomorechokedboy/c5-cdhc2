import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'

export interface Course {
	id: number
	title: string
	code: string
	description: string
	students: number
	semester: string
	status: string
	color: string
	room: string
	credits: number
	isActive: boolean
}

export interface CourseCardProps {
	course: Course
}

export default function CourseCard({ course }: CourseCardProps) {
	return (
		<Card className='hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full'>
			<CardHeader>
				<div className='flex items-start justify-between'>
					<div className='flex items-center gap-3'>
						<div className='flex-shrink-0'>
							<div
								className={`w-3 h-3 rounded-full  ${course.color}`}
							/>
						</div>
						<div className='flex-1'>
							<CardTitle className='text-lg'>
								{course.title}
							</CardTitle>
							<CardDescription className='font-mono text-sm'>
								{course.code}
							</CardDescription>
						</div>
					</div>
					<Badge
						className={`${course.isActive == true ? 'bg-green-500' : ''} font-bold`}
						variant={
							course.isActive === false
								? 'destructive'
								: 'default'
						}
					>
						{course.status}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className='flex-1 flex flex-col'>
				<p className='text-sm text-muted-foreground mb-4 leading-relaxed flex-1'>
					{course.description}
				</p>

				<div className='space-y-2 text-sm'>
					<div className='flex items-center justify-between'>
						<span className='text-muted-foreground'>Students:</span>
						<span className='font-medium'>{course.students}</span>
					</div>
					<div className='flex items-center justify-between'>
						<span className='text-muted-foreground'>Semester:</span>
						<span className='font-medium'>{course.semester}</span>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
