import ExcelJS from 'exceljs'
import type { AssetMovementReportRow, BrokenAssetRow } from '@/types/asset'
import type { WarehouseAssetRow } from '@/hooks/useAssetReports'
import {
	formatMovementReportNote,
	movementTypeLabel
} from '@/lib/asset-movement-labels'
import { formatMovementDateTime } from '@/lib/utils'

/** Phân cấp báo cáo: chỉ số 1–5, không kèm mô tả */
function gradeNum(v: number | null | undefined): string {
	const n = Number(v ?? 1)
	if (!Number.isFinite(n) || n < 1) return '1'
	return String(Math.min(5, Math.round(n)))
}

async function downloadWorkbook(wb: ExcelJS.Workbook, filename: string) {
	const buf = await wb.xlsx.writeBuffer()
	const blob = new Blob([buf], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	})
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename
	a.click()
	URL.revokeObjectURL(url)
}

function styleHeader(row: ExcelJS.Row) {
	row.font = { bold: true, color: { argb: 'FFFFFFFF' } }
	row.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: 'FF1F4E79' }
	}
	row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
	row.height = 28
}

function setWidths(ws: ExcelJS.Worksheet, widths: number[]) {
	widths.forEach((w, i) => {
		ws.getColumn(i + 1).width = w
	})
}

/**
 * Địa chỉ lắp đặt: ưu tiên installAddress, fallback tòa/tầng/phòng.
 */
export function resolveInstallAddress(r: {
	installAddress?: string | null
	buildingName?: string | null
	buildingCode?: string | null
	floorName?: string | null
	roomName?: string | null
	roomCode?: string | null
}): string {
	const install = String(r.installAddress ?? '').trim()
	if (install) return install
	const parts = [
		r.buildingName || r.buildingCode,
		r.floorName,
		r.roomName || r.roomCode
	].filter((p) => p && String(p).trim())
	return parts.join(', ')
}

function yearCell(v: number | null | undefined): string | number {
	if (v === null || v === undefined || v === ('' as unknown)) return ''
	const n = Number(v)
	if (!Number.isFinite(n) || n <= 0) return ''
	return n
}

/**
 * Export broken/repairing assets to Excel with full location + repair lifecycle columns.
 */
export async function exportBrokenAssetsExcel(
	rows: BrokenAssetRow[],
	filename = 'vat-tu-hong-sua-chua.xlsx'
) {
	const wb = new ExcelJS.Workbook()
	wb.creator = 'QLHV - Quản lý vật tư'
	const ws = wb.addWorksheet('Vat tu hong va dang sua')

	const headers = [
		'Tòa nhà (mã)',
		'Tòa nhà (tên)',
		'Tầng',
		'Phòng (mã)',
		'Phòng (tên)',
		'Thiết bị hư',
		'Phân loại',
		'Số lượng',
		'Trạng thái',
		'Ngày hư',
		'Ngày bắt đầu sửa',
		'Người sửa chữa',
		'Đã hoàn thành',
		'Ngày hoàn thành'
	]
	ws.addRow(headers)
	styleHeader(ws.getRow(1))

	const statusLabel: Record<string, string> = {
		BROKEN: 'Hỏng',
		REPAIRING: 'Đang sửa',
		NORMAL: 'Bình thường',
		DISPOSED: 'Thanh lý'
	}

	for (const r of rows) {
		ws.addRow([
			r.buildingCode,
			r.buildingName,
			r.floorName,
			r.roomCode,
			r.roomName,
			r.name,
			r.category,
			r.quantity,
			statusLabel[r.status] ?? r.status,
			r.brokenAt || '',
			r.repairStartedAt || '',
			r.repairPerformer || '',
			r.repairCompleted ? 'Đã hoàn thành' : 'Chưa hoàn thành',
			r.repairCompletedAt || ''
		])
	}
	setWidths(ws, [14, 22, 14, 12, 18, 22, 14, 10, 12, 14, 16, 16, 14, 14])
	await downloadWorkbook(wb, filename)
}

/**
 * Xuất báo cáo kho vật tư.
 * Sheet chính (đầu tiên): đúng 6 cột yêu cầu
 *   Tên thiết bị | Số lượng | Năm sản xuất | Năm sử dụng | Phân cấp | Địa chỉ lắp đặt
 * Sheet chi tiết: ổn định / hư hỏng.
 */
