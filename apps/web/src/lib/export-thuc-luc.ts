/**
 * Báo cáo thống kê thực lực vật tư, trang bị kỹ thuật hiện có.
 * Layout bám mẫu QĐ: mã đơn vị viết tắt, header 2 tầng, KHO + TỔNG, nhóm theo loại.
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
	TabStopType,
	TextRun,
	UnderlineType,
	VerticalAlign,
	VerticalMergeType,
	WidthType,
	type ITableCellOptions
} from 'docx'
import type { RoomAsset } from '@/types/asset'
import type { MilitaryReportMeta } from '@/lib/export-asset-word'
import { extractNganhCode, findNganhByCode, nganhLabel } from '@/lib/nganh'
import {
	commanderSignLine,
	loadReportTemplate,
	recipientLines
} from '@/lib/report-template'

const FONT = 'Times New Roman'
const A4_W = 16838 // landscape
const A4_H = 11906
const MARGIN = 560
const CONTENT_W = A4_W - MARGIN * 2

export type ReportUnit = { id: number; name: string; alias?: string }

export type ThucLucAssetRow = RoomAsset & {
	roomCode?: string
	roomName?: string
	roomType?: string
	buildingName?: string
	buildingCode?: string
	floorName?: string
	isWarehouse?: boolean
}

/**
 * Một dòng = một (loại VT + phân cấp).
 * Cùng tên VT có 2 cấp → 2 dòng (xuống dòng như mẫu QĐ).
 * Nhóm đề mục: ngành (HC2A…) → loại vật (category) → dòng VT.
 */
export type ThucLucAggregateRow = {
	code: string
	name: string
	/** Loại vật / chuyên ngành (vd. Bảng tương tác, Máy in) */
	category: string
	/** Mã ngành 4 ký tự (HC2A) — suy ra từ mã VT */
	nganhCode: string
	/** Nhãn ngành: «HC2A — Công nghệ thông tin» */
	nganhLabel: string
	dvt: string
	/** Phân cấp 1–5 của dòng này */
	grade: number
	thucLucDate: string
	/** SL theo đơn vị — chỉ của đúng phân cấp này */
	byUnit: Record<number, number>
	kho: number
	/** Tổng SL dòng = thực lực ngày (số lượng đúng cấp) */
	total: number
}

/**
 * Suy ngành từ mã VT / mã danh mục.
 * nganhLabel = chỉ tên (vd. «Công nghệ thông tin») — dùng đề mục báo cáo, không kèm mã.
 * nganhCode = HC2A (sắp xếp / gộp).
 */
export function resolveNganhForAsset(code: string | null | undefined): {
	nganhCode: string
	nganhLabel: string
} {
	const nc = extractNganhCode(code)
	if (!nc) {
		return { nganhCode: '', nganhLabel: 'Chưa xác định ngành' }
	}
	const n = findNganhByCode(nc)
	// Chỉ tên ngành, không «HC2A — …»
	const nameOnly = n?.name?.trim() || nc
	return {
		nganhCode: nc,
		nganhLabel: nameOnly
	}
}

/** Dòng đề mục ngành trên báo cáo (Word/Excel): * Công nghệ thông tin */
export function nganhSectionTitle(nganhLabelText: string): string {
	let t = (nganhLabelText || 'Chưa xác định ngành').trim()
	// Bỏ mã nếu lỡ còn dạng «HC2A — Tên»
	t = t.replace(/^HC2[A-Z]\s*[—–-]\s*/i, '').trim() || t
	return t.startsWith('*') ? t : `* ${t}`
}

/** Mã cột ngắn (alias) — không lặp «Đại đội» */
export function unitColumnCode(u: ReportUnit): string {
	const a = (u.alias || '').trim()
	if (a) return a.toUpperCase()
	// fallback: viết tắt tên (bỏ Đại đội / Tiểu đoàn)
	const cleaned = u.name
		.replace(/đại\s*đội\s*/gi, 'D')
		.replace(/tiểu\s*đoàn\s*/gi, 'TD')
		.replace(/phòng\s*/gi, 'P')
		.replace(/khoa\s*/gi, 'K')
		.replace(/ban\s*/gi, 'B')
		.trim()
	const parts = cleaned.split(/\s+/).filter(Boolean)
	if (parts.length === 1) return parts[0].slice(0, 8).toUpperCase()
	return parts
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 8)
}

function run(
	text: string,
	opts?: {
		bold?: boolean
		size?: number
		italics?: boolean
		underline?: boolean
	}
) {
	return new TextRun({
		text,
		bold: opts?.bold,
		italics: opts?.italics,
		size: opts?.size ?? 18,
		font: FONT,
		underline: opts?.underline ? { type: UnderlineType.SINGLE } : undefined
	})
}

function p(
	text: string,
	opts?: {
		bold?: boolean
		size?: number
		center?: boolean
		right?: boolean
		spaceAfter?: number
		spaceBefore?: number
		italics?: boolean
		underline?: boolean
	}
) {
	let alignment = AlignmentType.LEFT
	if (opts?.center) alignment = AlignmentType.CENTER
	if (opts?.right) alignment = AlignmentType.RIGHT
	return new Paragraph({
		alignment,
		spacing: {
			after: opts?.spaceAfter ?? 40,
			before: opts?.spaceBefore ?? 0,
			line: 240
		},
		children: [
			run(text, {
				bold: opts?.bold,
				size: opts?.size,
				italics: opts?.italics,
				underline: opts?.underline
			})
		]
	})
}

function formatDateVN(iso: string | null | undefined): string {
	if (!iso) return ''
	const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
	if (m) return `${m[3]}/${m[2]}/${m[1]}`
	const d = new Date(
		iso.includes('T') || iso.includes(' ') ? iso.replace(' ', 'T') : iso
	)
	if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10)
	const dd = String(d.getDate()).padStart(2, '0')
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	return `${dd}/${mm}/${d.getFullYear()}`
}

function todayParts() {
	const d = new Date()
	return {
		day: String(d.getDate()).padStart(2, '0'),
		month: String(d.getMonth() + 1).padStart(2, '0'),
		year: String(d.getFullYear())
	}
}

function asOfDisplay(meta?: MilitaryReportMeta): string {
	if (meta?.asOfDate) return formatDateVN(meta.asOfDate)
	const t = todayParts()
	return `${t.day}/${t.month}/${t.year}`
}

const noBorder = {
	top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
	bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
	left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
	right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
}

