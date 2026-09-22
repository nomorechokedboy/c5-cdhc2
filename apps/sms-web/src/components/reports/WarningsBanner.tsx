import { TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type {
	ReportCourse,
	ReportWarning,
	UnassignedCourse
} from '@/lib/report/types'

interface WarningsBannerProps {
	warnings: ReportWarning[]
	courses: ReportCourse[]
	unassigned?: UnassignedCourse[]
}

export function WarningsBanner({
	warnings,
	courses,
	unassigned = []
}: WarningsBannerProps) {
	const { t } = useTranslation()
	if (warnings.length === 0 && unassigned.length === 0) return null

	const courseName = (id?: number) =>
		courses.find((c) => c.id === id)?.shortname ?? `#${id}`

	return (
		<div
			role='status'
			className='border-warning/50 bg-warning/10 space-y-1 rounded-lg border p-4 text-sm'
		>
			<p className='flex items-center gap-2 font-medium'>
				<TriangleAlert className='text-warning h-4 w-4' />
				{t('report.warning.title')}
			</p>
			<ul className='list-disc space-y-1 pl-6'>
				{warnings.map((w, i) => (
					<li key={`${w.code}-${w.courseId ?? i}`}>
						{t(`report.warning.${w.code}`, {
							course: courseName(w.courseId)
						})}
					</li>
				))}
				{unassigned.length > 0 && (
					<li>
						{t('report.unassigned', {
							count: unassigned.length,
							fields: [
								...new Set(unassigned.flatMap((u) => u.missing))
							].join(', '),
							courses: unassigned
								.map((u) => u.shortname)
								.join(', ')
						})}
					</li>
				)}
			</ul>
		</div>
	)
}