export async function exportWarehouseAssetsExcel(
	stable: WarehouseAssetRow[],
	broken: WarehouseAssetRow[],
	opts?: { filename?: string; scopeLabel?: string }
) {
	const wb = new ExcelJS.Workbook()
	wb.creator = 'QLHV - Quản lý vật tư'

	/** 6 cột bắt buộc theo yêu cầu nghiệp vụ */
	const CORE_HEADERS = [
		'Tên thiết bị',
		'Số lượng',
		'Năm sản xuất',
		'Năm sử dụng',
		'Phân cấp',
		'Địa chỉ lắp đặt'
	] as const

	function coreRow(r: WarehouseAssetRow): (string | number)[] {
		return [
			r.name || '',
			Number(r.quantity) || 0,
			yearCell(r.manufactureYear),
			yearCell(r.usageYear),
			gradeNum(r.grade),
			resolveInstallAddress(r)
		]
	}

	// ── Sheet 1: Báo cáo chính — 2 bảng: ổn định / hư hỏng ─────
	const wsMain = wb.addWorksheet('Bao cao kho')
	wsMain.addRow([
		'BÁO CÁO KHO VẬT TƯ',
		'',
		'',
		'',
		`Ngày xuất: ${new Date().toISOString().slice(0, 10)}`,
		opts?.scopeLabel ? `Phạm vi: ${opts.scopeLabel}` : ''
	])
	wsMain.getRow(1).font = { bold: true, size: 13 }
	wsMain.mergeCells(1, 1, 1, 4)

	// Bảng I — Hoạt động ổn định
	wsMain.addRow([
		'I. Kho vật tư hoạt động ổn định',
		`Tổng SL: ${stable.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}`,
		`Số dòng: ${stable.length}`
	])
	wsMain.getRow(2).font = { bold: true, size: 12 }
	wsMain.addRow([...CORE_HEADERS, 'Mã VT', 'Loại'])
	styleHeader(wsMain.getRow(3))
	if (!stable.length) {
		wsMain.addRow(['(Không có dữ liệu)', '', '', '', '', '', '', ''])
	} else {
		for (const r of stable) {
			wsMain.addRow([...coreRow(r), r.code || '', r.category || ''])
		}
	}

	// khoảng trống giữa 2 bảng
	wsMain.addRow([])
	const brokenTitleRow = wsMain.rowCount + 1
	wsMain.addRow([
		'II. Kho vật tư đang sửa chữa và hư hại',
		`Tổng SL: ${broken.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}`,
		`Số dòng: ${broken.length}`
	])
	wsMain.getRow(brokenTitleRow).font = { bold: true, size: 12 }
	const brokenHeaderRow = wsMain.rowCount + 1
	wsMain.addRow([...CORE_HEADERS, 'Lý do hỏng', 'Ngày hư', 'Mã VT', 'Loại'])
	styleHeader(wsMain.getRow(brokenHeaderRow))
	const brokenDataStart = wsMain.rowCount + 1
	if (!broken.length) {
		wsMain.addRow([
			'(Không có dữ liệu)',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			'',
			''
		])
	} else {
		for (const r of broken) {
			wsMain.addRow([
				...coreRow(r),
				String(r.description ?? '').trim() || '—',
				r.brokenAt || '',
				r.code || '',
				r.category || ''
			])
		}
	}
	const lastRow = wsMain.rowCount
	for (let row = brokenDataStart; row <= lastRow; row++) {
		for (let c = 1; c <= 10; c++) {
			wsMain.getCell(row, c).fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFFFF2F2' }
			}
		}
	}

	setWidths(wsMain, [28, 10, 12, 12, 10, 36, 32, 12, 16, 14])
	wsMain.views = [{ state: 'frozen', ySplit: 1 }]

	// ── Sheet 2: Kho ổn định (chi tiết) ──────────────────────────
	const detailHeaders = [
		'STT',
		'Mã VT',
		'Tên thiết bị',
		'Số lượng',
		'ĐVT',
		'Năm sản xuất',
		'Năm sử dụng',
		'Phân cấp',
		'Địa chỉ lắp đặt',
		'Loại',
		'Tòa',
		'Tầng',
		'Phòng',
		'Trạng thái'
	]
	const detailWidths = [6, 16, 26, 10, 8, 12, 12, 22, 42, 14, 18, 12, 14, 12]

	function detailRow(r: WarehouseAssetRow, i: number): (string | number)[] {
		return [
			i + 1,
			r.code || '',
			r.name || '',
			Number(r.quantity) || 0,
			r.unit || '',
			yearCell(r.manufactureYear),
			yearCell(r.usageYear),
			gradeNum(r.grade),
			resolveInstallAddress(r),
			r.category || '',
			r.buildingName || r.buildingCode || '',
			r.floorName || '',
			r.roomName || r.roomCode || '',
			r.status || ''
		]
	}

	const wsS = wb.addWorksheet('Kho on dinh')
	wsS.addRow(detailHeaders)
	styleHeader(wsS.getRow(1))
	stable.forEach((r, i) => wsS.addRow(detailRow(r, i)))
	setWidths(wsS, detailWidths)
	wsS.views = [{ state: 'frozen', ySplit: 1 }]

	// ── Sheet 3: Kho hư hỏng ─────────────────────────────────────
	const wsB = wb.addWorksheet('Kho hu hong')
	wsB.addRow([...detailHeaders, 'Nội dung hư', 'Ngày hư'])
	styleHeader(wsB.getRow(1))
	broken.forEach((r, i) =>
		wsB.addRow([...detailRow(r, i), r.description || '', r.brokenAt || ''])
	)
	setWidths(wsB, [...detailWidths, 30, 12])
	wsB.views = [{ state: 'frozen', ySplit: 1 }]

	// ── Sheet 4: Tóm tắt ─────────────────────────────────────────
	const wsInfo = wb.addWorksheet('Tom tat')
	wsInfo.addRow(['Báo cáo kho vật tư'])
	wsInfo.getRow(1).font = { bold: true, size: 14 }
	wsInfo.addRow(['Ngày xuất', new Date().toISOString().slice(0, 10)])
	if (opts?.scopeLabel) wsInfo.addRow(['Phạm vi', opts.scopeLabel])
	wsInfo.addRow([
		'Tổng SL ổn định',
		stable.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
	])
	wsInfo.addRow([
		'Tổng SL hư hỏng',
		broken.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
	])
	wsInfo.addRow(['Số dòng ổn định', stable.length])
	wsInfo.addRow(['Số dòng hư hỏng', broken.length])
	wsInfo.addRow([])
	wsInfo.addRow([
		'Cấu trúc sheet "Bao cao kho"',
		`2 bảng: I. Kho vật tư hoạt động ổn định · II. Kho vật tư đang sửa chữa và hư hại (+ Lý do hỏng | Ngày hư)`
	])
	wsInfo.getColumn(1).width = 36
	wsInfo.getColumn(2).width = 56

	await downloadWorkbook(wb, opts?.filename || 'bao-cao-kho-vat-tu.xlsx')
}

