import { Button } from '@/components/ui/button'
import type { UnitPoliticsQualitySummary } from '@/types'
import { Download } from 'lucide-react'

export interface ExportButtonProps {
	data: UnitPoliticsQualitySummary[]
}

export function ExportButton({ data }: ExportButtonProps) {
	const handleExport = () => {}

	return (
		<Button onClick={handleExport} className='flex items-center gap-2'>
			<Download className='h-4 w-4' />
			Xuất file Excel (.xlsx)
		</Button>
	)
}
