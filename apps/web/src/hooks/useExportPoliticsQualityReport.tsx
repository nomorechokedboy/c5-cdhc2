import { ExportPoliticsQualityData } from '@/api'
import type { ExportPoliticsQualityReport } from '@/types'
import { toast } from 'sonner'

export type ExportConfig = {
	filename?: string
}

export default function useExportPoliticsQualityReport({
	filename = 'my-file'
}: ExportConfig) {
	async function handleExport(data: ExportPoliticsQualityReport) {
		try {
			const resp = await ExportPoliticsQualityData(data)
			const blob = await resp.blob(),
				contentType =
					resp.headers.get('content-type') ??
					'application/octet-stream'
			const fileBlob = new Blob([blob], {
				type: contentType
			})

			const link = document.createElement('a')
			link.href = window.URL.createObjectURL(fileBlob)
			link.download = `${filename}.xlsx`

			document.body.appendChild(link)
			link.click()

			document.body.removeChild(link)
			window.URL.revokeObjectURL(link.href)
		} catch (err) {
			console.error('handleExport error', err)

			toast.error('Chưa thể xuất file, đã có lỗi xảy ra!')
		}
	}

	return {
		hidden: false,
		onExport: handleExport
	}
}