/**
 * Báo cáo riêng: vật tư đang hư hại và sửa chữa.
 */
export async function exportDamagedRepairAssetsExcel(
	broken: WarehouseAssetRow[],
	opts?: { filename?: string; scopeLabel?: string }
) {
	const wb = new ExcelJS.Workbook()
	wb.creator = 'QLHV - Quản lý vật tư'

	const headers = [
		'STT',
		'Tên thiết bị',
		'Số lượng',
		'Năm sản xuất',
		'Năm sử dụng',
		'Phân cấp',
		'Địa chỉ lắp đặt',
		'Lý do hỏng',
		'Ngày hư',
		'Mã VT',
		'Loại',
		'Tòa',
		'Tầng',
		'Phòng/Lớp',
		'Trạng thái'
	]

	const ws = wb.addWorksheet('Hu hai va sua chua')
	ws.addRow(['BÁO CÁO VẬT TƯ ĐANG HƯ HẠI VÀ SỬA CHỮA'])
	ws.getRow(1).font = { bold: true, size: 14 }
	ws.mergeCells(1, 1, 1, 6)
	ws.addRow([
		`Ngày xuất: ${new Date().toISOString().slice(0, 10)}`,
		opts?.scopeLabel ? `Phạm vi: ${opts.scopeLabel}` : '',
		`Tổng SL: ${broken.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}`,
		`Số dòng: ${broken.length}`
	])
	ws.addRow(headers)
	styleHeader(ws.getRow(3))

	if (!broken.length) {
		ws.addRow(['', '(Không có dữ liệu)'])
	} else {
		broken.forEach((r, i) => {
			const row = ws.addRow([
				i + 1,
				r.name || '',
				Number(r.quantity) || 0,
				yearCell(r.manufactureYear),
				yearCell(r.usageYear),
				gradeNum(r.grade),
				resolveInstallAddress(r),
				String(r.description ?? '').trim() || '—',
				r.brokenAt || '',
				r.code || '',
				r.category || '',
				r.buildingName || r.buildingCode || '',
				r.floorName || '',
				r.roomName || r.roomCode || '',
				r.status || ''
			])
			for (let c = 1; c <= headers.length; c++) {
				row.getCell(c).fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: 'FFFFF2F2' }
				}
			}
		})
	}

	setWidths(ws, [6, 26, 10, 12, 12, 10, 30, 28, 12, 14, 12, 16, 12, 16, 12])
	ws.views = [{ state: 'frozen', ySplit: 3 }]

	await downloadWorkbook(
		wb,
		opts?.filename || 'bao-cao-vat-tu-dang-hu-hai-va-sua-chua.xlsx'
	)
}

