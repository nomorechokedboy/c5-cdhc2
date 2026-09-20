import { useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import UnitSelect from '@/components/unit-select'
import { toDisplayDate } from '@/lib/student-dates'
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

/** Bảng xem trước: trạng thái từng dòng, chọn lớp cho dòng thiếu/sai lớp */
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
	const hasEmptyUnit = rows.some((r) => r.row.unitText === '')

	return (
		<div className='space-y-3'>
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div className='flex items-center gap-4 text-sm'>
					<span className='flex items-center gap-1 text-green-700'>
						<CheckCircle2 className='h-4 w-4' />
						{validCount} dòng hợp lệ
					</span>
					<span className='flex items-center gap-1 text-red-700'>
						<AlertTriangle className='h-4 w-4' />
						{invalidCount} dòng lỗi
					</span>
					{invalidCount > 0 && (
						<label className='flex items-center gap-1 text-gray-600'>
							<input
								type='checkbox'
								checked={onlyInvalid}
								onChange={(e) =>
									setOnlyInvalid(e.target.checked)
								}
							/>
							Chỉ hiện dòng lỗi
						</label>
					)}
				</div>

				{hasEmptyUnit && (
					<div className='flex items-center gap-2 text-sm'>
						<span className='text-gray-600 whitespace-nowrap'>
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

			<div className='max-h-96 overflow-auto rounded-lg border'>
				<table className='w-full text-sm'>
					<thead className='sticky top-0 bg-gray-50 text-left text-gray-600'>
						<tr>
							<th className='px-3 py-2 w-16'>Dòng</th>
							<th className='px-3 py-2'>Họ và tên</th>
							<th className='px-3 py-2 w-28'>Ngày sinh</th>
							<th className='px-3 py-2 w-72'>Lớp</th>
							<th className='px-3 py-2'>Kiểm tra</th>
						</tr>
					</thead>
					<tbody>
						{shown.map(({ row, unit, issues, valid }) => (
							<tr
								key={row.rowNumber}
								className={
									valid ? 'border-t' : 'border-t bg-red-50/60'
								}
							>
								<td className='px-3 py-2 text-gray-500'>
									{row.rowNumber}
								</td>
								<td className='px-3 py-2'>
									{String(row.values.fullName)}
								</td>
								<td className='px-3 py-2'>
									{toDisplayDate(String(row.values.dob))}
								</td>
								<td className='px-3 py-2'>
									<UnitSelect
										compact
										value={unit.unitId}
										onChange={(id) =>
											onRowUnitChange(row.rowNumber, id)
										}
										disabled={disabled}
									/>
								</td>
								<td className='px-3 py-2'>
									{issues.length === 0 ? (
										<span className='text-green-700'>
											Hợp lệ
										</span>
									) : (
										<ul className='space-y-0.5'>
											{issues.map((issue) => (
												<li
													key={`${issue.field}-${issue.level}`}
													className={
														issue.level === 'error'
															? 'text-red-700'
															: 'text-amber-600'
													}
												>
													{issue.message}
												</li>
											))}
										</ul>
									)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
