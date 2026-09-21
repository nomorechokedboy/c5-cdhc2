import type { Course } from '@/types'
import { formatDate } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface CourseHeaderProps {
	course: Course
	studentCount: number
}

/** Trang bìa của sổ điểm: tên môn viết to, ngày học ở dưới, sĩ số đóng khung bên phải. */
export default function CourseHeader({
	course,
	studentCount
}: CourseHeaderProps) {
	const { t } = useTranslation()
	const date = (ms: number) =>
		ms === 0 ? t('course.noDate') : formatDate(ms)

	return (
		<header className='border-foreground/70 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-b-2 pb-5'>
			<div className='max-w-3xl space-y-2'>
				<h1 className='text-3xl leading-tight font-semibold text-balance'>
					{course.title}
				</h1>
				{course.description && (
					<p className='text-muted-foreground text-base leading-relaxed'>
						{course.description}
					</p>
				)}
				<p className='text-muted-foreground text-sm'>
					{t('course.startDate')}: {date(course.startDate)}
					<span className='mx-3'>/</span>
					{t('course.endDate')}: {date(course.endDate)}
				</p>
			</div>
			<div className='border-brass rounded-sm border-2 px-4 py-2 text-center'>
				<p className='score text-2xl'>{studentCount}</p>
				<p className='text-muted-foreground text-sm'>
					{t('dashboard.teacher.students')}
				</p>
			</div>
		</header>
	)
}