/** Excel: hư hại & SC theo tòa / theo lớp (mỗi nhóm 1 sheet) */
export async function exportDamagedRepairGroupedExcel(
	broken: WarehouseAssetRow[],
	opts: {
		groupBy: WarehouseGroupBy
		filename?: string
		scopeLabel?: string
	}
) {
	const wb = new ExcelJS.Workbook()
	wb.creator = 'QLHV - Quản lý vật tư'
	type Group = { key: string; label: string; items: WarehouseAssetRow[] }
	const map = new Map<string, Group>()
	for (const r of broken) {
		let key: string
		let label: string
		if (opts.groupBy === 'building') {
			key = String(
				r.buildingId ?? r.buildingCode ?? r.buildingName ?? 'unknown'
			)
			label = r.buildingName || r.buildingCode || 'Không xác định'
		} else {
			key = String(r.roomId ?? `${r.buildingId}-${r.roomCode}`)
			label =
				r.roomName || r.roomCode
					? `${r.roomName || r.roomCode}${r.buildingName ? ` (${r.buildingName})` : ''}`
					: 'Không xác định'
		}
		let g = map.get(key)
		if (!g) {
			g = { key, label, items: [] }
			map.set(key, g)
		}
		g.items.push(r)
	}
	const groups = [...map.values()].sort((a, b) =>
		a.label.localeCompare(b.label, 'vi')
	)
	if (!groups.length) {
		throw new Error('Không có dữ liệu hư hại / sửa chữa để xuất theo nhóm')
	}

	const modeTitle =
		opts.groupBy === 'building'
			? 'BÁO CÁO VẬT TƯ ĐANG HƯ HẠI VÀ SỬA CHỮA THEO TÒA'
			: 'BÁO CÁO VẬT TƯ ĐANG HƯ HẠI VÀ SỬA CHỮA THEO LỚP'

	const wsIndex = wb.addWorksheet('Danh muc')
	wsIndex.addRow([modeTitle])
	wsIndex.getRow(1).font = { bold: true, size: 14 }
	wsIndex.addRow(['Phạm vi', opts.scopeLabel || 'Tất cả'])
	wsIndex.addRow(['Ngày xuất', new Date().toISOString().slice(0, 10)])
	wsIndex.addRow(['Số nhóm', groups.length])
	wsIndex.addRow([])
	wsIndex.addRow([
		opts.groupBy === 'building' ? 'Tòa nhà' : 'Lớp / Phòng',
		'SL hư hại',
		'Số dòng'
	])
	styleHeader(wsIndex.getRow(6))
	for (const g of groups) {
		wsIndex.addRow([
			g.label,
			g.items.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
			g.items.length
		])
	}
	setWidths(wsIndex, [36, 14, 12])

	const usedNames = new Set<string>(['danh muc'])
	for (const g of groups) {
		const ws = wb.addWorksheet(sanitizeSheetName(g.label, usedNames))
		fillDamagedSheet(ws, `${modeTitle} — ${g.label}`, g.items)
	}

	const prefix =
		opts.groupBy === 'building'
			? 'bao-cao-hu-hai-sua-chua-theo-toa'
			: 'bao-cao-hu-hai-sua-chua-theo-lop'
	await downloadWorkbook(wb, opts.filename || `${prefix}.xlsx`)
}

