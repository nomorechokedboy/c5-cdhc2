/**
 * Xuất báo cáo thực lực vật tư ra Excel (.xlsx).
 * Dùng cùng logic gộp với Word (buildThucLucAggregate + unitColumnCode).
 */
import ExcelJS from 'exceljs'
import type { MilitaryReportMeta } from '@/lib/export-asset-word'
import {
	buildThucLucAggregate,
	nganhSectionTitle,
	resolveNganhForAsset,
	unitColumnCode,
	type ReportUnit,
	type ThucLucAggregateRow,
	type ThucLucAssetRow
} from '@/lib/export-thuc-luc'
import { resolveInstallAddress } from '@/lib/export-asset-excel'

function gradeNum(v: number | null | undefined): string {
	const n = Number(v ?? 1)
	if (!Number.isFinite(n) || n < 1) return '1'
	return String(Math.min(5, Math.round(n)))
}

function fmtQty(n: number): number | '' {
	return n > 0 ? n : ''
}

function asOfDisplay(meta?: MilitaryReportMeta): string {
	if (meta?.asOfDate) {
		const m = String(meta.asOfDate).match(/^(\d{4})-(\d{2})-(\d{2})/)
		if (m) return `${m[3]}/${m[2]}/${m[1]}`
		return meta.asOfDate
	}
	const d = new Date()
	const dd = String(d.getDate()).padStart(2, '0')
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	return `${dd}/${mm}/${d.getFullYear()}`
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
	row.font = {
		bold: true,
		color: { argb: 'FFFFFFFF' },
		name: 'Arial',
		size: 10
	}
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

function isKhoAsset(a: ThucLucAssetRow): boolean {
	if (a.isWarehouse === true) return true
	const roomPart = `${a.roomType || ''} ${a.roomName || ''} ${a.roomCode || ''}`
	if (/\bkho\b/i.test(roomPart) || /kho\s*vật\s*tư/i.test(roomPart))
		return true
	const bld = `${a.buildingName || ''} ${a.buildingCode || ''}`
	if (/\bkho\b/i.test(bld)) return true
	if (a.installAddress && /\bkho\b/i.test(a.installAddress)) return true
	return false
}

function allocateQty(
	a: ThucLucAssetRow,
	units: ReportUnit[],
	qty: number
): { byUnit: Record<number, number>; kho: number; total: number } {
	const byUnit = Object.fromEntries(units.map((u) => [u.id, 0])) as Record<
		number,
		number
	>
	let kho = 0
	if (isKhoAsset(a)) {
		kho = qty
	} else if (
		a.holdingUnitId != null &&
		byUnit[a.holdingUnitId] !== undefined
	) {
		byUnit[a.holdingUnitId] = qty
	}
	return { byUnit, kho, total: qty }
}

function unitHeaders(units: ReportUnit[]): string[] {
	return units.map((u) => unitColumnCode(u))
}

function writeTitleBlock(
	ws: ExcelJS.Worksheet,
	title: string,
	meta?: MilitaryReportMeta
) {
	ws.addRow([title])
	ws.getRow(1).font = { bold: true, size: 14, name: 'Arial' }
	ws.addRow([`Số liệu đến ngày: ${asOfDisplay(meta)}`])
	if (meta?.scopeLabel) {
		ws.addRow([`Phạm vi: ${meta.scopeLabel}`])
	}
	ws.addRow([`Ngày xuất file: ${new Date().toISOString().slice(0, 10)}`])
	ws.addRow([])
}

/**
 * Sheet tổng hợp: Mã | Tên | ĐVT | Phân cấp | Thực lực ngày | [ĐV…] | KHO | TỔNG
 * Nhóm theo category (loại VT / chuyên ngành).
 */
function fillTongHopSheet(
	ws: ExcelJS.Worksheet,
	rows: ThucLucAggregateRow[],
	units: ReportUnit[],
	title: string,
	meta?: MilitaryReportMeta
) {
	writeTitleBlock(ws, title, meta)

	const headers = [
		'STT',
		'Mã số',
		'Tên vật tư trang bị',
		'ĐVT',
		'Phân cấp',
		'Thực lực ngày',
		...unitHeaders(units),
		'KHO',
		'TỔNG'
	]
	const headerRowIdx = ws.rowCount + 1
	ws.addRow(headers)
	styleHeader(ws.getRow(headerRowIdx))

	let stt = 0
	let lastNganh = ''
	let lastCat = ''
	const grandByUnit = Object.fromEntries(
		units.map((u) => [u.id, 0])
	) as Record<number, number>
	let grandKho = 0
	let grandTotal = 0

	const emptyTail = () =>
		['', '', '', ...units.map(() => ''), '', ''] as (string | number)[]

	for (const r of rows) {
		// 1) Đề mục ngành — * HC2A — Công nghệ thông tin
		if (r.nganhLabel !== lastNganh) {
			lastNganh = r.nganhLabel
			lastCat = ''
			const nganhRow = ws.addRow([
				'',
				'',
				nganhSectionTitle(r.nganhLabel),
				...emptyTail()
			])
			nganhRow.font = { bold: true, name: 'Arial', size: 11 }
			nganhRow.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFBDD7EE' }
			}
		}
		// 2) Đề mục loại vật (Bảng tương tác, Camera giám sát…)
		if (r.category !== lastCat) {
			lastCat = r.category
			const catRow = ws.addRow([
				'',
				'',
				r.category || 'Khác',
				...emptyTail()
			])
			catRow.font = { bold: true, name: 'Arial', size: 10 }
			catRow.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFE7EEF7' }
			}
		}
		stt += 1
		ws.addRow([
			stt,
			r.code || '',
			r.name,
			r.dvt,
			gradeNum(r.grade),
			fmtQty(r.total),
			...units.map((u) => fmtQty(r.byUnit[u.id] || 0)),
			fmtQty(r.kho),
			fmtQty(r.total)
		])
		grandKho += r.kho
		grandTotal += r.total
		for (const u of units) {
			grandByUnit[u.id] = (grandByUnit[u.id] || 0) + (r.byUnit[u.id] || 0)
		}
	}

	const totalRow = ws.addRow([
		'',
		'',
		'TỔNG CỘNG',
		'',
		'',
		fmtQty(grandTotal),
		...units.map((u) => fmtQty(grandByUnit[u.id] || 0)),
		fmtQty(grandKho),
		fmtQty(grandTotal)
	])
	totalRow.font = { bold: true, name: 'Arial' }
	totalRow.fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: 'FFFFF2CC' }
	}

	const widths = [6, 14, 32, 8, 10, 12, ...units.map(() => 10), 10, 10]
	setWidths(ws, widths)
	ws.views = [{ state: 'frozen', ySplit: headerRowIdx }]
}