function cell(
	text: string,
	w: number,
	opts?: {
		bold?: boolean
		header?: boolean
		center?: boolean
		columnSpan?: number
		verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType]
		fontSize?: number
	}
): TableCell {
	const span = opts?.columnSpan ?? 1
	const props: ITableCellOptions = {
		width: { size: w * span, type: WidthType.DXA },
		columnSpan: opts?.columnSpan,
		verticalMerge: opts?.verticalMerge,
		borders: {
			top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
		},
		margins: { top: 15, bottom: 15, left: 20, right: 20 },
		verticalAlign: VerticalAlign.CENTER,
		children: [
			new Paragraph({
				alignment: opts?.center
					? AlignmentType.CENTER
					: AlignmentType.LEFT,
				children: [
					new TextRun({
						text: text ?? '',
						bold: opts?.bold || opts?.header,
						size: opts?.fontSize ?? (opts?.header ? 13 : 12),
						font: FONT
					})
				]
			})
		]
	}
	if (opts?.header) props.shading = { fill: 'D9D9D9' }
	return new TableCell(props)
}

/**
 * Chỉ coi là kho khi phòng/vị trí thực sự là kho (không gán KHO chỉ vì chưa có holdingUnitId —
 * VT đang lắp ở lớp/phòng vẫn phải hiện đúng tòa, không dồn sang cột KHO).
 */
function isKhoAsset(a: ThucLucAssetRow): boolean {
	if (a.isWarehouse === true) return true
	// Ưu tiên loại phòng / tên phòng; tòa có chữ «kho» (vd «Nhà để xe / kho B») cũng là kho
	const roomPart = `${a.roomType || ''} ${a.roomName || ''} ${a.roomCode || ''}`
	if (/\bkho\b/i.test(roomPart) || /kho\s*vật\s*tư/i.test(roomPart))
		return true
	const bld = `${a.buildingName || ''} ${a.buildingCode || ''}`
	if (/\bkho\b/i.test(bld)) return true
	if (a.installAddress && /\bkho\b/i.test(a.installAddress)) return true
	return false
}

/**
 * Phân bổ SL: kho → cột KHO; có holdingUnitId khớp cột ĐV → cột đó;
 * còn lại (chưa gán ĐV, đang ở lớp) → chỉ cộng TỔNG, không đẩy sang KHO.
 */
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
	// chưa gán đơn vị + không phải kho: chỉ có total (đúng vị trí lắp đặt)
	return { byUnit, kho, total: qty }
}

/**
 * Gộp theo (ngành + loại vật + tên + ĐVT + phân cấp).
 * VD Switch 24 port cấp 2 SL 3 và cấp 3 SL 1 → 2 dòng xuống như mẫu.
 * Đề mục xuất file: ngành → loại vật (category).
 */
export function buildThucLucAggregate(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	opts?: { includeZeroQuantity?: boolean }
): ThucLucAggregateRow[] {
	type Acc = ThucLucAggregateRow & { _dateRaw: string }
	const map = new Map<string, Acc>()
	const keepZero = !!opts?.includeZeroQuantity

	for (const a of assets) {
		const qty = Number(a.quantity) || 0
		// Mặc định bỏ SL≤0; báo cáo theo chuyên ngành có thể giữ dòng danh mục SL=0
		if (qty < 0) continue
		if (qty === 0 && !keepZero) continue
		// Thanh lý không còn trong thực lực hiện có
		if (String(a.status || '').toUpperCase() === 'DISPOSED') continue
		const name = (a.name || '').trim() || '—'
		const gradeRaw = Number(a.grade ?? 1)
		const grade = gradeRaw >= 1 && gradeRaw <= 5 ? Math.round(gradeRaw) : 1
		const dvt = (a.unit || 'cái').trim() || 'cái'
		const category = (a.category || 'Khác').trim() || 'Khác'
		const { nganhCode, nganhLabel: nLabel } = resolveNganhForAsset(a.code)
		const key = `${nganhCode}|${category.toLowerCase()}|${name.toLowerCase()}|${dvt.toLowerCase()}|${grade}`
		let row = map.get(key)
		if (!row) {
			row = {
				code: a.code || '',
				name,
				category,
				nganhCode,
				nganhLabel: nLabel,
				dvt,
				grade,
				thucLucDate: formatDateVN(a.updatedAt),
				byUnit: Object.fromEntries(units.map((u) => [u.id, 0])),
				kho: 0,
				total: 0,
				_dateRaw: a.updatedAt || ''
			}
			map.set(key, row)
		} else {
			if (a.code && (!row.code || a.code.length < row.code.length)) {
				row.code = a.code
				// Cập nhật ngành nếu mã đầy đủ hơn
				const n2 = resolveNganhForAsset(a.code)
				row.nganhCode = n2.nganhCode
				row.nganhLabel = n2.nganhLabel
			}
			if (a.updatedAt && a.updatedAt > row._dateRaw) {
				row._dateRaw = a.updatedAt
				row.thucLucDate = formatDateVN(a.updatedAt)
			}
		}
		const alloc = allocateQty(a, units, qty)
		row.kho += alloc.kho
		row.total += alloc.total
		for (const u of units) {
			row.byUnit[u.id] =
				(row.byUnit[u.id] || 0) + (alloc.byUnit[u.id] || 0)
		}
	}

	return [...map.values()]
		.map(({ _dateRaw: _, ...r }) => r)
		.sort((a, b) => {
			const ng = a.nganhCode.localeCompare(b.nganhCode, 'vi')
			if (ng !== 0) return ng
			const c = a.category.localeCompare(b.category, 'vi')
			if (c !== 0) return c
			const n = a.name.localeCompare(b.name, 'vi')
			if (n !== 0) return n
			return a.grade - b.grade
		})
}

/** Đầu trang — bám form «Mẫu báo cáo» (ảnh #1) */
function militaryHeader(meta?: MilitaryReportMeta): (Paragraph | Table)[] {
	const t = loadReportTemplate()
	const superior = (
		meta?.superiorUnitName || t.superiorUnitName
	).toUpperCase()
	const unitName = (meta?.unitName || t.unitName).toUpperCase()
	const docNo = meta?.docNumber || t.docNumber
	const city = meta?.city || t.city
	const republic = (meta?.republic || t.republic).toUpperCase()
	const motto = meta?.motto || t.motto
	const { day, month, year } = todayParts()
	const leftW = Math.floor(CONTENT_W / 2)
	const rightW = CONTENT_W - leftW

	const left = [
		p(superior, { bold: true, center: true, size: 16, spaceAfter: 12 }),
		p(unitName, { bold: true, center: true, size: 18, spaceAfter: 12 }),
		p('————————', { center: true, size: 14, spaceAfter: 20 }),
		p(`Số: ${docNo}`, { center: true, size: 16 })
	]
	const right = [
		p(republic, {
			bold: true,
			center: true,
			size: 16,
			spaceAfter: 12
		}),
		p(motto, {
			bold: true,
			center: true,
			size: 16,
			underline: true,
			spaceAfter: 12
		}),
		p('————————', { center: true, size: 14, spaceAfter: 20 }),
		p(`${city}, ngày ${day} tháng ${month} năm ${year}`, {
			center: true,
			italics: true,
			size: 15
		})
	]

	return [
		new Table({
			width: { size: CONTENT_W, type: WidthType.DXA },
			columnWidths: [leftW, rightW],
			rows: [
				new TableRow({
					children: [
						new TableCell({
							width: { size: leftW, type: WidthType.DXA },
							borders: noBorder,
							children: left
						}),
						new TableCell({
							width: { size: rightW, type: WidthType.DXA },
							borders: noBorder,
							children: right
						})
					]
				})
			]
		}),
		p('', { spaceAfter: 60 })
	]
}