function fillDamagedSheet(
	ws: ExcelJS.Worksheet,
	title: string,
	items: WarehouseAssetRow[]
) {
	const headers = [
		'STT',
		'Tên thiết bị',
		'Số lượng',
		'Năm sản xuất',
		'Năm sử dụng',
		'Phân cấp',
		'Địa chỉ lắp đặt',
		'Lý do hỏng',
		'Ngày hư'
	]
	ws.addRow([title])
	ws.getRow(1).font = { bold: true, size: 13 }
	ws.addRow([
		`Ngày xuất: ${new Date().toISOString().slice(0, 10)}`,
		`Tổng SL: ${items.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}`,
		`Số dòng: ${items.length}`
	])
	ws.addRow(headers)
	styleHeader(ws.getRow(3))
	items.forEach((r, i) => {
		const row = ws.addRow([
			i + 1,
			r.name || '',
			Number(r.quantity) || 0,
			yearCell(r.manufactureYear),
			yearCell(r.usageYear),
			gradeNum(r.grade),
			resolveInstallAddress(r),
			String(r.description ?? '').trim() || '—',
			r.brokenAt || ''
		])
		for (let c = 1; c <= headers.length; c++) {
			row.getCell(c).fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFFFF2F2' }
			}
		}
	})
	setWidths(ws, [6, 26, 10, 12, 12, 10, 30, 28, 12])
}

export type WarehouseGroupBy = 'building' | 'room'

/** Excel sheet name: max 31 chars, no * ? : \ / [ ] */
function sanitizeSheetName(name: string, used: Set<string>): string {
	let base = String(name || 'Sheet')
		.replace(/[*?:\\/[\]]/g, '-')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 28)
	if (!base) base = 'Sheet'
	let out = base
	let i = 1
	while (used.has(out.toLowerCase())) {
		const suffix = `_${i++}`
		out = `${base.slice(0, 28 - suffix.length)}${suffix}`
	}
	used.add(out.toLowerCase())
	return out
}

const CORE_HEADERS_EXPORT = [
	'Tên thiết bị',
	'Số lượng',
	'Năm sản xuất',
	'Năm sử dụng',
	'Phân cấp',
	'Địa chỉ lắp đặt'
] as const

function fillWarehouseCoreSheet(
	ws: ExcelJS.Worksheet,
	title: string,
	stable: WarehouseAssetRow[],
	broken: WarehouseAssetRow[]
) {
	ws.addRow([title])
	ws.getRow(1).font = { bold: true, size: 13 }
	ws.mergeCells(1, 1, 1, 4)
	ws.addRow([
		`Ngày xuất: ${new Date().toISOString().slice(0, 10)}`,
		`SL ổn định: ${stable.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}`,
		`SL hư hỏng: ${broken.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}`
	])

	// Bảng I — Hoạt động ổn định
	ws.addRow(['I. Kho vật tư hoạt động ổn định', `Số dòng: ${stable.length}`])
	ws.getRow(ws.rowCount).font = { bold: true }
	ws.addRow([
		...CORE_HEADERS_EXPORT,
		'Mã VT',
		'Loại',
		'Tòa',
		'Tầng',
		'Phòng/Lớp'
	])
	styleHeader(ws.getRow(ws.rowCount))
	if (!stable.length) {
		ws.addRow(['(Không có dữ liệu)'])
	} else {
		for (const r of stable) {
			ws.addRow([
				r.name || '',
				Number(r.quantity) || 0,
				yearCell(r.manufactureYear),
				yearCell(r.usageYear),
				gradeNum(r.grade),
				resolveInstallAddress(r),
				r.code || '',
				r.category || '',
				r.buildingName || r.buildingCode || '',
				r.floorName || '',
				r.roomName || r.roomCode || ''
			])
		}
	}

	ws.addRow([])
	// Bảng II — Đang sửa chữa và hư hại + lý do
	ws.addRow([
		'II. Kho vật tư đang sửa chữa và hư hại',
		`Số dòng: ${broken.length}`
	])
	ws.getRow(ws.rowCount).font = { bold: true }
	const brokenHeaderIdx = ws.rowCount + 1
	ws.addRow([
		...CORE_HEADERS_EXPORT,
		'Lý do hỏng',
		'Ngày hư',
		'Mã VT',
		'Loại',
		'Tòa',
		'Tầng',
		'Phòng/Lớp'
	])
	styleHeader(ws.getRow(brokenHeaderIdx))
	const brokenStart = ws.rowCount + 1
	if (!broken.length) {
		ws.addRow(['(Không có dữ liệu)'])
	} else {
		for (const r of broken) {
			ws.addRow([
				r.name || '',
				Number(r.quantity) || 0,
				yearCell(r.manufactureYear),
				yearCell(r.usageYear),
				gradeNum(r.grade),
				resolveInstallAddress(r),
				String(r.description ?? '').trim() || '—',
				r.brokenAt || '',
				r.code || '',
				r.category || '',
				r.buildingName || r.buildingCode || '',
				r.floorName || '',
				r.roomName || r.roomCode || ''
			])
		}
	}
	const lastRow = ws.rowCount
	for (let row = brokenStart; row <= lastRow; row++) {
		for (let c = 1; c <= 13; c++) {
			ws.getCell(row, c).fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFFFF2F2' }
			}
		}
	}
	setWidths(ws, [26, 10, 12, 12, 10, 30, 28, 12, 14, 12, 16, 12, 16])
	ws.views = [{ state: 'frozen', ySplit: 2 }]
}

