import * as XLSX from 'xlsx'
import { toIsoDate } from '@/common'
import { IMPORT_COLUMNS, type ImportColumn } from './columns'

/** Một dòng dữ liệu trong file, đã chuẩn hoá kiểu nhưng chưa kiểm tra hợp lệ */
export interface ImportRow {
	/** Số dòng trong file Excel (để báo lỗi đúng chỗ) */
	rowNumber: number
	values: Record<string, string | number | boolean>
	/** Nội dung ô "Lớp" (id hoặc tên) — chuyển thành unitId ở bước validate */
	unitText: string
}

/** File sai định dạng mẫu (không phải lỗi dữ liệu của từng dòng) */
export class ImportFormatError extends Error {}

const REQUIRED_KEYS = ['fullName', 'dob', 'unitId']

const isBlank = (cell: unknown) =>
	cell === '' || cell === null || cell === undefined

/** hcyu/cpv hoặc Đoàn/Đảng → 'hcyu' | 'cpv'; còn lại ('Chưa tham gia'…) → '' */
function parsePoliticalOrg(value: unknown): string {
	const text = String(value ?? '')
		.trim()
		.toLowerCase()
	if (text === 'hcyu' || text.includes('đoàn')) return 'hcyu'
	if (text === 'cpv' || text.includes('đảng')) return 'cpv'
	return ''
}

function parseBoolean(value: unknown): boolean {
	if (typeof value === 'boolean') return value
	const text = String(value ?? '')
		.trim()
		.toLowerCase()
	return text === 'có' || text === 'true' || text === '1'
}

function parseNumber(value: unknown): number {
	const n =
		typeof value === 'number' ? value : Number.parseInt(String(value), 10)
	return Number.isFinite(n) ? Math.trunc(n) : 0
}

function parseCell(column: ImportColumn, raw: unknown) {
	switch (column.kind) {
		case 'date':
			return toIsoDate(raw)
		case 'boolean':
			return parseBoolean(raw)
		case 'number':
			return parseNumber(raw)
		case 'politicalOrg':
			return parsePoliticalOrg(raw)
		default:
			return String(raw ?? '').trim()
	}
}

/**
 * Đọc sheet đầu tiên của file Excel/CSV: dòng 1 tiêu đề tiếng Việt, dòng 2 tên trường,
 * dữ liệu từ dòng 3. Cột lạ bị bỏ qua, cột thiếu nhận giá trị mặc định.
 */
export function parseStudentSheet(data: ArrayBuffer | Uint8Array): ImportRow[] {
	const workbook = XLSX.read(data, { type: 'array' })
	const sheet = workbook.Sheets[workbook.SheetNames[0]]
	if (!sheet) throw new ImportFormatError('File không có dữ liệu.')

	const grid = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
		defval: '',
		header: 1
	})

	const keyRow = (grid[1] ?? []).map((k) => String(k ?? '').trim())
	const missing = REQUIRED_KEYS.filter((key) => !keyRow.includes(key))
	if (missing.length > 0) {
		throw new ImportFormatError(
			`File không đúng mẫu (thiếu cột ${missing.join(', ')}). Vui lòng tải file mẫu mới và nhập lại.`
		)
	}

	const indexOf = new Map(keyRow.map((key, i) => [key, i]))

	return grid
		.slice(2)
		.map((cells, i) => ({ cells, rowNumber: i + 3 }))
		.filter(({ cells }) => cells.some((cell) => !isBlank(cell)))
		.map(({ cells, rowNumber }) => {
			const values: ImportRow['values'] = {}
			let unitText = ''

			for (const column of IMPORT_COLUMNS) {
				const index = indexOf.get(column.key)
				const raw = index === undefined ? '' : cells[index]

				if (column.kind === 'unit') unitText = String(raw ?? '').trim()
				else values[column.key] = parseCell(column, raw)
			}
			return { rowNumber, values, unitText }
		})
}