/** Cuối trang — bám form «Mẫu báo cáo» (ảnh #2) */
function signature(meta?: MilitaryReportMeta): (Paragraph | Table)[] {
	const t = loadReportTemplate()
	const pos = (meta?.commanderPosition || t.commanderPosition).toUpperCase()
	const name = commanderSignLine({
		...t,
		commanderRank:
			meta?.commanderRank !== undefined
				? meta.commanderRank
				: t.commanderRank,
		commanderName:
			meta?.commanderName !== undefined
				? meta.commanderName
				: t.commanderName
	})
	const hint = meta?.commanderHint || t.commanderHint
	const recTitle = meta?.recipientsTitle || t.recipientsTitle
	const recBody =
		meta?.recipients !== undefined && meta.recipients !== ''
			? meta.recipients
			: t.recipients
	const recs = recipientLines({ ...t, recipients: recBody })
	const leftW = Math.floor(CONTENT_W * 0.4)
	const rightW = CONTENT_W - leftW
	return [
		p('', { spaceBefore: 100 }),
		new Table({
			width: { size: CONTENT_W, type: WidthType.DXA },
			columnWidths: [leftW, rightW],
			rows: [
				new TableRow({
					children: [
						new TableCell({
							width: { size: leftW, type: WidthType.DXA },
							borders: noBorder,
							children: [
								p(recTitle, { bold: true, size: 14 }),
								...(recs.length
									? recs.map((line) => p(line, { size: 13 }))
									: [
											p('- Như trên;', { size: 13 }),
											p('- Lưu: VT, HC;', { size: 13 })
										])
							]
						}),
						new TableCell({
							width: { size: rightW, type: WidthType.DXA },
							borders: noBorder,
							children: [
								p(pos, { bold: true, center: true, size: 14 }),
								p(hint, {
									center: true,
									italics: true,
									size: 12,
									spaceAfter: 240
								}),
								p(name, { bold: true, center: true, size: 14 })
							]
						})
					]
				})
			]
		})
	]
}

/**
 * Bảng giống mẫu ảnh:
 * MÃ SỐ | TÊN VẬT TƯ TRANG BỊ | ĐVT | Phẩm (phân cấp) | Thực lực ngày … | ĐƠN VỊ… | KHO | TỔNG
 *
 * - Cột Phẩm / phân cấp = số cấp (1–5), không phải SL.
 * - Cột Thực lực ngày = số lượng đúng cấp đó.
 * - VT có 2 phân cấp → 2 dòng: dòng 1 ghi đủ mã/tên; dòng 2 để trống mã/tên (xuống dòng).
 */
function buildAggregateTable(
	rows: ThucLucAggregateRow[],
	units: ReportUnit[],
	asOf: string
): Table {
	// mã | tên | đvt | phẩm | thực lực | ...units | kho | tổng
	const fixed = [950, 2100, 500, 550, 850]
	const tail = 500
	const totalCol = 500
	const unitCount = Math.max(units.length, 1)
	const unitBudget =
		CONTENT_W - fixed.reduce((a, b) => a + b, 0) - tail - totalCol
	const unitW = Math.max(340, Math.floor(unitBudget / unitCount))
	const widths = [...fixed, ...units.map(() => unitW), tail, totalCol]
	const sumW = widths.reduce((a, b) => a + b, 0)
	const scale = sumW > CONTENT_W ? CONTENT_W / sumW : 1
	const W = widths.map((w) => Math.floor(w * scale))

	const colCount = W.length
	const unitStart = 5
	const unitEnd = 5 + units.length
	const khoIdx = unitEnd
	const tongIdx = unitEnd + 1

	const headerRow1 = new TableRow({
		tableHeader: true,
		children: [
			cell('MÃ SỐ', W[0], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART,
				fontSize: 11
			}),
			cell('TÊN VẬT TƯ TRANG BỊ', W[1], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART,
				fontSize: 11
			}),
			cell('ĐVT', W[2], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART,
				fontSize: 11
			}),
			cell('Phẩm', W[3], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART,
				fontSize: 11
			}),
			cell(`Thực lực\nngày ${asOf}`, W[4], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART,
				fontSize: 10
			}),
			...(units.length
				? [
						cell('THỰC LỰC CÁC ĐƠN VỊ', unitW, {
							header: true,
							center: true,
							columnSpan: units.length,
							fontSize: 11
						})
					]
				: []),
			cell('KHO', W[khoIdx], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART,
				fontSize: 11
			}),
			cell('TỔNG', W[tongIdx], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART,
				fontSize: 11
			})
		]
	})

	const headerRow2 = new TableRow({
		tableHeader: true,
		children: [
			cell('', W[0], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			}),
			cell('', W[1], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			}),
			cell('', W[2], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			}),
			// Phẩm = phân cấp (n)
			cell('n', W[3], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.CONTINUE,
				fontSize: 10
			}),
			cell('', W[4], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			}),
			...units.map((u, i) =>
				cell(unitColumnCode(u), W[unitStart + i], {
					header: true,
					center: true,
					fontSize: 10
				})
			),
			cell('', W[khoIdx], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			}),
			cell('', W[tongIdx], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			})
		]
	})

	const tableRows: TableRow[] = [headerRow1, headerRow2]

	let lastNganh = ''
	let lastCat = ''
	/** key name|dvt để biết dòng tiếp theo cùng VT → để trống mã/tên */
	let lastProductKey = ''

	const pushDataRow = (vals: string[], opts?: { bold?: boolean }) => {
		tableRows.push(
			new TableRow({
				children: vals.map((v, i) =>
					cell(v, W[i], {
						center: i !== 1,
						bold: opts?.bold,
						fontSize: opts?.bold ? 11 : 10
					})
				)
			})
		)
	}

	for (const r of rows) {
		// 1) Đề mục ngành (vd. * HC2A — Công nghệ thông tin)
		if (r.nganhLabel !== lastNganh) {
			lastNganh = r.nganhLabel
			lastCat = ''
			lastProductKey = ''
			const empty = Array(colCount).fill('')
			empty[1] = nganhSectionTitle(r.nganhLabel)
			pushDataRow(empty, { bold: true })
		}
		// 2) Đề mục loại vật / chuyên ngành (Bảng tương tác, Camera…)
		if (r.category !== lastCat) {
			lastCat = r.category
			lastProductKey = ''
			const empty = Array(colCount).fill('')
			empty[1] = r.category
			pushDataRow(empty, { bold: true })
		}

		const productKey = `${r.name}|${r.dvt}`.toLowerCase()
		const isContinue = productKey === lastProductKey
		if (!isContinue) lastProductKey = productKey

		// Dòng đầu của VT: mã + tên + ĐVT + phân cấp + SL
		// Dòng cấp tiếp theo (cùng VT): để trống mã/tên/ĐVT, chỉ ghi phân cấp + SL (xuống dòng như mẫu)
		const vals = [
			isContinue ? '' : r.code || '',
			isContinue ? '' : r.name,
			isContinue ? '' : r.dvt,
			String(r.grade), // Phẩm = phân cấp mấy
			String(r.total), // Thực lực ngày = số lượng đúng cấp này
			...units.map((u) => {
				const n = r.byUnit[u.id] || 0
				return n > 0 ? String(n) : ''
			}),
			r.kho > 0 ? String(r.kho) : '',
			String(r.total)
		]
		pushDataRow(vals)
	}

	const sumUnits = units.map((u) =>
		rows.reduce((s, r) => s + (r.byUnit[u.id] || 0), 0)
	)
	const sumKho = rows.reduce((s, r) => s + r.kho, 0)
	const sumAll = rows.reduce((s, r) => s + r.total, 0)
	const fmt = (n: number) => (n > 0 ? String(n) : '')

	pushDataRow(
		[
			'',
			'TỔNG CỘNG',
			'',
			'',
			String(sumAll),
			...sumUnits.map(fmt),
			fmt(sumKho),
			String(sumAll)
		],
		{ bold: true }
	)

	return new Table({
		width: { size: W.reduce((a, b) => a + b, 0), type: WidthType.DXA },
		columnWidths: W,
		rows: tableRows
	})
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