/**
 * Sheet chi tiết theo vị trí: mỗi dòng 1 VT tại 1 phòng + phân bổ đơn vị.
 * Có đề mục ngành (* HC2A — …) và loại vật.
 */
function fillViTriSheet(
	ws: ExcelJS.Worksheet,
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	title: string,
	meta?: MilitaryReportMeta
) {
	writeTitleBlock(ws, title, meta)

	const headers = [
		'STT',
		'Mã số',
		'Tên vật tư trang bị',
		'ĐVT',
		'Phân cấp',
		'SL',
		'Ngành',
		'Loại vật',
		'Tòa nhà',
		'Tầng',
		'Phòng (mã)',
		'Phòng (tên)',
		'Địa chỉ lắp đặt',
		'Trạng thái',
		...unitHeaders(units),
		'KHO'
	]
	const headerRowIdx = ws.rowCount + 1
	ws.addRow(headers)
	styleHeader(ws.getRow(headerRowIdx))

	const usable = assets
		.filter((a) => {
			const q = Number(a.quantity) || 0
			if (q < 0) return false
			if (String(a.status || '').toUpperCase() === 'DISPOSED')
				return false
			return q > 0
		})
		.sort((a, b) => {
			const na = resolveNganhForAsset(a.code).nganhCode
			const nb = resolveNganhForAsset(b.code).nganhCode
			const ng = na.localeCompare(nb, 'vi')
			if (ng !== 0) return ng
			const c = (a.category || '').localeCompare(b.category || '', 'vi')
			if (c !== 0) return c
			const n = (a.name || '').localeCompare(b.name || '', 'vi')
			if (n !== 0) return n
			const bld = (a.buildingName || '').localeCompare(
				b.buildingName || '',
				'vi'
			)
			if (bld !== 0) return bld
			return (a.roomName || a.roomCode || '').localeCompare(
				b.roomName || b.roomCode || '',
				'vi'
			)
		})

	let stt = 0
	let lastNganh = ''
	let lastCat = ''
	const colCount = headers.length

	for (const a of usable) {
		const { nganhLabel: nLabel } = resolveNganhForAsset(a.code)
		const cat = (a.category || 'Khác').trim() || 'Khác'
		if (nLabel !== lastNganh) {
			lastNganh = nLabel
			lastCat = ''
			const row = ws.addRow([
				'',
				'',
				nganhSectionTitle(nLabel),
				...Array(colCount - 3).fill('')
			])
			row.font = { bold: true, name: 'Arial', size: 11 }
			row.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFBDD7EE' }
			}
		}
		if (cat !== lastCat) {
			lastCat = cat
			const row = ws.addRow([
				'',
				'',
				cat,
				...Array(colCount - 3).fill('')
			])
			row.font = { bold: true, name: 'Arial', size: 10 }
			row.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFE7EEF7' }
			}
		}
		const qty = Number(a.quantity) || 0
		const alloc = allocateQty(a, units, qty)
		stt += 1
		ws.addRow([
			stt,
			a.code || '',
			a.name || '',
			a.unit || 'cái',
			gradeNum(a.grade),
			qty,
			nLabel,
			cat,
			a.buildingName || a.buildingCode || '',
			a.floorName || '',
			a.roomCode || '',
			a.roomName || '',
			resolveInstallAddress(a),
			a.status || '',
			...units.map((u) => fmtQty(alloc.byUnit[u.id] || 0)),
			fmtQty(alloc.kho)
		])
	}

	if (!usable.length) {
		ws.addRow(['', '', '(Không có dữ liệu có SL > 0)'])
	}

	const widths = [
		6,
		14,
		28,
		8,
		10,
		8,
		22,
		18,
		18,
		12,
		12,
		18,
		28,
		12,
		...units.map(() => 10),
		10
	]
	setWidths(ws, widths)
	ws.views = [{ state: 'frozen', ySplit: headerRowIdx }]
}

