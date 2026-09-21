import { useState } from 'react'
import { FileText } from 'lucide-react'
import { ImportCard } from './import-students/ImportCard'
import { ImportFooter } from './import-students/ImportFooter'
import { ImportStagePane } from './import-students/ImportStagePane'
import {
	IMPORT_STEPS,
	importStage,
	passedStages
} from './import-students/stage'
import { useStudentImport } from './import-students/useStudentImport'
import { RECORD_TITLE_CLASS, RecordMain, SlideIn } from './student-record'

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

/**
 * Import học viên cùng khung với hồ sơ học viên: phiếu nhập bên trái, bốn chặng
 * (tải mẫu → chọn file → kiểm tra → import) trên giấy điện tim bên phải.
 */
export function ImportStudentsDialog({
	isOpen,
	onClose,
	onSuccess
}: ImportStudentsDialogProps) {
	const imp = useStudentImport(onSuccess)
	// Chặng người dùng tự mở trước khi có file: 0 = tải mẫu, 1 = chọn file
	const [pane, setPane] = useState<0 | 1>(0)

	if (!isOpen) return null

	const stage = importStage(imp.status, imp.rows.length, pane)
	const importing = imp.status === 'importing'
	const done = imp.status === 'done'

	const handleClose = () => {
		imp.reset()
		setPane(0)
		onClose()
	}
	const pickAnother = (to: 0 | 1) => () => {
		imp.reset()
		setPane(to)
	}

	return (
		<div className='p-4'>
			<div className='mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-card shadow-lg lg:grid lg:h-[calc(100dvh-7rem)] lg:grid-cols-[17rem_minmax(0,1fr)]'>
				<ImportCard
					file={imp.file}
					total={imp.rows.length}
					validCount={imp.validCount}
					invalidCount={imp.invalidCount}
					stamped={done}
				/>
				<RecordMain
					title={
						<h2 className={RECORD_TITLE_CLASS}>
							<FileText className='mr-2 -mt-1 inline size-6 text-gold' />
							Import danh sách học viên
						</h2>
					}
					steps={IMPORT_STEPS}
					currentStep={stage}
					completedSteps={passedStages(stage)}
					// Đã có file thì không lùi bằng dải mạch (mất bảng đang sửa); dùng «Chọn file khác»
					onStepClick={(i) => {
						if (stage < 2 && i < 2) setPane(i as 0 | 1)
					}}
					footer={
						<ImportFooter
							stage={stage}
							done={done}
							importing={importing}
							validCount={imp.validCount}
							blocked={
								importing ||
								imp.status === 'reading' ||
								imp.unitsLoading
							}
							onBack={() => setPane(0)}
							onNext={() => setPane(1)}
							onCancel={handleClose}
							onImport={imp.importValid}
							onPickAnother={pickAnother(done ? 0 : 1)}
						/>
					}
				>
					{(direction) => (
						<SlideIn step={stage} direction={direction}>
							<ImportStagePane stage={stage} imp={imp} />
						</SlideIn>
					)}
				</RecordMain>
			</div>
		</div>
	)
}
