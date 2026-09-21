import { Card } from '@repo/ui/components/ui/card'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

export interface Course {
	id: number
	title: string
	code: string
	description: string
	students: number
	semester: string
	status: string
	room: string
	credits: number
	isActive: boolean
}

export interface CourseCardProps {
	course: Course
}

/** Một môn trong danh sách của lớp: gáy sổ đổi màu theo trạng thái, mã môn viết dưới tên. */
export default function CourseCard({ course }: CourseCardProps) {
	const { t } = useTranslation()

	return (
		<Card
			className={cn(
				'hover:border-brass h-full cursor-pointer gap-3 border-l-[6px] px-5 py-4 transition-colors',
				course.isActive
					? 'border-l-primary hover:border-l-brass'
					: 'border-l-muted-foreground/40 hover:border-l-brass'
			)}
		>
			<div className='flex items-start justify-between gap-3'>
				<div className='min-w-0'>
					<h3 className='font-serif text-lg leading-snug font-semibold'>
						{course.title}
					</h3>
					<p className='text-muted-foreground font-mono text-sm'>
						{course.code}
					</p>
				</div>
				<span
					className={cn(
						'shrink-0 rounded-sm border px-2 py-0.5 text-xs font-semibold',
						course.isActive
							? 'border-success/50 bg-success/10 text-success'
							: 'border-border text-muted-foreground'
					)}
				>
					{course.status}
				</span>
			</div>

			{course.description && (
				<p className='text-muted-foreground line-clamp-3 flex-1 text-sm leading-relaxed'>
					{course.description}
				</p>
			)}

			{(course.students > 0 || course.semester) && (
				<p className='text-muted-foreground border-rule border-t pt-3 text-sm'>
					{[
						course.students > 0 &&
							t('course.students', { count: course.students }),
						course.semester
					]
						.filter(Boolean)
						.join(' · ')}
				</p>
			)}
		</Card>
	)
}
