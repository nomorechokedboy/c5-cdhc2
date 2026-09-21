import { useState } from 'react'
import { PreviewBar } from './PreviewBar'
import { PreviewTable } from './PreviewTable'
import type { EvaluatedRow } from './useStudentImport'

export interface ImportPreviewProps {
	rows: EvaluatedRow[]
	validCount: number
	invalidCount: number
	defaultUnitId?: number
	onDefaultUnitChange: (id: number | undefined) => void
	onRowUnitChange: (rowNumber: number, id: number | undefined) => void
	disabled?: boolean
}

/** Xem trước: thanh đếm dính ở đầu và sổ kẻ dòng, chọn lớp cho dòng thiếu/sai lớp */
export function ImportPreview({
	rows,
	validCount,
	invalidCount,
	defaultUnitId,
	onDefaultUnitChange,
	onRowUnitChange,
	disabled
}: ImportPreviewProps) {
	const [onlyInvalid, setOnlyInvalid] = useState(false)
	const shown = onlyInvalid ? rows.filter((r) => !r.valid) : rows

	return (
		<div>
			<PreviewBar
				validCount={validCount}
				invalidCount={invalidCount}
				onlyInvalid={onlyInvalid}
				onOnlyInvalidChange={setOnlyInvalid}
				showDefaultUnit={rows.some((r) => r.row.unitText === '')}
				defaultUnitId={defaultUnitId}
				onDefaultUnitChange={onDefaultUnitChange}
				disabled={disabled}
			/>
			<PreviewTable
				rows={shown}
				onRowUnitChange={onRowUnitChange}
				disabled={disabled}
			/>
		</div>
	)
}
