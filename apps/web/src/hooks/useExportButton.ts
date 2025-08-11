import { ExportTableData } from '@/api'
import type { ExportData } from '@/types'
import { toast } from 'sonner'

export type ExportConfig = {
	filename?: string
}

export default function useExportButton({
	filename = 'my-file'
}: ExportConfig) {
	async function handleExport(data: ExportData) {
		try {
			const resp = await ExportTableData(data)
			const blob = new Blob([resp.data], {
				type: resp.headers['content-type']
			})

			const link = document.createElement('a')
			link.href = window.URL.createObjectURL(blob)
			link.download = `${filename}.docx`

			document.body.appendChild(link)
			link.click()

			document.body.removeChild(link)
			window.URL.revokeObjectURL(link.href)
		} catch (err) {
			toast.error('Chưa thể xuất file, đã có lỗi xảy ra!')
		}
	}

	return {
		hidden: false,
		onExport: handleExport
	}
}
