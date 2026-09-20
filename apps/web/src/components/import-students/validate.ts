import type { StudentBody } from '@/types'
import { isStoredDate } from '@/lib/student-dates'
import { DATE_KEYS, IMPORT_COLUMNS } from './columns'
import type { ImportRow } from './parse'
import type { UnitResolution } from './units'

export interface RowIssue {
	field: string
	message: string
	/** error chặn import dòng đó; warning chỉ nhắc */
	level: 'error' | 'warning'
}

const LABELS = Object.fromEntries(IMPORT_COLUMNS.map((c) => [c.key, c.header]))

const UNIT_PROBLEMS: Record<'empty' | 'notFound' | 'ambiguous', string> = {
	empty: 'Chưa chọn lớp',
	notFound: 'Không tìm thấy lớp trong hệ thống',
	ambiguous: 'Tên lớp trùng ở nhiều đại đội, hãy chọn lại'
}

/** Kiểm tra một dòng; `unit` là kết quả đã xét cả lựa chọn thủ công của người dùng */
export function validateRow(row: ImportRow, unit: UnitResolution): RowIssue[] {
	const issues: RowIssue[] = []
	const text = (key: string) => String(row.values[key] ?? '').trim()
	const error = (field: string, message: string) =>
		issues.push({ field, message, level: 'error' })

	if (!text('fullName')) error('fullName', 'Thiếu họ và tên')

	if (!text('dob')) error('dob', 'Thiếu ngày sinh')

	for (const key of DATE_KEYS) {
		const value = text(key)
		if (value && !isStoredDate(value)) {
			error(key, `${LABELS[key]} không hợp lệ (cần dd/mm/yyyy)`)
		}
	}

	if (unit.problem) error('unitId', UNIT_PROBLEMS[unit.problem])

	for (const key of ['ethnic', 'religion', 'educationLevel']) {
		if (!text(key)) {
			issues.push({
				field: key,
				message: `Chưa có ${LABELS[key].toLowerCase()}`,
				level: 'warning'
			})
		}
	}
	return issues
}

export const hasErrors = (issues: RowIssue[]) =>
	issues.some((i) => i.level === 'error')

/** Dòng đã kiểm tra → body gửi API (chỉ gọi khi dòng không có error) */
export function toStudentBody(row: ImportRow, unitId: number): StudentBody {
	return {
		...row.values,
		unitId,
		childrenInfos: []
	} as unknown as StudentBody
}