/** Sheet chi tiết thô (mọi dòng room_assets sau lọc) — tiện lọc/pivot trong Excel */
function fillChiTietSheet(
	ws: ExcelJS.Worksheet,
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	meta?: MilitaryReportMeta
) {
	writeTitleBlock(ws, 'CHI TIẾT VẬT TƯ (mọi dòng sau lọc)', meta)

	const headers = [
		'STT',
		'Mã VT',
		'Tên thiết bị',
		'ĐVT',
		'Phân cấp',
		'SL',
		'Mã ngành',
		'Ngành',
		'Loại vật',
		'Tòa',
		'Tầng',
		'Phòng mã',
		'Phòng tên',
		'Địa chỉ lắp đặt',
		'holdingUnitId',
		'Đơn vị giữ',
		'Là kho?',
		'Trạng thái',
		'Năm SX',
		'Năm SD'
	]
	const headerRowIdx = ws.rowCount + 1
	ws.addRow(headers)
	styleHeader(ws.getRow(headerRowIdx))

	const unitName = (id: number | null | undefined) => {
		if (id == null) return ''
		const u = units.find((x) => x.id === id)
		return u ? unitColumnCode(u) : String(id)
	}

	let stt = 0
	for (const a of assets) {
		if (String(a.status || '').toUpperCase() === 'DISPOSED') continue
		const { nganhCode, nganhLabel: nLabel } = resolveNganhForAsset(a.code)
		stt += 1
		ws.addRow([
			stt,
			a.code || '',
			a.name || '',
			a.unit || '',
			gradeNum(a.grade),
			Number(a.quantity) || 0,
			nganhCode,
			nLabel,
			a.category || '',
			a.buildingName || a.buildingCode || '',
			a.floorName || '',
			a.roomCode || '',
			a.roomName || '',
			resolveInstallAddress(a),
			a.holdingUnitId ?? '',
			unitName(a.holdingUnitId),
			isKhoAsset(a) ? 'Có' : '',
			a.status || '',
			a.manufactureYear ?? '',
			a.usageYear ?? ''
		])
	}

	setWidths(
		ws,
		[
			6, 14, 28, 8, 10, 8, 10, 28, 20, 16, 12, 12, 16, 28, 12, 12, 10, 12,
			10, 10
		]
	)
	ws.views = [{ state: 'frozen', ySplit: headerRowIdx }]
}

