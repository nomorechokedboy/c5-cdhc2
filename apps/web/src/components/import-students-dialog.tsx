import {
	AlertCircle,
	ArrowRight,
	CheckCircle,
	Upload,
	Users,
	X
} from 'lucide-react'
import { FileDropzone } from './import-students/FileDropzone'
import { ImportInstructions } from './import-students/ImportInstructions'
import { ImportPreview } from './import-students/ImportPreview'
import { ImportResultSummary } from './import-students/ImportResultSummary'
import { TemplateCard } from './import-students/TemplateCard'
import { useStudentImport } from './import-students/useStudentImport'

export interface ImportStudentsDialogProps {
	isOpen: boolean
	onClose: () => void
	onSuccess?: (results: {
		successCount: number
		errorCount: number
		totalCount: number
		errors: { row: number; message: string }[]
	}) => void
}

export function ImportStudentsDialog({
	isOpen,
	onClose,
	onSuccess
}: ImportStudentsDialogProps) {
	const imp = useStudentImport(onSuccess)

	if (!isOpen) return null

	const importing = imp.status === 'importing'
	const busy = importing || imp.status === 'reading'
	const done = imp.status === 'done'

	const handleClose = () => {
		imp.reset()
		onClose()
	}

	return (
		<div className=' flex items-center justify-center z-50 p-4'>
			<div className='bg-white rounded-xl w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl'>
				<div className='flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-xl'>
					<div className='flex items-center space-x-3'>
						<Users className='h-6 w-6' />
						<h2 className='text-xl font-semibold'>
							Import danh sách học viên
						</h2>
					</div>
					<button
						type='button'
						onClick={handleClose}
						aria-label='Đóng'
						className='text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20'
					>
						<X className='h-5 w-5' />
					</button>
				</div>

				<div className='p-6 space-y-6'>
					<ImportInstructions />
					<TemplateCard
						onDownload={imp.downloadTemplate}
						disabled={imp.unitsLoading}
					/>
					<FileDropzone
						file={imp.file}
						onSelect={imp.selectFile}
						disabled={busy}
					/>

					{imp.status === 'reading' && (
						<div className='text-sm text-blue-700'>
							Đang đọc file...
						</div>
					)}

					{imp.status === 'error' && imp.message && (
						<div className='flex items-center space-x-2 p-3 rounded-lg bg-red-50 text-red-700 border border-red-200'>
							<AlertCircle className='h-5 w-5 flex-shrink-0' />
							<span>{imp.message}</span>
						</div>
					)}

					{done && imp.result && (
						<>
							<div className='flex items-center space-x-2 p-3 rounded-lg bg-green-50 text-green-700 border border-green-200'>
								<CheckCircle className='h-5 w-5 flex-shrink-0' />
								<span>
									Import hoàn tất! Đã thêm{' '}
									{imp.result.created}/{imp.result.total} học
									viên
								</span>
							</div>
							<ImportResultSummary result={imp.result} />
						</>
					)}

					{!done && imp.rows.length > 0 && (
						<ImportPreview
							rows={imp.rows}
							validCount={imp.validCount}
							invalidCount={imp.invalidCount}
							defaultUnitId={imp.defaultUnitId}
							onDefaultUnitChange={imp.setDefaultUnitId}
							onRowUnitChange={imp.setRowUnit}
							disabled={busy}
						/>
					)}
				</div>

				<div className='flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl'>
					<button
						type='button'
						onClick={handleClose}
						className='px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors'
					>
						{done ? 'Đóng' : 'Hủy'}
					</button>

					{!done && (
						<button
							type='button'
							onClick={imp.importValid}
							disabled={
								imp.validCount === 0 || busy || imp.unitsLoading
							}
							className='flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
						>
							{importing ? (
								<>
									<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white' />
									<span>Đang import...</span>
								</>
							) : (
								<>
									<Upload className='h-4 w-4' />
									<span>
										{imp.validCount > 0
											? `Import ${imp.validCount} học viên`
											: 'Import danh sách'}
									</span>
									<ArrowRight className='h-4 w-4' />
								</>
							)}
						</button>
					)}
				</div>
			</div>
		</div>
	)
}