/**
 * Xuất kho vật tư theo tòa hoặc theo lớp (phòng).
 * Mỗi tòa/lớp một sheet; cột chính: tên, SL, năm SX/SD, phân cấp, địa chỉ.
 */
export async function exportWarehouseGroupedExcel(
	stable: WarehouseAssetRow[],
	broken: WarehouseAssetRow[],
	opts: {
		groupBy: WarehouseGroupBy
		filename?: string
		/** Tiêu đề phụ (vd. đã lọc một tòa) */
		scopeLabel?: string
	}
) {
	const wb = new ExcelJS.Workbook()
	wb.creator = 'QLHV - Quản lý vật tư'

	const all = [
		...stable.map((r) => ({ ...r, _pool: 'stable' as const })),
		...broken.map((r) => ({ ...r, _pool: 'broken' as const }))
	]

	type Group = {
		key: string
		label: string
		stable: WarehouseAssetRow[]
		broken: WarehouseAssetRow[]
	}
	const map = new Map<string, Group>()

	for (const r of all) {
		let key: string
		let label: string
		if (opts.groupBy === 'building') {
			key = String(
				r.buildingId ?? r.buildingCode ?? r.buildingName ?? 'unknown'
			)
			label = r.buildingName || r.buildingCode || 'Không xác định'
		} else {
			key = String(r.roomId ?? `${r.buildingId}-${r.roomCode}`)
			label =
				r.roomName || r.roomCode
					? `${r.roomName || r.roomCode}${r.buildingName ? ` (${r.buildingName})` : ''}`
					: 'Không xác định'
		}
		let g = map.get(key)
		if (!g) {
			g = { key, label, stable: [], broken: [] }
			map.set(key, g)
		}
		if (r._pool === 'stable') g.stable.push(r)
		else g.broken.push(r)
	}

	const groups = [...map.values()].sort((a, b) =>
		a.label.localeCompare(b.label, 'vi')
	)

	if (!groups.length) {
		throw new Error('Không có dữ liệu kho để xuất theo nhóm')
	}

	const modeTitle =
		opts.groupBy === 'building'
			? 'BÁO CÁO KHO VẬT TƯ THEO TÒA'
			: 'BÁO CÁO KHO VẬT TƯ THEO LỚP'

	const wsIndex = wb.addWorksheet('Danh muc')
	wsIndex.addRow([modeTitle])
	wsIndex.getRow(1).font = { bold: true, size: 14 }
	wsIndex.addRow(['Phạm vi', opts.scopeLabel || 'Tất cả lớp'])
	wsIndex.addRow(['Ngày xuất', new Date().toISOString().slice(0, 10)])
	wsIndex.addRow(['Số nhóm', groups.length])
	wsIndex.addRow([])
	wsIndex.addRow([
		opts.groupBy === 'building' ? 'Tòa nhà' : 'Lớp / Phòng',
		'SL ổn định',
		'SL hư hỏng',
		'Số dòng'
	])
	styleHeader(wsIndex.getRow(6))
	for (const g of groups) {
		const sq = g.stable.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
		const bq = g.broken.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
		wsIndex.addRow([g.label, sq, bq, g.stable.length + g.broken.length])
	}
	setWidths(wsIndex, [36, 14, 14, 12])

	const usedNames = new Set<string>(['danh muc'])
	for (const g of groups) {
		const sheetName = sanitizeSheetName(g.label, usedNames)
		const ws = wb.addWorksheet(sheetName)
		fillWarehouseCoreSheet(
			ws,
			`${modeTitle} — ${g.label}`,
			g.stable,
			g.broken
		)
	}

	const prefix =
		opts.groupBy === 'building'
			? 'bao-cao-kho-theo-toa'
			: 'bao-cao-kho-theo-lop'
	await downloadWorkbook(wb, opts.filename || `${prefix}.xlsx`)
}