export type ThucLucExcelOpts = MilitaryReportMeta & {
	/** tong_hop = bảng gộp; vi_tri = chi tiết theo phòng */
	layout?: 'tong_hop' | 'vi_tri'
	includeZeroQuantity?: boolean
}

/**
 * Xuất thực lực ra Excel (tổng hợp và/hoặc theo vị trí).
 * Luôn kèm sheet «Chi tiet» để pivot/lọc.
 */
export async function exportThucLucExcel(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	opts?: ThucLucExcelOpts
) {
	const companyUnits =
		units.length > 0 ? units : [{ id: 0, name: '—', alias: '—' }]
	const layout = opts?.layout ?? 'tong_hop'
	const title =
		opts?.reportTitle ||
		'BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ, TRANG BỊ KỸ THUẬT HIỆN CÓ'

	const wb = new ExcelJS.Workbook()
	wb.creator = 'QLHV - Quản lý vật tư'

	if (layout === 'tong_hop') {
		const rows = buildThucLucAggregate(assets, companyUnits, {
			includeZeroQuantity: !!opts?.includeZeroQuantity
		})
		if (!rows.length) {
			throw new Error('Không có dữ liệu thực lực để xuất Excel')
		}
		const ws = wb.addWorksheet('Tong hop')
		fillTongHopSheet(ws, rows, companyUnits, title, opts)
	} else {
		const withQty = assets.filter((a) => (Number(a.quantity) || 0) > 0)
		if (!withQty.length) {
			throw new Error(
				'Không có dữ liệu theo vị trí lắp đặt để xuất Excel'
			)
		}
		const ws = wb.addWorksheet('Theo vi tri')
		fillViTriSheet(
			ws,
			withQty,
			companyUnits,
			`${title} — THEO VỊ TRÍ LẮP ĐẶT`,
			opts
		)
	}

	const wsDetail = wb.addWorksheet('Chi tiet')
	fillChiTietSheet(wsDetail, assets, companyUnits, opts)

	// Danh mục đơn vị (mã cột)
	const wsUnits = wb.addWorksheet('Don vi')
	wsUnits.addRow(['Mã cột', 'Tên đơn vị', 'ID'])
	styleHeader(wsUnits.getRow(1))
	for (const u of companyUnits) {
		wsUnits.addRow([unitColumnCode(u), u.name, u.id])
	}
	setWidths(wsUnits, [12, 36, 10])

	const base =
		opts?.filename?.replace(/\.docx$/i, '.xlsx') ||
		(layout === 'tong_hop'
			? 'bao-cao-thong-ke-thuc-luc-vat-tu-tong-hop.xlsx'
			: 'bao-cao-thong-ke-thuc-luc-vat-tu-theo-vi-tri.xlsx')
	const filename = base.endsWith('.xlsx') ? base : `${base}.xlsx`
	await downloadWorkbook(wb, filename)
}

/** Alias rõ nghĩa */
export async function exportThucLucTongHopExcel(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	meta?: MilitaryReportMeta
) {
	return exportThucLucExcel(assets, units, { ...meta, layout: 'tong_hop' })
}

export async function exportThucLucTheoViTriExcel(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	meta?: MilitaryReportMeta
) {
	return exportThucLucExcel(assets, units, { ...meta, layout: 'vi_tri' })
}