function makeLandscapeDoc(children: (Paragraph | Table)[], title: string) {
	return new Document({
		creator: 'QLHV - Quản lý vật tư',
		title,
		styles: {
			default: {
				document: { run: { font: FONT, size: 16 } }
			}
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

/**
 * 1. Xuất tổng hợp hiện có — giống mẫu: mã đơn vị, KHO, TỔNG.
 */
export async function exportThucLucTongHopWord(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	meta?: MilitaryReportMeta
) {
	const companyUnits =
		units.length > 0 ? units : [{ id: 0, name: '—', alias: '—' }]

	const rows = buildThucLucAggregate(assets, companyUnits, {
		includeZeroQuantity: !!meta?.includeZeroQuantity
	})
	if (!rows.length) {
		throw new Error('Không có dữ liệu thực lực để xuất')
	}

	const asOf = asOfDisplay(meta)

	const title =
		meta?.reportTitle ||
		'BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ, TRANG BỊ KỸ THUẬT HIỆN CÓ'
	const children: (Paragraph | Table)[] = [
		...militaryHeader(meta),
		p(title, {
			bold: true,
			center: true,
			size: 22,
			spaceAfter: 40
		}),
		p(`Số liệu đến ngày: ${asOf}`, {
			center: true,
			size: 16,
			spaceAfter: 80
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
		buildAggregateTable(rows, companyUnits, asOf),
		...signature(meta)
	]

	const doc = makeLandscapeDoc(
		children,
		meta?.reportTitle ||
			'Báo cáo thống kê thực lực vật tư, trang bị kỹ thuật hiện có'
	)
	await download(
		doc,
		meta?.filename || 'bao-cao-thong-ke-thuc-luc-vat-tu-tong-hop.docx'
	)
}

// ─── helpers vị trí / SL theo đơn vị ──────────────────────────────────────────

function locBuilding(a: ThucLucAssetRow): string {
	return (a.buildingName || '').trim() || 'Chưa xác định tòa'
}

function locRoomName(a: ThucLucAssetRow): string {
	return (a.roomName || a.roomCode || '').trim() || 'Chưa xác định phòng'
}

function locRoomCode(a: ThucLucAssetRow): string {
	const c = (a.roomCode || '').trim()
	if (c) return c
	// fallback: lấy mã ngắn từ tên phòng nếu có dạng H1.204
	const n = (a.roomName || '').trim()
	const m = n.match(/\b([A-Z]?\d+[.-]?\d+[A-Z]?)\b/i)
	return m ? m[1] : ''
}

/** Nhãn dòng phòng trên mẫu theo đơn vị: «Phòng H1.204» */
function locRoomHeader(a: ThucLucAssetRow): string {
	const code = locRoomCode(a)
	const name = locRoomName(a)
	if (code && name && !name.toLowerCase().includes(code.toLowerCase())) {
		return `Phòng ${code}`
	}
	if (code) return `Phòng ${code}`
	if (/^phòng/i.test(name)) return name
	return `Phòng ${name}`
}

function fmtQty(n: number): string {
	return n > 0 ? String(n) : ''
}

type QtySlice = {
	byUnit: Record<number, number>
	total: number
}

function emptySlice(units: ReportUnit[]): QtySlice {
	return {
		byUnit: Object.fromEntries(units.map((u) => [u.id, 0])),
		total: 0
	}
}

function addSlice(to: QtySlice, from: QtySlice, units: ReportUnit[]) {
	to.total += from.total
	for (const u of units) {
		to.byUnit[u.id] = (to.byUnit[u.id] || 0) + (from.byUnit[u.id] || 0)
	}
}

/** SL theo cột đơn vị — cùng quy tắc allocateQty (kho / ĐV / chỉ tổng) */
function unitQtyOf(a: ThucLucAssetRow, units: ReportUnit[]): QtySlice {
	const qty = Number(a.quantity) || 0
	if (qty <= 0) return emptySlice(units)
	if (String(a.status || '').toUpperCase() === 'DISPOSED') {
		return emptySlice(units)
	}
	const alloc = allocateQty(a, units, qty)
	return { byUnit: alloc.byUnit, total: alloc.total }
}

function unitCols(s: QtySlice, units: ReportUnit[]): string[] {
	return units.map((u) => fmtQty(s.byUnit[u.id] || 0))
}

function calcUnitWidths(fixed: number[], units: ReportUnit[]): number[] {
	const unitCount = Math.max(units.length, 1)
	const unitBudget = CONTENT_W - fixed.reduce((a, b) => a + b, 0)
	const unitW = Math.max(320, Math.floor(unitBudget / unitCount))
	const widths = [...fixed, ...units.map(() => unitW)]
	const sumW = widths.reduce((a, b) => a + b, 0)
	const scale = sumW > CONTENT_W ? CONTENT_W / sumW : 1
	return widths.map((w) => Math.floor(w * scale))
}

// ─── Mẫu ảnh 1: theo vị trí (VT → tòa → mã phòng) ────────────────────────────
/**
 * Một cột tên duy nhất (không kẻ dọc giữa tên / mã phòng):
 * MÃ SỐ | TÊN VẬT TƯ TRANG BỊ - VỊ TRÍ LẮP ĐẶT, Q.LÝ S.DỤNG | ĐVT | Thực lực | ĐV…
 *
 *   Công nghệ thông tin                         +  379
 *   HC2A0102  Máy tính Asus Core I3        Bộ    65
 *     1. Giảng đường khối Y          H2.101 +     1
 *     2. Giảng đường khối cơ sở             +    61
 *                                        H4.204   1
 */
function buildViTriHierarchyTable(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	asOf: string
): Table {
	// 0 mã | 1 tên/vị trí (1 ô) | 2 đvt | 3 thực lực | 4+ units
	const fixed = [1100, 4200, 500, 800]
	const W = calcUnitWidths(fixed, units)
	const unitStart = 4
	const nameIdx = 1

	const thin = {
		top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
		bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
		left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
		right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
	}

	const tableRows: TableRow[] = [
		new TableRow({
			tableHeader: true,
			children: [
				cell('MÃ SỐ', W[0], {
					header: true,
					center: true,
					verticalMerge: VerticalMergeType.RESTART,
					fontSize: 11
				}),
				cell('TÊN VẬT TƯ TRANG BỊ\nVỊ TRÍ LẮP ĐẶT, Q.LÝ S.DỤNG', W[1], {
					header: true,
					center: true,
					verticalMerge: VerticalMergeType.RESTART,
					fontSize: 10
				}),
				cell('ĐVT', W[2], {
					header: true,
					center: true,
					verticalMerge: VerticalMergeType.RESTART,
					fontSize: 11
				}),
				cell(`Thực lực\nngày ${asOf}`, W[3], {
					header: true,
					center: true,
					verticalMerge: VerticalMergeType.RESTART,
					fontSize: 10
				}),
				...(units.length
					? [
							cell('THỰC LỰC CÁC ĐƠN VỊ', W[unitStart], {
								header: true,
								center: true,
								columnSpan: units.length,
								fontSize: 11
							})
						]
					: [])
			]
		}),
		new TableRow({
			tableHeader: true,
			children: [
				cell('', W[0], {
					header: true,
					verticalMerge: VerticalMergeType.CONTINUE
				}),
				cell('', W[1], {
					header: true,
					verticalMerge: VerticalMergeType.CONTINUE
				}),
				cell('', W[2], {
					header: true,
					verticalMerge: VerticalMergeType.CONTINUE
				}),
				cell('', W[3], {
					header: true,
					verticalMerge: VerticalMergeType.CONTINUE
				}),
				...units.map((u, i) =>
					cell(unitColumnCode(u), W[unitStart + i], {
						header: true,
						center: true,
						fontSize: 10
					})
				)
			]
		})
	]

	type RowStyle = {
		bold?: boolean
		italics?: boolean
		/** dòng chỉ mã phòng — căn phải trong cùng ô tên */
		roomRow?: boolean
	}

	/** Lề trong ô tên (trái + phải) — tab phải = hết ô trừ margin */
	const nameMarginL = 40
	const nameMarginR = 40
	/** Vị trí tab phải (twip) trong paragraph ≈ bề rộng nội dung ô tên */
	const nameTabRight = Math.max(800, W[nameIdx] - nameMarginL - nameMarginR)

	/**
	 * Ô tên: 1 ô duy nhất, không kẻ dọc.
	 * - Có cả tên tòa + mã phòng → tên trái, mã phòng phải (tab stop RIGHT)
	 * - Chỉ mã phòng → căn phải
	 * - Chỉ tên → căn trái
	 */
	function buildNameParagraph(
		name: string,
		roomCode: string,
		style?: RowStyle
	): Paragraph {
		const runOpts = {
			bold: style?.bold,
			italics: style?.italics || style?.roomRow,
			size: style?.bold ? 12 : 11,
			font: FONT
		}
		const left = (name || '').trim()
		const right = (roomCode || '').trim()

		// Chỉ mã phòng (dòng con nhiều phòng)
		if (style?.roomRow && right && !left) {
			return new Paragraph({
				alignment: AlignmentType.RIGHT,
				spacing: { after: 0, before: 0, line: 220 },
				children: [new TextRun({ text: right, ...runOpts })]
			})
		}

		// Tên tòa + mã phòng cùng dòng: trái — tab — phải
		if (left && right) {
			return new Paragraph({
				alignment: AlignmentType.LEFT,
				spacing: { after: 0, before: 0, line: 220 },
				tabStops: [
					{
						type: TabStopType.RIGHT,
						position: nameTabRight
					}
				],
				children: [
					new TextRun({ text: left, ...runOpts }),
					new TextRun({ text: '\t', font: FONT, size: runOpts.size }),
					new TextRun({ text: right, ...runOpts })
				]
			})
		}

		// Chỉ tên / loại / VT
		return new Paragraph({
			alignment: AlignmentType.LEFT,
			spacing: { after: 0, before: 0, line: 220 },
			children: [new TextRun({ text: left || right || '', ...runOpts })]
		})
	}

	const pushRow = (
		code: string,
		name: string,
		roomCode: string,
		dvt: string,
		s: QtySlice,
		style?: RowStyle
	) => {
		const otherVals = [code, dvt, fmtQty(s.total), ...unitCols(s, units)]
		// indices in otherVals: 0=code, 1=dvt, 2=thuc luc, 3+=units
		// full row: code | nameCell | dvt | thuc | units...
		const cells: TableCell[] = [
			new TableCell({
				width: { size: W[0], type: WidthType.DXA },
				borders: thin,
				margins: { top: 12, bottom: 12, left: 16, right: 16 },
				verticalAlign: VerticalAlign.CENTER,
				children: [
					new Paragraph({
						alignment: AlignmentType.CENTER,
						spacing: { after: 0, before: 0, line: 220 },
						children: [
							new TextRun({
								text: code,
								bold: style?.bold,
								size: style?.bold ? 12 : 11,
								font: FONT
							})
						]
					})
				]
			}),
			new TableCell({
				width: { size: W[nameIdx], type: WidthType.DXA },
				borders: thin,
				margins: {
					top: 12,
					bottom: 12,
					left: nameMarginL,
					right: nameMarginR
				},
				verticalAlign: VerticalAlign.CENTER,
				children: [buildNameParagraph(name, roomCode, style)]
			}),
			...otherVals.slice(1).map((v, j) => {
				const colIdx = j + 2 // dvt=2, thuc=3, units=4...
				return new TableCell({
					width: { size: W[colIdx], type: WidthType.DXA },
					borders: thin,
					margins: { top: 12, bottom: 12, left: 16, right: 16 },
					verticalAlign: VerticalAlign.CENTER,
					children: [
						new Paragraph({
							alignment: AlignmentType.CENTER,
							spacing: { after: 0, before: 0, line: 220 },
							children: [
								new TextRun({
									text: v ?? '',
									bold: style?.bold,
									size: style?.bold ? 12 : 11,
									font: FONT
								})
							]
						})
					]
				})
			})
		]
		tableRows.push(new TableRow({ children: cells }))
	}

	// product → building → roomCode
	type RoomAcc = QtySlice
	type BldAcc = { total: QtySlice; rooms: Map<string, RoomAcc> }
	type ProdAcc = {
		code: string
		name: string
		dvt: string
		category: string
		nganhCode: string
		nganhLabel: string
		total: QtySlice
		byBld: Map<string, BldAcc>
	}

	const products = new Map<string, ProdAcc>()

	for (const a of assets) {
		const qty = Number(a.quantity) || 0
		if (qty <= 0) continue
		if (String(a.status || '').toUpperCase() === 'DISPOSED') continue
		const name = (a.name || '').trim() || '—'
		const dvt = (a.unit || 'cái').trim() || 'cái'
		const category = (a.category || 'Khác').trim() || 'Khác'
		const { nganhCode, nganhLabel: nLabel } = resolveNganhForAsset(a.code)
		const pkey = `${nganhCode}|${category.toLowerCase()}|${name.toLowerCase()}|${dvt.toLowerCase()}`
		let prod = products.get(pkey)
		if (!prod) {
			prod = {
				code: a.code || '',
				name,
				dvt,
				category,
				nganhCode,
				nganhLabel: nLabel,
				total: emptySlice(units),
				byBld: new Map()
			}
			products.set(pkey, prod)
		} else if (a.code && (!prod.code || a.code.length < prod.code.length)) {
			prod.code = a.code
			const n2 = resolveNganhForAsset(a.code)
			prod.nganhCode = n2.nganhCode
			prod.nganhLabel = n2.nganhLabel
		}

		const slice = unitQtyOf(a, units)
		if (slice.total <= 0) continue
		addSlice(prod.total, slice, units)

		const bld = locBuilding(a)
		let bAcc = prod.byBld.get(bld)
		if (!bAcc) {
			bAcc = { total: emptySlice(units), rooms: new Map() }
			prod.byBld.set(bld, bAcc)
		}
		addSlice(bAcc.total, slice, units)

		const rcode = locRoomCode(a) || locRoomName(a)
		let rAcc = bAcc.rooms.get(rcode)
		if (!rAcc) {
			rAcc = emptySlice(units)
			bAcc.rooms.set(rcode, rAcc)
		}
		addSlice(rAcc, slice, units)
	}

	// Ngành → loại vật → sản phẩm
	type CatGroup = { category: string; prods: ProdAcc[] }
	const byNganh = new Map<
		string,
		{ nganhLabel: string; nganhCode: string; cats: Map<string, CatGroup> }
	>()
	for (const prod of products.values()) {
		let ng = byNganh.get(prod.nganhCode)
		if (!ng) {
			ng = {
				nganhCode: prod.nganhCode,
				nganhLabel: prod.nganhLabel,
				cats: new Map()
			}
			byNganh.set(prod.nganhCode, ng)
		}
		let catG = ng.cats.get(prod.category)
		if (!catG) {
			catG = { category: prod.category, prods: [] }
			ng.cats.set(prod.category, catG)
		}
		catG.prods.push(prod)
	}
	const nganhKeys = [...byNganh.keys()].sort((a, b) =>
		a.localeCompare(b, 'vi')
	)
	const grand = emptySlice(units)

	for (const nk of nganhKeys) {
		const ng = byNganh.get(nk)
		if (!ng) continue
		const nganhSlice = emptySlice(units)
		const catKeys = [...ng.cats.keys()].sort((a, b) =>
			a.localeCompare(b, 'vi')
		)
		for (const ck of catKeys) {
			const group = ng.cats.get(ck)
			if (!group) continue
			for (const prod of group.prods) {
				addSlice(nganhSlice, prod.total, units)
			}
		}
		addSlice(grand, nganhSlice, units)
		// Đề mục ngành
		pushRow('', nganhSectionTitle(ng.nganhLabel), '', '+', nganhSlice, {
			bold: true
		})

		for (const ck of catKeys) {
			const catG = ng.cats.get(ck)
			if (!catG) continue
			const catSlice = emptySlice(units)
			const prods = catG.prods.sort((a, b) =>
				a.name.localeCompare(b.name, 'vi')
			)
			for (const prod of prods) addSlice(catSlice, prod.total, units)
			// Đề mục loại vật
			pushRow('', catG.category, '', '+', catSlice, { bold: true })

			for (const prod of prods) {
				pushRow(prod.code, prod.name, '', prod.dvt, prod.total)

				const blds = [...prod.byBld.entries()].sort((a, b) =>
					a[0].localeCompare(b[0], 'vi')
				)
				blds.forEach(([bld, bAcc], bi) => {
					const rooms = [...bAcc.rooms.entries()].sort((a, b) =>
						a[0].localeCompare(b[0], 'vi')
					)

					if (rooms.length === 1) {
						const [rcode, rAcc] = rooms[0]
						// 1. Tòa …        A-101  — cùng một ô, không kẻ dọc
						pushRow('', `  ${bi + 1}. ${bld}`, rcode, '+', rAcc, {
							italics: true
						})
					} else {
						pushRow(
							'',
							`  ${bi + 1}. ${bld}`,
							'',
							'+',
							bAcc.total,
							{ italics: true }
						)
						for (const [rcode, rAcc] of rooms) {
							pushRow('', '', rcode, '', rAcc, { roomRow: true })
						}
					}
				})
			}
		} // end catKeys
	} // end nganhKeys

	pushRow('', 'TỔNG CỘNG', '', '', grand, { bold: true })

	return new Table({
		width: { size: W.reduce((a, b) => a + b, 0), type: WidthType.DXA },
		columnWidths: W,
		rows: tableRows
	})
}

// ─── Mẫu ảnh 2: theo từng đơn vị (tòa → phòng → VT + cột đơn vị) ─────────────
/**
 * Đúng mẫu in: một bảng, cây VỊ TRÍ trước, cột đơn vị (BGH, PĐT…) bên phải.
 *
 *   1. Giảng đường khu B                    39   … cột ĐV
 *      Phòng H1.204
 *   HC2A0103  Máy tính Asus Core I5   Bộ   1   …
 *
 * layout tong_hop: tòa → danh sách VT (không dòng phòng)
 * layout vi_tri:   tòa → phòng → VT (đủ như mẫu)
 */
function buildDonViLocationTable(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	asOf: string,
	layout: 'tong_hop' | 'vi_tri'
): Table {
	// mã | vị trí / tên VT | đvt | thực lực | units…
	const fixed = [1100, 4200, 550, 800]
	const W = calcUnitWidths(fixed, units)
	const nameIdx = 1
	const dvtIdx = 2
	const thucIdx = 3

	const tableRows: TableRow[] = [
		new TableRow({
			tableHeader: true,
			children: [
				cell('MÃ SỐ', W[0], {
					header: true,
					center: true,
					verticalMerge: VerticalMergeType.RESTART,
					fontSize: 11
				}),
				cell('VỊ TRÍ Q.LÝ, S.DỤNG\nTÊN VẬT TƯ TRANG BỊ', W[1], {
					header: true,
					center: true,
					verticalMerge: VerticalMergeType.RESTART,
					fontSize: 10
				}),
				cell('ĐVT', W[dvtIdx], {
					header: true,
					center: true,
					verticalMerge: VerticalMergeType.RESTART,
					fontSize: 11
				}),
				cell(`Thực lực\nngày ${asOf}`, W[thucIdx], {
					header: true,
					center: true,
					verticalMerge: VerticalMergeType.RESTART,
					fontSize: 10
				}),
				...(units.length
					? [
							cell('THỰC LỰC CÁC ĐƠN VỊ', W[4] ?? 400, {
								header: true,
								center: true,
								columnSpan: units.length,
								fontSize: 11
							})
						]
					: [])
			]
		}),
		new TableRow({
			tableHeader: true,
			children: [
				cell('', W[0], {
					header: true,
					verticalMerge: VerticalMergeType.CONTINUE
				}),
				cell('', W[1], {
					header: true,
					verticalMerge: VerticalMergeType.CONTINUE
				}),
				cell('', W[dvtIdx], {
					header: true,
					verticalMerge: VerticalMergeType.CONTINUE
				}),
				cell('', W[thucIdx], {
					header: true,
					verticalMerge: VerticalMergeType.CONTINUE
				}),
				...units.map((u, i) =>
					cell(unitColumnCode(u), W[4 + i], {
						header: true,
						center: true,
						fontSize: 10
					})
				)
			]
		})
	]

	const pushRow = (
		vals: string[],
		opts?: { bold?: boolean; italics?: boolean }
	) => {
		tableRows.push(
			new TableRow({
				children: vals.map((v, i) => {
					const isName = i === nameIdx
					return new TableCell({
						width: { size: W[i], type: WidthType.DXA },
						borders: {
							top: {
								style: BorderStyle.SINGLE,
								size: 4,
								color: '000000'
							},
							bottom: {
								style: BorderStyle.SINGLE,
								size: 4,
								color: '000000'
							},
							left: {
								style: BorderStyle.SINGLE,
								size: 4,
								color: '000000'
							},
							right: {
								style: BorderStyle.SINGLE,
								size: 4,
								color: '000000'
							}
						},
						margins: { top: 15, bottom: 15, left: 20, right: 20 },
						verticalAlign: VerticalAlign.CENTER,
						children: [
							new Paragraph({
								alignment: isName
									? AlignmentType.LEFT
									: AlignmentType.CENTER,
								children: [
									new TextRun({
										text: v ?? '',
										bold: opts?.bold,
										italics: opts?.italics,
										size: opts?.bold ? 11 : 10,
										font: FONT
									})
								]
							})
						]
					})
				})
			})
		)
	}

	const rowVals = (code: string, name: string, dvt: string, s: QtySlice) => [
		code,
		name,
		dvt,
		fmtQty(s.total),
		...unitCols(s, units)
	]

	// building → roomKey → assets; dưới phòng/tòa: nhóm theo ngành → tên VT
	type AssetLine = {
		code: string
		name: string
		dvt: string
		nganhCode: string
		nganhLabel: string
		qty: QtySlice
	}
	type RoomBucket = {
		label: string
		roomCode: string
		total: QtySlice
		lines: Map<string, AssetLine>
	}
	type BldBucket = { total: QtySlice; rooms: Map<string, RoomBucket> }

	const buildings = new Map<string, BldBucket>()

	for (const a of assets) {
		const qty = Number(a.quantity) || 0
		if (qty <= 0) continue
		const bld = locBuilding(a)
		let b = buildings.get(bld)
		if (!b) {
			b = { total: emptySlice(units), rooms: new Map() }
			buildings.set(bld, b)
		}
		const slice = unitQtyOf(a, units)
		addSlice(b.total, slice, units)

		const rkey = `${locRoomCode(a)}|${locRoomName(a)}`.toLowerCase()
		let room = b.rooms.get(rkey)
		if (!room) {
			room = {
				label: locRoomHeader(a),
				roomCode: locRoomCode(a) || '',
				total: emptySlice(units),
				lines: new Map()
			}
			b.rooms.set(rkey, room)
		}
		addSlice(room.total, slice, units)

		const name = (a.name || '').trim() || '—'
		const dvt = (a.unit || 'cái').trim() || 'cái'
		const { nganhCode, nganhLabel: nLabel } = resolveNganhForAsset(a.code)
		const lkey = `${nganhCode}|${name.toLowerCase()}|${dvt.toLowerCase()}`
		let line = room.lines.get(lkey)
		if (!line) {
			line = {
				code: a.code || '',
				name,
				dvt,
				nganhCode,
				nganhLabel: nLabel,
				qty: emptySlice(units)
			}
			room.lines.set(lkey, line)
		} else if (a.code && (!line.code || a.code.length < line.code.length)) {
			line.code = a.code
		}
		addSlice(line.qty, slice, units)
	}

	/** In VT đã gộp, chèn dòng ngành trước nhóm VT */
	const pushLinesByNganh = (lines: AssetLine[], indent = '') => {
		const byNg = new Map<string, { label: string; items: AssetLine[] }>()
		for (const line of lines) {
			const k = line.nganhCode || '_'
			let g = byNg.get(k)
			if (!g) {
				g = { label: line.nganhLabel, items: [] }
				byNg.set(k, g)
			}
			g.items.push(line)
		}
		const keys = [...byNg.keys()].sort((a, c) => a.localeCompare(c, 'vi'))
		for (const k of keys) {
			const g = byNg.get(k)!
			// Dòng ngành: * Công nghệ thông tin
			pushRow(
				rowVals(
					'',
					`${indent}${nganhSectionTitle(g.label)}`,
					'',
					emptySlice(units)
				),
				{ bold: true }
			)
			const sorted = g.items.sort((a, c) =>
				a.name.localeCompare(c.name, 'vi')
			)
			for (const line of sorted) {
				pushRow(
					rowVals(
						line.code,
						`${indent}  ${line.name}`,
						line.dvt,
						line.qty
					)
				)
			}
		}
	}

	const bldNames = [...buildings.keys()].sort((a, b) =>
		a.localeCompare(b, 'vi')
	)
	if (!bldNames.length) {
		throw new Error('Không có dữ liệu theo đơn vị / vị trí')
	}

	const grand = emptySlice(units)

	bldNames.forEach((bld, bi) => {
		const b = buildings.get(bld)!
		addSlice(grand, b.total, units)

		const rooms = [...b.rooms.entries()].sort((a, c) =>
			a[1].label.localeCompare(c[1].label, 'vi')
		)

		// 1. Tòa/khu — nếu 1 phòng: mã phòng bên phải (cùng dòng); nhiều phòng: chỉ tên tòa
		if (layout === 'vi_tri' && rooms.length === 1) {
			const [, only] = rooms[0]
			const roomRight = only.roomCode || only.label
			// Ô tên: «1. Giảng đường khu B» + tab mã phòng (đẩy qua cột name bằng khoảng)
			pushRow(
				rowVals(
					'',
					`${bi + 1}. ${bld}${roomRight ? `    ${roomRight}` : ''}`,
					'',
					b.total
				),
				{ bold: true }
			)
			pushLinesByNganh([...only.lines.values()], '  ')
		} else {
			pushRow(rowVals('', `${bi + 1}. ${bld}`, '', b.total), {
				bold: true
			})

			if (layout === 'vi_tri') {
				for (const [, room] of rooms) {
					// Phòng H1.204 (căn/italics)
					pushRow(
						rowVals('', `  ${room.label}`, '', emptySlice(units)),
						{ italics: true }
					)
					pushLinesByNganh([...room.lines.values()], '    ')
				}
			} else {
				// tong_the: gộp VT trong tòa → nhóm ngành → VT
				const merged = new Map<string, AssetLine>()
				for (const [, room] of rooms) {
					for (const line of room.lines.values()) {
						const k = `${line.nganhCode}|${line.name.toLowerCase()}|${line.dvt.toLowerCase()}`
						const cur = merged.get(k)
						if (!cur) {
							merged.set(k, {
								code: line.code,
								name: line.name,
								dvt: line.dvt,
								nganhCode: line.nganhCode,
								nganhLabel: line.nganhLabel,
								qty: {
									...line.qty,
									byUnit: { ...line.qty.byUnit }
								}
							})
						} else {
							addSlice(cur.qty, line.qty, units)
							if (
								line.code &&
								(!cur.code ||
									line.code.length < cur.code.length)
							) {
								cur.code = line.code
							}
						}
					}
				}
				pushLinesByNganh([...merged.values()], '  ')
			}
		}
	})

	pushRow(rowVals('', 'TỔNG CỘNG', '', grand), { bold: true })

	return new Table({
		width: { size: W.reduce((a, b) => a + b, 0), type: WidthType.DXA },
		columnWidths: W,
		rows: tableRows
	})
}

/**
 * 2. Thống kê thực lực theo từng đơn vị — mẫu ảnh 2:
 * một bảng, nhóm theo tòa/khu → phòng → vật tư, cột đơn vị bên phải.
 */
export async function exportThucLucTheoDonViWord(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	meta?: MilitaryReportMeta,
	layout: 'tong_hop' | 'vi_tri' = 'tong_hop'
) {
	const companyUnits =
		units.length > 0 ? units : [{ id: 0, name: '—', alias: '—' }]
	const usable = assets.filter((a) => (Number(a.quantity) || 0) > 0)
	if (!usable.length) {
		throw new Error('Không có dữ liệu thực lực theo đơn vị để xuất')
	}

	const asOf = asOfDisplay(meta)
	// scopeLabel thường là «Tên tòa · …» — in như mẫu: Vị trí quản lý sử dụng: …
	const viTriLabel = meta?.scopeLabel
		? `Vị trí quản lý sử dụng: ${meta.scopeLabel.split(' · ')[0]}`
		: layout === 'vi_tri'
			? 'Vị trí quản lý sử dụng (chi tiết theo phòng)'
			: 'Vị trí quản lý sử dụng (tổng hợp theo tòa)'

	const children: (Paragraph | Table)[] = [
		...militaryHeader(meta),
		p('BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ, TRANG BỊ KỸ THUẬT HIỆN CÓ', {
			bold: true,
			center: true,
			size: 22,
			spaceAfter: 40
		}),
		p(viTriLabel, {
			center: true,
			italics: true,
			size: 15,
			spaceAfter: 20
		}),
		p(`Số liệu đến ngày: ${asOf}`, {
			center: true,
			size: 16,
			spaceAfter: 80
		}),
		buildDonViLocationTable(usable, companyUnits, asOf, layout),
		...signature(meta)
	]

	const doc = makeLandscapeDoc(
		children,
		'Báo cáo thống kê thực lực vật tư theo từng đơn vị'
	)
	const suffix = layout === 'vi_tri' ? 'theo-vi-tri' : 'tong-hop'
	await download(
		doc,
		meta?.filename ||
			`bao-cao-thong-ke-thuc-luc-vat-tu-theo-don-vi-${suffix}.docx`
	)
}

/**
 * Xuất theo vị trí lắp đặt — mẫu ảnh 1:
 * VT → 1. tòa/khu → mã phòng (cột gộp), cột đơn vị bên phải.
 */
export async function exportThucLucTheoViTriWord(
	assets: ThucLucAssetRow[],
	units: ReportUnit[],
	meta?: MilitaryReportMeta
) {
	const companyUnits =
		units.length > 0 ? units : [{ id: 0, name: '—', alias: '—' }]
	const asOf = asOfDisplay(meta)

	const usable = assets.filter((a) => (Number(a.quantity) || 0) > 0)
	if (!usable.length) {
		throw new Error('Không có dữ liệu theo vị trí lắp đặt')
	}

	const title =
		meta?.reportTitle ||
		'BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ, TRANG BỊ KỸ THUẬT HIỆN CÓ'
	const children: (Paragraph | Table)[] = [
		...militaryHeader(meta),
		p(title, {
			bold: true,
			center: true,
			size: 22,
			spaceAfter: 40
		}),
		p(`Số liệu đến ngày: ${asOf}`, {
			center: true,
			size: 16,
			spaceAfter: 80
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
		buildViTriHierarchyTable(usable, companyUnits, asOf),
		...signature(meta)
	]

	const doc = makeLandscapeDoc(
		children,
		meta?.reportTitle ||
			'Báo cáo thống kê thực lực vật tư theo vị trí lắp đặt'
	)
	await download(
		doc,
		meta?.filename || 'bao-cao-thong-ke-thuc-luc-vat-tu-theo-vi-tri.docx'
	)
}
