import * as XLSX from 'xlsx'
import type { UnitOption } from '@/hooks/useUnitOptions'
import { buildUnitOptions } from '@/hooks/useUnitOptions'
import type { Unit } from '@/types'
import { IMPORT_COLUMNS } from './columns'

export const unit = (
	id: number,
	name: string,
	parent: string,
	alias = ''
): Unit =>
	({
		id,
		name,
		alias,
		level: 'class',
		parent: { id: id * 10, name: parent, alias: '', level: 'company' },
		children: []
	}) as unknown as Unit

export const UNITS = [
	unit(7, 'Lớp 1', 'Đại đội 1', 'L1'),
	unit(8, 'Lớp 2', 'Đại đội 1'),
	unit(9, 'Lớp 1', 'Đại đội 2') // trùng tên với lớp 7
]
export const OPTIONS: UnitOption[] = buildUnitOptions(UNITS)

/** Dựng file .xlsx đúng bố cục: dòng 1 tiêu đề, dòng 2 tên trường, dữ liệu từ dòng 3 */
export function sheetBytes(
	rows: Array<Record<string, unknown>>,
	keys = IMPORT_COLUMNS.map((c) => c.key)
) {
	const aoa = [
		keys.map((k) => IMPORT_COLUMNS.find((c) => c.key === k)?.header ?? k),
		keys,
		...rows.map((r) => keys.map((k) => r[k] ?? ''))
	]
	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Sheet1')
	return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }))
}

export const goodRow = (over: Record<string, unknown> = {}) => ({
	fullName: 'Nguyễn Văn A',
	dob: '06/05/2001',
	ethnic: 'Kinh',
	religion: 'Không',
	educationLevel: '12/12',
	unitId: 'Lớp 2 - Đại đội 1',
	...over
})
