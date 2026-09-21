import { Card } from '@repo/ui/components/ui/card'
import type { Course, StudentGradesSummary } from '@/types'
import { formatDate } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { Score } from '@/components/score'

interface StudentCourseCardProps {
	course: Course
	grades: StudentGradesSummary
	onClick: () => void
}

/** Một môn như một trang sổ: tên và giảng viên bên trái, điểm tổng kết viết bên phải. */
export default function StudentCourseCard({
	course,
	grades,
	onClick
}: StudentCourseCardProps) {
	const { t } = useTranslation()
	const hasDates = course.startDate !== 0 || course.endDate !== 0

	return (
		<Card
			role='button'
			tabIndex={0}
			onClick={onClick}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onClick()
				}
			}}
			className='hover:border-brass focus-visible:ring-ring/60 cursor-pointer flex-row items-stretch justify-between gap-4 px-6 py-5 transition-colors outline-none focus-visible:ring-[3px]'
		>
			<div className='min-w-0 space-y-1.5'>
				<h3 className='font-serif text-lg leading-snug font-semibold'>
					{course.title}
				</h3>
				<p className='text-muted-foreground text-sm'>
					{course.teachers && course.teachers.length > 0
						? course.teachers
								.map((teacher) => teacher.fullName)
								.join(', ')
						: t('course.noTeacher')}
				</p>
				{course.description && (
					<p className='text-muted-foreground line-clamp-2 text-sm'>
						{course.description}
					</p>
				)}
				{hasDates && (
					<p className='text-muted-foreground text-sm'>
						{course.startDate === 0
							? t('course.noDate')
							: formatDate(course.startDate)}
						{' - '}
						{course.endDate === 0
							? t('course.noDate')
							: formatDate(course.endDate)}
					</p>
				)}
			</div>
			<div className='border-rule flex shrink-0 flex-col items-center justify-center gap-2 border-l pl-5'>
				<Score value={grades.finalScore} className='text-3xl' />
				<span className='text-muted-foreground text-center text-xs leading-tight'>
					{t('course.finalGrade')}
				</span>
			</div>
		</Card>
	)
}
