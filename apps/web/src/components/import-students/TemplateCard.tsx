import { Download, FileSpreadsheet } from 'lucide-react'

export function TemplateCard({
	onDownload,
	disabled
}: {
	onDownload: () => void
	disabled?: boolean
}) {
	return (
		<div className='border border-gray-200 rounded-lg p-4 flex items-center justify-between'>
			<div className='flex items-center space-x-3'>
				<FileSpreadsheet className='h-8 w-8 text-green-500' />
				<div>
					<h3 className='font-medium text-gray-900'>
						File mẫu Excel
					</h3>
					<p className='text-sm text-gray-500'>
						Tải xuống để có cấu trúc dữ liệu chính xác
					</p>
				</div>
			</div>
			<button
				type='button'
				onClick={onDownload}
				disabled={disabled}
				className='flex items-center space-x-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
			>
				<Download className='h-4 w-4' />
				<span>Tải xuống</span>
			</button>
		</div>
	)
}