const UPDATE_MOVEMENT_TYPES = new Set(['INCREASE', 'DECREASE', 'ADJUST'])

/**
 * Xuất nhật ký cập nhật vật tư (tăng/giảm/điều chỉnh) ra Excel.
 * Bỏ qua điều động / thu hồi (xem trang Điều động–thu hồi).
 */
export async function exportAssetMovementsExcel(
	rows: AssetMovementReportRow[],
	filename = 'nhat-ky-cap-nhat-vat-tu.xlsx'
) {
	const wb = new ExcelJS.Workbook()
	wb.creator = 'QLHV - Quản lý vật tư'
	const ws = wb.addWorksheet('Nhat ky cap nhat')

	const headers = [
		'Ngày giờ thực hiện',
		'Loại',
		'Tòa (mã)',
		'Tòa (tên)',
		'Tầng',
		'Phòng (mã)',
		'Phòng (tên)',
		'Mã vật tư',
		'Tên thiết bị',
		'Số lượng GD',
		'SL trước',
		'SL sau',
		'Phân cấp',
		'Năm SX',
		'Năm SD',
		'Đơn vị thực hiện',
		'Địa chỉ lắp đặt',
		'Lý do',
		'Lý do khác',
		'Ngày QĐ',
		'Số QĐ',
		'Người ký',
		'Người thực hiện',
		'Diễn giải',
		'Ghi chú'
	]
	ws.addRow(headers)
	styleHeader(ws.getRow(1))

	const formatDt = (
		executedAt?: string | null,
		createdAt?: string | null
	) => {
		const s = formatMovementDateTime(executedAt, createdAt)
		return s === '—' ? '' : s
	}

	const onlyUpdates = rows.filter((r) =>
		UPDATE_MOVEMENT_TYPES.has(r.movementType)
	)
	for (const r of onlyUpdates) {
		ws.addRow([
			formatDt(r.executedAt, r.createdAt),
			movementTypeLabel(r.movementType),
			r.buildingCode,
			r.buildingName,
			r.floorName,
			r.roomCode,
			r.roomName,
			r.assetCode || '',
			r.assetName,
			r.quantity,
			r.quantityBefore,
			r.quantityAfter,
			gradeNum(r.grade),
			yearCell(r.manufactureYear),
			yearCell(r.usageYear),
			r.executingUnit || '',
			r.installAddress || '',
			// Lý do + đề xuất từ ai + phê duyệt
			formatMovementReportNote(r),
			r.reasonOther || '',
			r.decisionDate || '',
			r.decisionNumber || '',
			r.signer || '',
			r.performer || '',
			r.explanation || '',
			r.note || ''
		])
	}
	setWidths(
		ws,
		[
			18, 14, 12, 20, 12, 12, 16, 16, 22, 12, 10, 10, 22, 10, 10, 16, 28,
			14, 18, 12, 12, 14, 14, 28, 20
		]
	)
	ws.views = [{ state: 'frozen', ySplit: 1 }]

	await downloadWorkbook(wb, filename)
}
