import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import UnitSelect from '@/components/unit-select'

interface PreviewBarProps {
	validCount: number
	invalidCount: number
	onlyInvalid: boolean
	onOnlyInvalidChange: (value: boolean) => void
	/** Có dòng để trống lớp: hiện ô chọn lớp mặc định */
	showDefaultUnit: boolean
	defaultUnitId?: number
	onDefaultUnitChange: (id: number | undefined) => void
	disabled?: boolean
}

/** Thanh đếm «n hợp lệ / m lỗi» dính ở đầu tờ giấy khi cuộn bảng xem trước */
export function PreviewBar({
	validCount,
	invalidCount,
	onlyInvalid,
	onOnlyInvalidChange,
	showDefaultUnit,
	defaultUnitId,
	onDefaultUnitChange,
	disabled
}: PreviewBarProps) {
	return (
		<div className='sticky top-0 z-10 -mx-6 flex flex-wrap items-center justify-between gap-3 border-b bg-card/95 px-6 py-3 backdrop-blur'>
			<div className='flex flex-wrap items-center gap-4 text-sm'>
				<span className='flex items-center gap-1.5 font-medium text-success'>
					<CheckCircle2 className='size-4' />
					{validCount} dòng hợp lệ
				</span>
				<span className='flex items-center gap-1.5 font-medium text-destructive'>
					<AlertTriangle className='size-4' />
					{invalidCount} dòng lỗi
				</span>
				{invalidCount > 0 && (
					<label className='flex cursor-pointer items-center gap-1.5 text-muted-foreground'>
						<input
							type='checkbox'
							checked={onlyInvalid}
							onChange={(e) =>
								onOnlyInvalidChange(e.target.checked)
							}
						/>
						Chỉ hiện dòng lỗi
					</label>
				)}
			</div>

			{showDefaultUnit && (
				<div className='flex items-center gap-2 text-sm'>
					<span className='whitespace-nowrap text-muted-foreground'>
						Lớp cho các dòng chưa có lớp:
					</span>
					<UnitSelect
						compact
						className='w-64'
						value={defaultUnitId}
						onChange={(id) => onDefaultUnitChange(id)}
						disabled={disabled}
					/>
				</div>
			)}
		</div>
	)
}
