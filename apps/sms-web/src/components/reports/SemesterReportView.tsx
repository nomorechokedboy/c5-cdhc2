import { useTranslation } from 'react-i18next'
import { toast } from '@repo/ui/components/ui/sonner'
import { ReportExportButton } from './ReportExportButton'
import { ReportTable } from './ReportTable'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'
import { SummaryPanel } from './SummaryPanel'
import { useSaveConduct, useSemesterReport } from './useReport'
import { WarningsBanner } from './WarningsBanner'

interface SemesterReportViewProps {
	categoryId: number
	year: number
	semester: number
}

export function SemesterReportView({
	categoryId,
	year,
	semester
}: SemesterReportViewProps) {
	const { t } = useTranslation()
	const query = useSemesterReport(categoryId, year, semester)
	const save = useSaveConduct(categoryId)

	if (query.isLoading) return <ReportSkeleton />
	if (query.isError) {
		return (
			<ReportError
				message={query.error.message}
				onRetry={() => query.refetch()}
			/>
		)
	}
	const report = query.data
	if (!report || report.students.length === 0) {
		return <ReportEmpty message={t('report.states.empty')} />
	}

	const onSaveConduct = (studentId: number, score: number | null) =>
		save.mutate([{ studentId, year, semester, score }], {
			onSuccess: () => toast.success(t('report.conduct.saved')),
			onError: (err) =>
				toast.error(err.message || t('report.conduct.saveError'))
		})

	return (
		<div className='space-y-6'>
			<div className='flex justify-end'>
				<ReportExportButton report={report} />
			</div>
			<WarningsBanner
				warnings={report.warnings}
				courses={report.courses}
			/>
			<div className='bg-card rounded-lg border'>
				<ReportTable report={report} onSaveConduct={onSaveConduct} />
			</div>
			<SummaryPanel summary={report.summary} courses={report.courses} />
		</div>
	)
}
