import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'

interface Course {
	id: number
	title: string
	code: string
	description: string
	instructor: string
	students: number
	semester: string
	status: string
	color: string
	schedule: string
	room: string
	credits: number
	assignments: any[]
	grades: {
		average: number
		distribution: Record<string, number>
	}
}

interface CourseCardProps {
	course: Course
}

export default function CourseCard({ course }: CourseCardProps) {
	return (
		<Card className='hover:shadow-lg transition-shadow cursor-pointer flex flex-col h-full'>
			<CardHeader>
				<div className='flex items-start justify-between'>
					<div className='flex items-center gap-3'>
						<div
							className={`w-3 h-3 rounded-full ${course.color}`}
						/>
						<div>
							<CardTitle className='text-lg'>
								{course.title}
							</CardTitle>
							<CardDescription className='font-mono text-sm'>
								{course.code}
							</CardDescription>
						</div>
					</div>
					<Badge
						variant={
							course.status === 'Active' ? 'default' : 'secondary'
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

				<div className='flex gap-2 mt-4'>
					<Button
						size='sm'
						className='flex-1'
						onClick={() => console.log('HI')}
					>
						View Details
					</Button>
					<Button
						size='sm'
						variant='outline'
						className='flex-1 bg-transparent'
						onClick={() => console.log('HI')}
					>
						Manage
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
