import { useState } from 'react'
import { FileDown, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'
import { exportReport } from '@/lib/report/export/workbook'
import type { SemesterReport, YearReport } from '@/lib/report/types'

export function ReportExportButton({
	report
}: {
	report: SemesterReport | YearReport
}) {
	const { t } = useTranslation()
	const [busy, setBusy] = useState(false)

	const onClick = async () => {
		setBusy(true)
		try {
			await exportReport(report)
			toast.success(t('report.export.success'))
		} catch (err) {
			console.error(err)
			toast.error(t('report.export.error'))
		} finally {
			setBusy(false)
		}
	}

	return (
		<Button variant='outline' onClick={onClick} disabled={busy}>
			{busy ? <Loader2 className='animate-spin' /> : <FileDown />}
			{busy ? t('report.export.exporting') : t('report.export.button')}
		</Button>
	)
}
