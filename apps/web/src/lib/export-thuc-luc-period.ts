/**
 * Báo cáo tổng hợp theo kỳ:
 * - Thực lực (mẫu tăng/giảm tổng hợp + cột đơn vị)
 * - Giải thích tăng/giảm theo lý do (mẫu form tăng giảm)
 */
import {
	AlignmentType,
	BorderStyle,
	Document,
	Packer,
	Paragraph,
	Table,
	TableCell,
	TableRow,
	TextRun,
	VerticalAlign,
	WidthType
} from 'docx'
import type { AssetMovementReportRow } from '@/types/asset'
import type { MilitaryReportMeta } from '@/lib/export-asset-word'
import {
	DECREASE_REASON_LABELS,
	INCREASE_REASON_LABELS
} from '@/lib/asset-movement-labels'
import {
	nganhSectionTitle,
	resolveNganhForAsset,
	type ReportUnit,
	type ThucLucAssetRow,
	unitColumnCode
} from '@/lib/export-thuc-luc'
import { extractNganhCode } from '@/lib/nganh'

const FONT = 'Times New Roman'
const A4_W = 16838
const A4_H = 11906
const MARGIN = 500
const CONTENT_W = A4_W - MARGIN * 2

function run(text: string, opts?: { bold?: boolean; size?: number }) {
	return new TextRun({
		text,
		bold: opts?.bold,
		size: opts?.size ?? 16,
		font: FONT
	})
}

function p(
	text: string,
	opts?: {
		bold?: boolean
		size?: number
		center?: boolean
		spaceAfter?: number
		italics?: boolean
	}
) {
	return new Paragraph({
		alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
		spacing: { after: opts?.spaceAfter ?? 40, before: 0, line: 240 },
		children: [
			new TextRun({
				text,
				bold: opts?.bold,
				italics: opts?.italics,
				size: opts?.size ?? 18,
				font: FONT
			})
		]
	})
}

function formatDateVN(iso: string | null | undefined): string {
	if (!iso) return ''
	const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
	if (m) return `${m[3]}/${m[2]}/${m[1]}`
	return String(iso).slice(0, 10)
}

function thinBorders() {
	return {
		top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
		bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
		left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
		right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
	}
}

function cell(
	text: string,
	w: number,
	opts?: {
		bold?: boolean
		header?: boolean
		center?: boolean
		colSpan?: number
		fontSize?: number
	}
) {
	const span = opts?.colSpan ?? 1
	return new TableCell({
		width: { size: w * span, type: WidthType.DXA },
		columnSpan: span > 1 ? span : undefined,
		borders: thinBorders(),
		margins: { top: 12, bottom: 12, left: 14, right: 14 },
		verticalAlign: VerticalAlign.CENTER,
		shading: opts?.header ? { fill: 'D9D9D9' } : undefined,
		children: [
			new Paragraph({
				alignment:
					opts?.center !== false
						? AlignmentType.CENTER
						: AlignmentType.LEFT,
				children: [
					run(text ?? '', {
						bold: opts?.bold || opts?.header,
						size: opts?.fontSize ?? (opts?.header ? 12 : 11)
					})
				]
			})
		]
	})
}

function fmt(n: number): string {
	return n > 0 ? String(n) : ''
}

function inRange(
	dateStr: string | null | undefined,
	from?: string,
	to?: string
): boolean {
	const d = (dateStr || '').slice(0, 10)
	if (!d) return !from && !to
	if (from && d < from.slice(0, 10)) return false
	if (to && d > to.slice(0, 10)) return false
	return true
}

export type PeriodScope =
	| { kind: 'all' }
	| { kind: 'nganh'; nganhCode: string }
	| { kind: 'don_vi'; unitId: number }

export type PeriodMovementAgg = {
	code: string
	name: string
	dvt: string
	grade: number
	nganhCode: string
	nganhLabel: string
	/** SL hiện có (cuối kỳ) */
	closing: number
	increase: number
	decrease: number
	/** opening = closing - increase + decrease */
	opening: number
	byUnit: Record<number, number>
	incByReason: Record<string, number>
	decByReason: Record<string, number>
}

