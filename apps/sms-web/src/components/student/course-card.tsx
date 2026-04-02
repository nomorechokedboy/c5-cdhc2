import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import type { Course, StudentGradesSummary } from '@/types'
import { formatDate, getGradeColor } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface StudentCourseCardProps {
	course: Course
	grades: StudentGradesSummary
	onClick: () => void
}

export default function StudentCourseCard({
	course,
	grades,
	onClick
}: StudentCourseCardProps) {
	const { t } = useTranslation()

	return (
		<Card
			onClick={onClick}
			className='cursor-pointer transition-all hover:shadow-lg hover:border-primary'
		>
			<CardHeader>
				<div className='space-y-2'>
					<CardTitle className='text-lg text-foreground'>
						{course.title}
					</CardTitle>
					<CardDescription className='text-sm text-muted-foreground'>
						{course.teachers && course.teachers.length > 0
							? course.teachers
									.map((teacher) => teacher.fullName)
									.join(', ')
							: t('course.noTeacher')}
					</CardDescription>
				</div>
			</CardHeader>
			<CardContent className='space-y-4'>
				<p className='text-sm text-muted-foreground line-clamp-2'>
					{course.description}
				</p>

				<div className='flex items-center justify-between text-sm'>
					<span className='text-muted-foreground'>
						{course.startDate === 0
							? t('course.noDate')
							: formatDate(course.startDate)}
						{' - '}
						{course.endDate === 0
							? t('course.noDate')
							: formatDate(course.endDate)}
					</span>
				</div>

				<div className='flex items-center justify-between pt-4 border-t border-border'>
					<span className='text-sm font-medium text-muted-foreground'>
						{t('course.finalGrade')}
					</span>
					<Badge
						className={`${getGradeColor(grades.finalScore)} font-semibold`}
					>
						{grades.finalScore.toFixed(2)}
					</Badge>
				</div>
			</CardContent>
		</Card>
	)
}
