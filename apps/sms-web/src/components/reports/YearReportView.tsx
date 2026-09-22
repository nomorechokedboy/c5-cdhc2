import { useTranslation } from 'react-i18next'
import { ReportExportButton } from './ReportExportButton'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'
import { SummaryPanel } from './SummaryPanel'
import { useYearReport } from './useReport'
import { WarningsBanner } from './WarningsBanner'
import { YearTable } from './YearTable'

export function YearReportView({
	categoryId,
	year
}: {
	categoryId: number
	year: number
}) {
	const { t } = useTranslation()
	const query = useYearReport(categoryId, year)

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

	return (
		<div className='space-y-6'>
			<div className='flex justify-end'>
				<ReportExportButton report={report} />
			</div>
			<WarningsBanner
				warnings={report.warnings}
				courses={report.periods.flatMap((p) => p.courses)}
			/>
			<div className='bg-card rounded-lg border'>
				<YearTable report={report} />
			</div>
			<SummaryPanel summary={report.summary} />
		</div>
	)
}
