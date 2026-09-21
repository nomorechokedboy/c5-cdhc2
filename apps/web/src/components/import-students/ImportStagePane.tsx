import { AlertCircle, CheckCircle } from 'lucide-react'
import { FileDropzone } from './FileDropzone'
import { ImportPreview } from './ImportPreview'
import { ImportResultSummary } from './ImportResultSummary'
import { StageIntro } from './StageIntro'
import { TemplateCard } from './TemplateCard'
import { STAGE_HINTS, type ImportStage } from './stage'
import type { useStudentImport } from './useStudentImport'

type StudentImport = ReturnType<typeof useStudentImport>

/** Nội dung tờ giấy theo chặng hiện tại */
export function ImportStagePane({
	stage,
	imp
}: {
	stage: ImportStage
	imp: StudentImport
}) {
	const busy = imp.status === 'importing' || imp.status === 'reading'

	if (stage === 0) {
		return (
			<div className='space-y-5'>
				<StageIntro title='Tải file mẫu' hint={STAGE_HINTS[0]} />
				<TemplateCard
					onDownload={imp.downloadTemplate}
					disabled={imp.unitsLoading}
				/>
			</div>
		)
	}

	if (stage === 1) {
		return (
			<div className='space-y-5'>
				<StageIntro title='Chọn file để import' hint={STAGE_HINTS[1]} />
				<FileDropzone
					file={imp.file}
					onSelect={imp.selectFile}
					disabled={busy}
				/>
				{imp.status === 'reading' && (
					<div role='status' className='text-sm text-info'>
						Đang đọc file...
					</div>
				)}
				{imp.status === 'error' && imp.message && (
					<ErrorNote message={imp.message} />
				)}
			</div>
		)
	}

	if (stage === 2) {
		return (
			<div className='space-y-4'>
				<StageIntro title='Kiểm tra dữ liệu' hint={STAGE_HINTS[2]} />
				{imp.status === 'error' && imp.message && (
					<ErrorNote message={imp.message} />
				)}
				<ImportPreview
					rows={imp.rows}
					validCount={imp.validCount}
					invalidCount={imp.invalidCount}
					defaultUnitId={imp.defaultUnitId}
					onDefaultUnitChange={imp.setDefaultUnitId}
					onRowUnitChange={imp.setRowUnit}
					disabled={busy}
				/>
			</div>
		)
	}

	if (imp.status === 'done' && imp.result) {
		return (
			<div className='space-y-5'>
				<div className='flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-success'>
					<CheckCircle className='size-5 shrink-0' />
					<span>
						Import hoàn tất! Đã thêm {imp.result.created}/
						{imp.result.total} học viên
					</span>
				</div>
				<ImportResultSummary result={imp.result} />
			</div>
		)
	}

	return (
		<div role='status' className='space-y-2 py-10 text-center'>
			<p className='font-display text-xl tracking-wide'>
				Đang ghi vào hệ thống
			</p>
			<p className='text-sm text-muted-foreground'>
				Chưa xong thì chưa có học viên nào được thêm.
			</p>
		</div>
	)
}

function ErrorNote({ message }: { message: string }) {
	return (
		<div className='flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive'>
			<AlertCircle className='size-5 shrink-0' />
			<span>{message}</span>
		</div>
	)
}
