import { ArrowRight, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { ImportStage } from './stage'

interface ImportFooterProps {
	stage: ImportStage
	done: boolean
	importing: boolean
	validCount: number
	/** Đang đọc file/đang import hoặc chưa tải xong danh sách lớp */
	blocked: boolean
	onBack: () => void
	onNext: () => void
	onCancel: () => void
	onImport: () => void
	/** Bỏ file hiện tại, quay về chọn file mới */
	onPickAnother: () => void
}

/** Thanh thao tác ở đáy, đổi theo chặng */
export function ImportFooter({
	stage,
	done,
	importing,
	validCount,
	blocked,
	onBack,
	onNext,
	onCancel,
	onImport,
	onPickAnother
}: ImportFooterProps) {
	return (
		<div className='flex flex-wrap justify-end gap-2'>
			{stage === 1 && (
				<Button type='button' variant='outline' onClick={onBack}>
					Quay lại
				</Button>
			)}
			{stage === 2 && (
				<Button
					type='button'
					variant='outline'
					onClick={onPickAnother}
					disabled={blocked}
				>
					Chọn file khác
				</Button>
			)}
			{done && (
				<Button type='button' variant='outline' onClick={onPickAnother}>
					Import file khác
				</Button>
			)}

			<Button type='button' variant='outline' onClick={onCancel}>
				{done ? 'Đóng' : 'Hủy'}
			</Button>

			{stage === 0 && (
				<Button type='button' onClick={onNext}>
					Tiếp theo
					<ArrowRight className='size-4' />
				</Button>
			)}
			{(stage === 2 || importing) && (
				<Button
					type='button'
					onClick={onImport}
					disabled={validCount === 0 || blocked}
				>
					{importing ? (
						<>
							<div className='size-4 animate-spin rounded-full border-b-2 border-current' />
							<span>Đang import...</span>
						</>
					) : (
						<>
							<Upload className='size-4' />
							<span>
								{validCount > 0
									? `Import ${validCount} học viên`
									: 'Import danh sách'}
							</span>
							<ArrowRight className='size-4' />
						</>
					)}
				</Button>
			)}
		</div>
	)
}
