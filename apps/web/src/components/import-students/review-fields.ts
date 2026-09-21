import { toDisplayDate } from '@/lib/student-dates'
import { IMPORT_COLUMNS } from './columns'
import type { ImportRow } from './parse'

export interface ReviewField {
	key: string
	label: string
	/** Giá trị đã định dạng như sẽ hiện ở hồ sơ; rỗng nếu file để trống */
	value: string
}

const POLITICAL_ORG: Record<string, string> = { hcyu: 'Đoàn', cpv: 'Đảng' }

function format(kind: string, value: ImportRow['values'][string]): string {
	if (kind === 'boolean') return value ? 'Có' : 'Không'
	if (kind === 'date') return toDisplayDate(String(value ?? ''))
	if (kind === 'politicalOrg')
		return POLITICAL_ORG[String(value)] ?? 'Chưa tham gia'
	// Số 0 là «chưa điền» (parse đổi ô trống/sai thành 0)
	if (kind === 'number') return value ? String(value) : ''
	return String(value ?? '').trim()
}

/**
 * Mọi trường của một dòng file theo đúng thứ tự cột mẫu, để người dùng đối chiếu
 * dữ liệu sẽ được thêm. Cột lớp không có ở đây vì đã có ô chọn lớp riêng.
 */
export function reviewFields(row: ImportRow): ReviewField[] {
	return IMPORT_COLUMNS.filter((c) => c.kind !== 'unit').map((c) => ({
		key: c.key,
		label: c.header,
		value: format(c.kind, row.values[c.key])
	}))
}