function productKey(code: string, name: string, dvt: string, grade: number) {
	return `${(code || name).toUpperCase()}|${name.toLowerCase()}|${dvt}|${grade}`
}

/**
 * Gộp thực lực cuối kỳ (từ room assets) + tăng/giảm trong kỳ (từ movement logs).
 */
export function buildPeriodAggregate(
	assets: ThucLucAssetRow[],
	movements: AssetMovementReportRow[],
	units: ReportUnit[],
	opts: {
		fromDate?: string
		toDate?: string
		scope?: PeriodScope
	}
): PeriodMovementAgg[] {
	const scope = opts.scope || { kind: 'all' }
	const map = new Map<string, PeriodMovementAgg>()

	const matchScopeAsset = (a: ThucLucAssetRow) => {
		if (scope.kind === 'nganh') {
			const nc = extractNganhCode(a.code) || ''
			return nc === scope.nganhCode
		}
		if (scope.kind === 'don_vi') {
			return a.holdingUnitId === scope.unitId
		}
		return true
	}

	const matchScopeMove = (m: AssetMovementReportRow) => {
		if (scope.kind === 'nganh') {
			const nc = extractNganhCode(m.assetCode) || ''
			return nc === scope.nganhCode
		}
		if (scope.kind === 'don_vi') {
			return (m.holdingUnitId ?? null) === scope.unitId
		}
		return true
	}

	const ensure = (
		code: string,
		name: string,
		dvt: string,
		grade: number
	): PeriodMovementAgg => {
		const { nganhCode, nganhLabel } = resolveNganhForAsset(code)
		const key = productKey(code, name, dvt, grade)
		let row = map.get(key)
		if (!row) {
			row = {
				code,
				name,
				dvt,
				grade,
				nganhCode,
				nganhLabel,
				closing: 0,
				increase: 0,
				decrease: 0,
				opening: 0,
				byUnit: Object.fromEntries(units.map((u) => [u.id, 0])),
				incByReason: {},
				decByReason: {}
			}
			map.set(key, row)
		} else if (code && (!row.code || code.length < row.code.length)) {
			row.code = code
		}
		return row
	}

	// Closing from current assets
	for (const a of assets) {
		if (!matchScopeAsset(a)) continue
		const qty = Number(a.quantity) || 0
		if (qty <= 0) continue
		if (String(a.status || '').toUpperCase() === 'DISPOSED') continue
		const name = (a.name || '').trim() || '—'
		const dvt = (a.unit || 'cái').trim() || 'cái'
		const gradeRaw = Number(a.grade ?? 1)
		const grade = gradeRaw >= 1 && gradeRaw <= 5 ? Math.round(gradeRaw) : 1
		const row = ensure(a.code || '', name, dvt, grade)
		row.closing += qty
		if (
			a.holdingUnitId != null &&
			row.byUnit[a.holdingUnitId] !== undefined
		) {
			row.byUnit[a.holdingUnitId] =
				(row.byUnit[a.holdingUnitId] || 0) + qty
		}
	}

	// Movements in period
	for (const m of movements) {
		if (!matchScopeMove(m)) continue
		if (!inRange(m.executedAt, opts.fromDate, opts.toDate)) continue
		const type = (m.movementType || '').toUpperCase()
		if (type !== 'INCREASE' && type !== 'DECREASE') continue
		const name = (m.assetName || '').trim() || '—'
		const dvt = 'Bộ'
		const gradeRaw = Number(m.grade ?? 1)
		const grade = gradeRaw >= 1 && gradeRaw <= 5 ? Math.round(gradeRaw) : 1
		const row = ensure(m.assetCode || '', name, dvt, grade)
		const q = Math.max(0, Number(m.quantity) || 0)
		const reason = (m.reasonCode || 'OTHER').toUpperCase()
		if (type === 'INCREASE') {
			row.increase += q
			row.incByReason[reason] = (row.incByReason[reason] || 0) + q
		} else {
			row.decrease += q
			row.decByReason[reason] = (row.decByReason[reason] || 0) + q
		}
	}

	const rows = [...map.values()]
		.map((r) => ({
			...r,
			opening: Math.max(0, r.closing - r.increase + r.decrease)
		}))
		.filter((r) => r.closing > 0 || r.increase > 0 || r.decrease > 0)
		.sort((a, b) => {
			const n = a.nganhCode.localeCompare(b.nganhCode, 'vi')
			if (n) return n
			return a.name.localeCompare(b.name, 'vi')
		})
	return rows
}

