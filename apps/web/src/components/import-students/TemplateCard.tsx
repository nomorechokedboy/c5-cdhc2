import { Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function TemplateCard({
	onDownload,
	disabled
}: {
	onDownload: () => void
	disabled?: boolean
}) {
	return (
		<div className='flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-4'>
			<div className='flex items-center gap-3'>
				<FileSpreadsheet className='size-9 text-success' />
				<div>
					<h3 className='font-medium text-foreground'>
						File mẫu Excel
					</h3>
					<p className='text-sm text-muted-foreground'>
						Có sẵn danh sách lớp để chọn, không phải gõ tay
					</p>
				</div>
			</div>
			<Button type='button' onClick={onDownload} disabled={disabled}>
				<Download className='size-4' />
				Tải xuống
			</Button>
		</div>
	)
}
