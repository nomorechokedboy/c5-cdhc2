import {
	AlertCircle,
	ArrowRight,
	CheckCircle,
	Upload,
	Users,
	X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
			<div className='bg-card rounded-xl border w-[90vw] max-w-6xl max-h-[90vh] overflow-y-auto shadow-lg'>
				<div className='flex items-center justify-between p-6 border-b border-sidebar-border bg-sidebar text-sidebar-foreground rounded-t-xl'>
					<div className='flex items-center space-x-3'>
						<Users className='h-6 w-6 text-gold' />
						<h2 className='font-display text-2xl font-semibold tracking-wide'>
							Import danh sách học viên
						</h2>
					</div>
					<button
						type='button'
						onClick={handleClose}
						aria-label='Đóng'
						className='cursor-pointer rounded-full p-1.5 text-sidebar-foreground/80 outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-ring'
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
						<div className='text-sm text-info'>
							Đang đọc file...
						</div>
					)}

					{imp.status === 'error' && imp.message && (
						<div className='flex items-center space-x-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/30'>
							<AlertCircle className='h-5 w-5 flex-shrink-0' />
							<span>{imp.message}</span>
						</div>
					)}

					{done && imp.result && (
						<>
							<div className='flex items-center space-x-2 p-3 rounded-lg bg-success/10 text-success border border-success/30'>
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

				<div className='flex items-center justify-end space-x-3 p-6 border-t border-border bg-muted/40 rounded-b-xl'>
					<Button
						type='button'
						variant='outline'
						onClick={handleClose}
					>
						{done ? 'Đóng' : 'Hủy'}
					</Button>

					{!done && (
						<Button
							type='button'
							onClick={imp.importValid}
							disabled={
								imp.validCount === 0 || busy || imp.unitsLoading
							}
						>
							{importing ? (
								<>
									<div className='animate-spin rounded-full h-4 w-4 border-b-2 border-current' />
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
						</Button>
					)}
				</div>
			</div>
		</div>
	)
}