async function download(doc: Document, filename: string) {
	const blob = await Packer.toBlob(doc)
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`
	a.click()
	URL.revokeObjectURL(url)
}

function makeDoc(children: (Paragraph | Table)[], title: string) {
	return new Document({
		creator: 'QLHV - Quản lý vật tư',
		title,
		styles: {
			default: { document: { run: { font: FONT, size: 16 } } }
		},
		sections: [
			{
				properties: {
					page: {
						size: { width: A4_W, height: A4_H },
						margin: {
							top: MARGIN,
							bottom: MARGIN,
							left: MARGIN,
							right: MARGIN
						}
					}
				},
				children
			}
		]
	})
}

const INC_REASON_ORDER = [
	'FROM_SUPERIOR',
	'PURCHASE',
	'GRADE_UP',
	'INVENTORY',
	'OTHER'
] as const

const DEC_REASON_ORDER = [
	'RETURN_SUPERIOR',
	'LOSS',
	'LIQUIDATION',
	'DAMAGED',
	'INVENTORY',
	'OTHER'
] as const

function reasonHeader(code: string, map: Record<string, string>): string {
	return map[code] || code
}

/**
 * Mẫu Image #2 — Tổng hợp thực lực trong kỳ (đầu kỳ / tăng / giảm / cuối kỳ + cột ĐV).
 */
export async function exportPeriodThucLucWord(
	rows: PeriodMovementAgg[],
	units: ReportUnit[],
	meta?: MilitaryReportMeta & { fromDate?: string; toDate?: string }
) {
	if (!rows.length) throw new Error('Không có dữ liệu thực lực kỳ để xuất')

	const from = formatDateVN(meta?.fromDate) || '…'
	const to = formatDateVN(meta?.toDate) || formatDateVN(meta?.asOfDate) || '…'
	const fixed = [900, 2000, 450, 450, 700, 550, 550, 700]
	const unitBudget = CONTENT_W - fixed.reduce((a, b) => a + b, 0)
	const unitW = Math.max(
		300,
		Math.floor(unitBudget / Math.max(units.length, 1))
	)
	const W = [...fixed, ...units.map(() => unitW)]
	const scale =
		W.reduce((a, b) => a + b, 0) > CONTENT_W
			? CONTENT_W / W.reduce((a, b) => a + b, 0)
			: 1
	const widths = W.map((w) => Math.floor(w * scale))

	const header1 = new TableRow({
		tableHeader: true,
		children: [
			cell('MÃ SỐ', widths[0], { header: true }),
			cell('TÊN VẬT TƯ TRANG BỊ', widths[1], {
				header: true,
				center: false
			}),
			cell('ĐVT', widths[2], { header: true }),
			cell('Phẩm', widths[3], { header: true }),
			cell(`Thực lực\n${from}`, widths[4], {
				header: true,
				fontSize: 10
			}),
			cell('Tăng', widths[5], { header: true }),
			cell('Giảm', widths[6], { header: true }),
			cell(`Thực lực\n${to}`, widths[7], { header: true, fontSize: 10 }),
			...(units.length
				? [
						cell('THỰC LỰC CÁC ĐƠN VỊ', unitW, {
							header: true,
							colSpan: units.length
						})
					]
				: [])
		]
	})
	const header2 = new TableRow({
		tableHeader: true,
		children: [
			cell('', widths[0], { header: true }),
			cell('', widths[1], { header: true }),
			cell('', widths[2], { header: true }),
			cell('n', widths[3], { header: true }),
			cell('', widths[4], { header: true }),
			cell('+', widths[5], { header: true }),
			cell('−', widths[6], { header: true }),
			cell('', widths[7], { header: true }),
			...units.map((u, i) =>
				cell(unitColumnCode(u), widths[8 + i], {
					header: true,
					fontSize: 10
				})
			)
		]
	})

	const tableRows: TableRow[] = [header1, header2]
	let lastNg = ''
	const push = (vals: string[], bold?: boolean) => {
		tableRows.push(
			new TableRow({
				children: vals.map((v, i) =>
					cell(v, widths[i] ?? 400, {
						bold,
						center: i !== 1,
						fontSize: bold ? 12 : 11
					})
				)
			})
		)
	}

	for (const r of rows) {
		if (r.nganhLabel !== lastNg) {
			lastNg = r.nganhLabel
			const empty = widths.map(() => '')
			empty[1] = nganhSectionTitle(r.nganhLabel)
			push(empty, true)
		}
		push([
			r.code || '',
			r.name,
			r.dvt,
			String(r.grade),
			fmt(r.opening),
			fmt(r.increase),
			fmt(r.decrease),
			fmt(r.closing),
			...units.map((u) => fmt(r.byUnit[u.id] || 0))
		])
	}

	const sum = (fn: (r: PeriodMovementAgg) => number) =>
		rows.reduce((s, r) => s + fn(r), 0)
	push(
		[
			'',
			'TỔNG CỘNG',
			'',
			'',
			fmt(sum((r) => r.opening)),
			fmt(sum((r) => r.increase)),
			fmt(sum((r) => r.decrease)),
			fmt(sum((r) => r.closing)),
			...units.map((u) => fmt(sum((r) => r.byUnit[u.id] || 0)))
		],
		true
	)

	const children: (Paragraph | Table)[] = [
		p('BÁO CÁO TỔNG HỢP THỰC LỰC TRANG BỊ, VẬT TƯ KỸ THUẬT', {
			bold: true,
			center: true,
			size: 22,
			spaceAfter: 40
		}),
		p(`Số liệu từ ngày ${from} đến ngày ${to}`, {
			center: true,
			size: 16,
			spaceAfter: 60
		}),
		...(meta?.scopeLabel
			? [
					p(`Phạm vi: ${meta.scopeLabel}`, {
						center: true,
						italics: true,
						size: 14,
						spaceAfter: 40
					})
				]
			: []),
		new Table({
			width: {
				size: widths.reduce((a, b) => a + b, 0),
				type: WidthType.DXA
			},
			columnWidths: widths,
			rows: tableRows
		})
	]

	const doc = makeDoc(children, 'Báo cáo tổng hợp thực lực theo kỳ')
	await download(
		doc,
		meta?.filename || 'bao-cao-tong-hop-thuc-luc-theo-ky.docx'
	)
}

/**
 * Mẫu Image #3 — Giải thích tăng/giảm theo lý do.
 */
export async function exportPeriodTangGiamWord(
	rows: PeriodMovementAgg[],
	meta?: MilitaryReportMeta & { fromDate?: string; toDate?: string }
) {
	if (!rows.length) throw new Error('Không có dữ liệu tăng/giảm để xuất')

	const from = formatDateVN(meta?.fromDate) || '…'
	const to = formatDateVN(meta?.toDate) || formatDateVN(meta?.asOfDate) || '…'

	const incCols = [...INC_REASON_ORDER]
	const decCols = [...DEC_REASON_ORDER]
	// name | dvt | grade | tăng | giảm | +inc reasons | +dec reasons
	const fixed = [2200, 450, 450, 550, 550]
	const reasonCount = incCols.length + decCols.length
	const reasonBudget = CONTENT_W - fixed.reduce((a, b) => a + b, 0)
	const rw = Math.max(
		280,
		Math.floor(reasonBudget / Math.max(reasonCount, 1))
	)
	const widths = [
		...fixed,
		...incCols.map(() => rw),
		...decCols.map(() => rw)
	]
	const scale =
		widths.reduce((a, b) => a + b, 0) > CONTENT_W
			? CONTENT_W / widths.reduce((a, b) => a + b, 0)
			: 1
	const W = widths.map((w) => Math.floor(w * scale))

	const header1 = new TableRow({
		tableHeader: true,
		children: [
			cell('TÊN VẬT TƯ, TRANG BỊ', W[0], { header: true, center: false }),
			cell('ĐVT', W[1], { header: true }),
			cell('Phân\ncấp', W[2], { header: true, fontSize: 10 }),
			cell('Tăng', W[3], { header: true }),
			cell('Giảm', W[4], { header: true }),
			cell('Lý do tăng', rw, {
				header: true,
				colSpan: incCols.length,
				fontSize: 11
			}),
			cell('Lý do giảm', rw, {
				header: true,
				colSpan: decCols.length,
				fontSize: 11
			})
		]
	})
	const header2 = new TableRow({
		tableHeader: true,
		children: [
			cell('', W[0], { header: true }),
			cell('', W[1], { header: true }),
			cell('', W[2], { header: true }),
			cell('+', W[3], { header: true }),
			cell('−', W[4], { header: true }),
			...incCols.map((c, i) =>
				cell(reasonHeader(c, INCREASE_REASON_LABELS), W[5 + i], {
					header: true,
					fontSize: 9
				})
			),
			...decCols.map((c, i) =>
				cell(
					reasonHeader(c, DECREASE_REASON_LABELS),
					W[5 + incCols.length + i],
					{
						header: true,
						fontSize: 9
					}
				)
			)
		]
	})

	const tableRows: TableRow[] = [header1, header2]
	let lastNg = ''
	const push = (vals: string[], bold?: boolean) => {
		tableRows.push(
			new TableRow({
				children: vals.map((v, i) =>
					cell(v, W[i] ?? 300, {
						bold,
						center: i !== 0,
						fontSize: bold ? 12 : 10
					})
				)
			})
		)
	}

	for (const r of rows) {
		if (r.nganhLabel !== lastNg) {
			lastNg = r.nganhLabel
			const empty = W.map(() => '')
			empty[0] = nganhSectionTitle(r.nganhLabel)
			push(empty, true)
		}
		// Category-style total line then detail with grade
		push([
			r.name,
			r.dvt,
			String(r.grade),
			fmt(r.increase),
			fmt(r.decrease),
			...incCols.map((c) => fmt(r.incByReason[c] || 0)),
			...decCols.map((c) => fmt(r.decByReason[c] || 0))
		])
	}

	const sumInc = rows.reduce((s, r) => s + r.increase, 0)
	const sumDec = rows.reduce((s, r) => s + r.decrease, 0)
	push(
		[
			'TỔNG CỘNG',
			'',
			'',
			fmt(sumInc),
			fmt(sumDec),
			...incCols.map((c) =>
				fmt(rows.reduce((s, r) => s + (r.incByReason[c] || 0), 0))
			),
			...decCols.map((c) =>
				fmt(rows.reduce((s, r) => s + (r.decByReason[c] || 0), 0))
			)
		],
		true
	)

	const children: (Paragraph | Table)[] = [
		p('BÁO CÁO TĂNG, GIẢM THỰC LỰC TRANG BỊ, VẬT TƯ KỸ THUẬT', {
			bold: true,
			center: true,
			size: 22,
			spaceAfter: 40
		}),
		p(`Số liệu từ ngày ${from} đến ngày ${to}`, {
			center: true,
			size: 16,
			spaceAfter: 40
		}),
		p('GIẢI THÍCH TĂNG, GIẢM', {
			bold: true,
			center: true,
			size: 18,
			spaceAfter: 60
		}),
		...(meta?.scopeLabel
			? [
					p(`Phạm vi: ${meta.scopeLabel}`, {
						center: true,
						italics: true,
						size: 14,
						spaceAfter: 40
					})
				]
			: []),
		new Table({
			width: { size: W.reduce((a, b) => a + b, 0), type: WidthType.DXA },
			columnWidths: W,
			rows: tableRows
		})
	]

	const doc = makeDoc(children, 'Báo cáo tăng giảm thực lực vật tư')
	await download(
		doc,
		meta?.filename || 'bao-cao-tang-giam-thuc-luc-vat-tu.docx'
	)
}
