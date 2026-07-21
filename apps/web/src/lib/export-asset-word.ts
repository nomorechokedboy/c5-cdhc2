/**
 * Xuất báo cáo vật tư ra Word (.docx) theo kiểu văn bản / báo cáo quân đội VN.
 * (Quốc hiệu – Tiêu ngữ 2 cột, số hiệu, địa danh–ngày tháng, bảng, chữ ký chỉ huy)
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
	UnderlineType,
	VerticalAlign,
	WidthType,
	type ITableCellOptions
} from 'docx'
import type { AssetMovementReportRow } from '@/types/asset'
import type { WarehouseAssetRow } from '@/hooks/useAssetReports'
import { resolveInstallAddress } from '@/lib/export-asset-excel'
import {
	formatMovementReportNote,
	movementTypeLabel
} from '@/lib/asset-movement-labels'
import { formatMovementDate } from '@/lib/utils'
import {
	commanderSignLine,
	loadReportTemplate,
	recipientLines,
	type ReportTemplate
} from '@/lib/report-template'

/** Phân cấp báo cáo: chỉ số 1–5 */
function gradeNum(v: number | null | undefined): string {
	const n = Number(v ?? 1)
	if (!Number.isFinite(n) || n < 1) return '1'
	return String(Math.min(5, Math.round(n)))
}

/** A4 + lề kiểu văn bản hành chính (≈2cm) */
const A4_WIDTH_DXA = 11906
const A4_HEIGHT_DXA = 16838
const MARGIN_DXA = 1134 // ~2cm
const CONTENT_WIDTH = A4_WIDTH_DXA - MARGIN_DXA * 2 // 9638

const FONT = 'Times New Roman'

/** Thông tin hành chính kiểu báo cáo QĐ */

export type MilitaryReportMeta = {
	/** Dòng 2 trái — tên trường / đơn vị (vd. TRƯỜNG CAO ĐẲNG HẬU CẦN 2) */
	unitName?: string
	/** @deprecated — giữ tương thích; header dùng superiorUnitName + unitName */
	underUnitName?: string
	/** Dòng 1 trái (vd. TỔNG CỤC HẬU CẦN) */
	superiorUnitName?: string
	/** Số: ....../BC-CDHC */
	docNumber?: string
	/** Quốc hiệu */
	republic?: string
	/** Tiêu ngữ */
	motto?: string
	/** Địa danh (vd. Thành phố Hồ Chí Minh) */
	city?: string
	commanderPosition?: string
	commanderHint?: string
	commanderRank?: string
	commanderName?: string
	/** Nơi nhận — mỗi dòng một mục */
	recipientsTitle?: string
	recipients?: string
	scopeLabel?: string
	/** Số liệu đến ngày (DD/MM/YYYY hoặc YYYY-MM-DD) */
	asOfDate?: string
	/** Kính gửi (tùy chọn) */
	recipient?: string
	filename?: string
	/** Tiêu đề chính trên file (mặc định theo loại báo cáo) */
	reportTitle?: string
	/**
	 * Báo cáo theo chuyên ngành/danh mục: giữ dòng thiết bị SL = 0
	 * (đủ số mục trong Excel khi chọn chuyên ngành).
	 */
	includeZeroQuantity?: boolean
}

type HeaderFooterMeta = MilitaryReportMeta & {
	superiorUnitName: string
	unitName: string
	docNumber: string
	republic: string
	motto: string
	city: string
	commanderPosition: string
	commanderHint: string
	commanderRank: string
	commanderName: string
	recipientsTitle: string
	recipients: string
}

function templateToMeta(t: ReportTemplate): HeaderFooterMeta {
	return {
		superiorUnitName: t.superiorUnitName,
		unitName: t.unitName,
		docNumber: t.docNumber,
		republic: t.republic,
		motto: t.motto,
		city: t.city,
		commanderPosition: t.commanderPosition,
		commanderHint: t.commanderHint,
		commanderRank: t.commanderRank,
		commanderName: t.commanderName,
		recipientsTitle: t.recipientsTitle,
		recipients: t.recipients
	}
}

const DEFAULT_META = templateToMeta({
	superiorUnitName: 'TỔNG CỤC HẬU CẦN',
	unitName: 'TRƯỜNG CAO ĐẲNG HẬU CẦN 2',
	docNumber: '....../BC-CDHC',
	republic: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
	motto: 'Độc lập - Tự do - Hạnh phúc',
	city: 'Thành phố Hồ Chí Minh',
	recipientsTitle: 'Nơi nhận:',
	recipients: '- Như trên;\n- Lưu: VT, HC;',
	commanderPosition: 'CHỈ HUY ĐƠN VỊ',
	commanderHint: '(Ký, ghi rõ họ tên, cấp bậc)',
	commanderRank: '',
	commanderName: ''
})

function yearText(v: number | null | undefined): string {
	if (v === null || v === undefined) return ''
	const n = Number(v)
	if (!Number.isFinite(n) || n <= 0) return ''
	return String(n)
}

function sumQty(rows: WarehouseAssetRow[]): number {
	return rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
}

function todayParts() {
	const d = new Date()
	return {
		day: String(d.getDate()).padStart(2, '0'),
		month: String(d.getMonth() + 1).padStart(2, '0'),
		year: String(d.getFullYear())
	}
}

/**
 * Gộp mẫu đã lưu (localStorage) + override khi gọi xuất.
 * Đầu/cuối Word luôn bám form «Mẫu báo cáo».
 */
function mergeMeta(meta?: MilitaryReportMeta): HeaderFooterMeta {
	const fromTpl = templateToMeta(loadReportTemplate())
	return {
		...DEFAULT_META,
		...fromTpl,
		...meta,
		// Chuỗi rỗng từ meta không được xóa mất mẫu
		superiorUnitName:
			meta?.superiorUnitName?.trim() ||
			fromTpl.superiorUnitName ||
			DEFAULT_META.superiorUnitName,
		unitName:
			meta?.unitName?.trim() || fromTpl.unitName || DEFAULT_META.unitName,
		docNumber:
			meta?.docNumber?.trim() ||
			fromTpl.docNumber ||
			DEFAULT_META.docNumber,
		republic:
			meta?.republic?.trim() || fromTpl.republic || DEFAULT_META.republic,
		motto: meta?.motto?.trim() || fromTpl.motto || DEFAULT_META.motto,
		city: meta?.city?.trim() || fromTpl.city || DEFAULT_META.city,
		commanderPosition:
			meta?.commanderPosition?.trim() ||
			fromTpl.commanderPosition ||
			DEFAULT_META.commanderPosition,
		commanderHint:
			meta?.commanderHint?.trim() ||
			fromTpl.commanderHint ||
			DEFAULT_META.commanderHint,
		commanderRank:
			meta?.commanderRank !== undefined
				? meta.commanderRank
				: fromTpl.commanderRank,
		commanderName:
			meta?.commanderName !== undefined
				? meta.commanderName
				: fromTpl.commanderName,
		recipientsTitle:
			meta?.recipientsTitle?.trim() ||
			fromTpl.recipientsTitle ||
			DEFAULT_META.recipientsTitle,
		recipients:
			meta?.recipients !== undefined && meta.recipients !== ''
				? meta.recipients
				: fromTpl.recipients || DEFAULT_META.recipients
	}
}

async function downloadDocx(doc: Document, filename: string) {
	const blob = await Packer.toBlob(doc)
	if (!blob || blob.size === 0) {
		throw new Error('File Word rỗng — không tạo được nội dung')
	}
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename.endsWith('.docx') ? filename : `${filename}.docx`
	a.style.display = 'none'
	document.body.appendChild(a)
	a.click()
	// delay revoke so browser can start download
	setTimeout(() => {
		URL.revokeObjectURL(url)
		a.remove()
	}, 1500)
}

function run(
	text: string,
	opts?: {
		bold?: boolean
		size?: number
		italics?: boolean
		underline?: boolean
	}
): TextRun {
	return new TextRun({
		text,
		bold: opts?.bold,
		italics: opts?.italics,
		size: opts?.size ?? 26, // 13pt
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
		justify?: boolean
		spaceAfter?: number
		spaceBefore?: number
		italics?: boolean
		underline?: boolean
	}
): Paragraph {
	let alignment = AlignmentType.LEFT
	if (opts?.center) alignment = AlignmentType.CENTER
	else if (opts?.right) alignment = AlignmentType.RIGHT
	else if (opts?.justify) alignment = AlignmentType.BOTH
	return new Paragraph({
		alignment,
		spacing: {
			after: opts?.spaceAfter ?? 60,
			before: opts?.spaceBefore ?? 0,
			line: 276 // ~1.15
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

const noBorder = {
	top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
	bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
	left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
	right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
}

function borderlessCell(children: Paragraph[], width: number): TableCell {
	return new TableCell({
		width: { size: width, type: WidthType.DXA },
		borders: noBorder,
		verticalAlign: VerticalAlign.TOP,
		children
	})
}

/**
 * Đầu trang Word — mẫu ảnh #1 (2 cột).
 * Nội dung lấy từ form «Mẫu báo cáo» (localStorage).
 */
function militaryHeader(meta: HeaderFooterMeta): (Paragraph | Table)[] {
	const { day, month, year } = todayParts()
	const leftW = Math.floor(CONTENT_WIDTH / 2)
	const rightW = CONTENT_WIDTH - leftW

	const leftParas = [
		p(meta.superiorUnitName.toUpperCase(), {
			bold: true,
			center: true,
			size: 24,
			spaceAfter: 40
		}),
		p(meta.unitName.toUpperCase(), {
			bold: true,
			center: true,
			size: 24,
			spaceAfter: 40
		}),
		p('————————', { center: true, size: 20, spaceAfter: 60 }),
		p(`Số: ${meta.docNumber}`, {
			center: true,
			size: 24,
			spaceAfter: 40
		})
	]

	const rightParas = [
		p(meta.republic.toUpperCase(), {
			bold: true,
			center: true,
			size: 24,
			spaceAfter: 40
		}),
		p(meta.motto, {
			bold: true,
			center: true,
			size: 24,
			spaceAfter: 40,
			underline: true
		}),
		p('————————', { center: true, size: 20, spaceAfter: 60 }),
		p(`${meta.city}, ngày ${day} tháng ${month} năm ${year}`, {
			center: true,
			size: 24,
			italics: true,
			spaceAfter: 40
		})
	]

	return [
		new Table({
			width: { size: CONTENT_WIDTH, type: WidthType.DXA },
			columnWidths: [leftW, rightW],
			rows: [
				new TableRow({
					children: [
						borderlessCell(leftParas, leftW),
						borderlessCell(rightParas, rightW)
					]
				})
			]
		}),
		p('', { spaceAfter: 120 })
	]
}

function reportTitleBlock(params: {
	title: string
	about?: string
	scopeLabel?: string
	extraLines?: string[]
	recipient?: string
}): Paragraph[] {
	const out: Paragraph[] = [
		p('BÁO CÁO', {
			bold: true,
			center: true,
			size: 28,
			spaceBefore: 80,
			spaceAfter: 60
		}),
		p(params.title, {
			bold: true,
			center: true,
			size: 26,
			spaceAfter: 60
		})
	]
	if (params.about) {
		out.push(
			p(params.about, {
				center: true,
				italics: true,
				size: 24,
				spaceAfter: 60
			})
		)
	}
	if (params.scopeLabel) {
		out.push(
			p(`(Phạm vi: ${params.scopeLabel})`, {
				center: true,
				italics: true,
				size: 22,
				spaceAfter: 60
			})
		)
	}
	for (const line of params.extraLines ?? []) {
		out.push(p(line, { center: true, size: 22, spaceAfter: 40 }))
	}
	out.push(p('', { spaceAfter: 80 }))
	if (params.recipient) {
		out.push(
			p(`Kính gửi: ${params.recipient}`, {
				bold: true,
				size: 26,
				spaceAfter: 120
			})
		)
	}
	out.push(
		p(
			'Căn cứ chức năng, nhiệm vụ được giao; đơn vị báo cáo tình hình vật tư như sau:',
			{ justify: true, size: 26, spaceAfter: 160 }
		)
	)
	return out
}

/**
 * Cuối trang Word — mẫu ảnh #2 (Nơi nhận | Chữ ký chỉ huy).
 * Nội dung lấy từ form «Mẫu báo cáo».
 */
function militarySignature(meta: HeaderFooterMeta): (Paragraph | Table)[] {
	const leftW = Math.floor(CONTENT_WIDTH * 0.42)
	const rightW = CONTENT_WIDTH - leftW

	const left: Paragraph[] = [
		p(meta.recipientsTitle || 'Nơi nhận:', {
			bold: true,
			size: 24,
			spaceAfter: 40
		}),
		...recipientLines({
			...meta,
			recipients: meta.recipients
		} as ReportTemplate).map((line) =>
			p(line, { size: 22, spaceAfter: 20 })
		)
	]
	if (left.length === 1) {
		left.push(p('- Như trên;', { size: 22, spaceAfter: 20 }))
	}

	const right: Paragraph[] = [
		p(meta.commanderPosition.toUpperCase(), {
			bold: true,
			center: true,
			size: 24,
			spaceAfter: 40
		}),
		p(meta.commanderHint || '(Ký, ghi rõ họ tên, cấp bậc)', {
			center: true,
			italics: true,
			size: 20,
			spaceAfter: 400
		}),
		p(commanderSignLine(meta as ReportTemplate), {
			bold: true,
			center: true,
			size: 24,
			spaceAfter: 40
		})
	]

	return [
		p('', { spaceBefore: 200, spaceAfter: 80 }),
		new Table({
			width: { size: CONTENT_WIDTH, type: WidthType.DXA },
			columnWidths: [leftW, rightW],
			rows: [
				new TableRow({
					children: [
						borderlessCell(left, leftW),
						borderlessCell(right, rightW)
					]
				})
			]
		})
	]
}

/** Ô bảng kiểu báo cáo QĐ: viền đen, không nền xanh */
function cell(
	text: string,
	opts: {
		width: number
		bold?: boolean
		header?: boolean
		center?: boolean
	}
): TableCell {
	const props: ITableCellOptions = {
		width: { size: opts.width, type: WidthType.DXA },
		borders: {
			top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
		},
		margins: { top: 40, bottom: 40, left: 50, right: 50 },
		verticalAlign: VerticalAlign.CENTER,
		children: [
			new Paragraph({
				alignment: opts.center
					? AlignmentType.CENTER
					: AlignmentType.LEFT,
				children: [
					new TextRun({
						text: text ?? '',
						bold: opts.bold || opts.header,
						size: opts.header ? 20 : 18,
						font: FONT
					})
				]
			})
		]
	}
	if (opts.header) {
		props.shading = { fill: 'D9D9D9' }
	}
	return new TableCell(props)
}

function headerRow(labels: string[], widths: number[]): TableRow {
	return new TableRow({
		tableHeader: true,
		children: labels.map((label, i) =>
			cell(label, {
				width: widths[i],
				header: true,
				center: true,
				bold: true
			})
		)
	})
}

function dataRow(
	values: string[],
	widths: number[],
	opts?: { centerCols?: number[]; bold?: boolean }
): TableRow {
	return new TableRow({
		children: values.map((v, i) =>
			cell(v, {
				width: widths[i],
				center: opts?.centerCols?.includes(i),
				bold: opts?.bold
			})
		)
	})
}

/**
 * Chỉ lấy tên hiển thị — bỏ mã tòa/phòng/đơn vị.
 * VD:
 *   "CDHC2 / CDHC2-BTC — Ban Tài chính" → "Ban Tài chính"
 *   "CDHC2-BTC (Ban Tài chính)" → "Ban Tài chính"
 *   "CDHC2 / CDHC2-PTMHC (Phòng Tham mưu Hậu cần)" → "Phòng Tham mưu Hậu cần"
 *   "PTMHC — Phòng Tham mưu Hậu cần" → "Phòng Tham mưu Hậu cần"
 */
function nameOnly(label: string, fallback = ''): string {
	let s = safeText(label, fallback)
	if (!s) return fallback

	// 1) Tên trong ngoặc: "CDHC2-BTC (Ban Tài chính)" / "… / CDHC2-PTMHC (Phòng …)"
	const paren = s.match(/\(([^)]+)\)\s*$/)
	if (paren?.[1]?.trim()) {
		return paren[1].trim()
	}

	// 2) Phần sau gạch ngang dài: "PTMHC — Phòng Tham mưu…"
	const em = s.split(/\s*[—–]\s*/)
	if (em.length > 1) {
		const tail = em[em.length - 1]?.trim()
		if (tail) {
			const p2 = tail.match(/\(([^)]+)\)\s*$/)
			if (p2?.[1]?.trim()) return p2[1].trim()
			// Bỏ tiền tố mã kiểu "CDHC2-BTC " nếu còn
			const noCode = tail
				.replace(/^[A-Z0-9]+(?:-[A-Z0-9]+)+\s+/i, '')
				.trim()
			return noCode || tail
		}
	}

	// 3) Phần sau "/": "CDHC2 / CDHC2-BTC (…)" hoặc "CDHC2 / Ban Tài chính"
	const slash = s.split(/\s*\/\s*/)
	if (slash.length > 1) {
		let tail = slash[slash.length - 1]?.trim() || ''
		const p3 = tail.match(/\(([^)]+)\)\s*$/)
		if (p3?.[1]?.trim()) return p3[1].trim()
		// Chỉ còn mã thuần → không dùng làm tên
		if (/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(tail)) {
			// lấy phần trước nếu có tên
			const head = slash
				.slice(0, -1)
				.join(' / ')
				.replace(/^[A-Z0-9]+(?:-[A-Z0-9]+)*\s*/i, '')
				.trim()
			if (head && !/^[A-Z0-9-]+$/i.test(head)) return head
			return fallback || tail
		}
		tail = tail.replace(/^[A-Z0-9]+(?:-[A-Z0-9]+)+\s+/i, '').trim()
		if (tail) return tail
	}

	// 4) Chuỗi chỉ là mã (CDHC2-BTC) → fallback
	if (/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(s)) {
		return fallback || s
	}

	// 5) Bỏ tiền tố mã đầu chuỗi: "CDHC2-BTC Ban Tài chính"
	s = s.replace(/^[A-Z0-9]+(?:-[A-Z0-9]+)+\s+/i, '').trim()
	return s || fallback
}

function sectionTitle(
	text: string,
	level: 'I' | 'II' | 'dot' = 'I'
): Paragraph {
	return p(text, {
		bold: true,
		size: level === 'dot' ? 24 : 26,
		spaceBefore: level === 'dot' ? 160 : 200,
		spaceAfter: 100
	})
}

function brokenReason(r: WarehouseAssetRow): string {
	return String(r.description ?? '').trim()
}

function stableWarehouseTable(items: WarehouseAssetRow[]): {
	rows: TableRow[]
	widths: number[]
} {
	const widths = [500, 2800, 800, 1000, 1000, 900, 2638]
	const labels = [
		'STT',
		'Tên thiết bị',
		'SL',
		'Năm SX',
		'Năm SD',
		'Phân cấp',
		'Địa chỉ lắp đặt'
	]
	const rows: TableRow[] = [headerRow(labels, widths)]
	if (!items.length) {
		rows.push(
			dataRow(['', 'Không có dữ liệu', '', '', '', '', ''], widths, {
				centerCols: [1]
			})
		)
		return { rows, widths }
	}
	items.forEach((r, i) => {
		rows.push(
			dataRow(
				[
					String(i + 1),
					r.name || '',
					String(Number(r.quantity) || 0),
					yearText(r.manufactureYear),
					yearText(r.usageYear),
					gradeNum(r.grade),
					resolveInstallAddress(r)
				],
				widths,
				{ centerCols: [0, 2, 3, 4, 5] }
			)
		)
	})
	return { rows, widths }
}

function brokenWarehouseTable(items: WarehouseAssetRow[]): {
	rows: TableRow[]
	widths: number[]
} {
	const widths = [450, 1900, 650, 800, 800, 700, 1600, 1838, 900]
	const labels = [
		'STT',
		'Tên thiết bị',
		'SL',
		'Năm SX',
		'Năm SD',
		'Phân cấp',
		'Địa chỉ lắp đặt',
		'Lý do hỏng',
		'Ngày hư'
	]
	const rows: TableRow[] = [headerRow(labels, widths)]
	if (!items.length) {
		rows.push(
			dataRow(
				['', 'Không có dữ liệu', '', '', '', '', '', '', ''],
				widths,
				{ centerCols: [1] }
			)
		)
		return { rows, widths }
	}
	items.forEach((r, i) => {
		rows.push(
			dataRow(
				[
					String(i + 1),
					r.name || '',
					String(Number(r.quantity) || 0),
					yearText(r.manufactureYear),
					yearText(r.usageYear),
					gradeNum(r.grade),
					resolveInstallAddress(r),
					brokenReason(r) || '—',
					r.brokenAt || ''
				],
				widths,
				{ centerCols: [0, 2, 3, 4, 5, 8] }
			)
		)
	})
	return { rows, widths }
}

function warehouseTwoTables(
	stable: WarehouseAssetRow[],
	broken: WarehouseAssetRow[]
): (Paragraph | Table)[] {
	const s = stableWarehouseTable(stable)
	const b = brokenWarehouseTable(broken)
	return [
		sectionTitle('I. Kho vật tư hoạt động ổn định'),
		p(`Tổng số lượng: ${sumQty(stable)}; số dòng: ${stable.length}.`, {
			size: 24,
			spaceAfter: 80
		}),
		new Table({
			width: {
				size: s.widths.reduce((a, c) => a + c, 0),
				type: WidthType.DXA
			},
			columnWidths: s.widths,
			rows: s.rows
		}),
		sectionTitle('II. Kho vật tư đang sửa chữa và hư hại'),
		p(`Tổng số lượng: ${sumQty(broken)}; số dòng: ${broken.length}.`, {
			size: 24,
			spaceAfter: 80
		}),
		new Table({
			width: {
				size: b.widths.reduce((a, c) => a + c, 0),
				type: WidthType.DXA
			},
			columnWidths: b.widths,
			rows: b.rows
		})
	]
}

function makeDoc(children: (Paragraph | Table)[], title: string): Document {
	return new Document({
		creator: 'QLHV - Quản lý vật tư',
		title,
		styles: {
			default: {
				document: {
					run: { font: FONT, size: 26 }
				}
			}
		},
		sections: [
			{
				properties: {
					page: {
						size: { width: A4_WIDTH_DXA, height: A4_HEIGHT_DXA },
						margin: {
							top: MARGIN_DXA,
							bottom: MARGIN_DXA,
							left: MARGIN_DXA,
							right: MARGIN_DXA
						}
					}
				},
				children
			}
		]
	})
}

function wrapReport(
	titleMain: string,
	about: string,
	body: (Paragraph | Table)[],
	meta?: MilitaryReportMeta,
	filename?: string
) {
	const m = mergeMeta(meta)
	const children: (Paragraph | Table)[] = [
		...militaryHeader(m),
		...reportTitleBlock({
			title: titleMain,
			about,
			scopeLabel: m.scopeLabel,
			recipient: m.recipient
		}),
		...body,
		...militarySignature(m)
	]
	return { children, m, filename: filename || m.filename }
}

/** Báo cáo kho vật tư (tổng hợp) */
export async function exportWarehouseAssetsWord(
	stable: WarehouseAssetRow[],
	broken: WarehouseAssetRow[],
	opts?: MilitaryReportMeta
) {
	const { children, filename } = wrapReport(
		'VỀ TÌNH HÌNH KHO VẬT TƯ',
		'(Tổng hợp tồn kho)',
		[
			p(
				`Tổng hợp: SL ổn định ${sumQty(stable)} (${stable.length} dòng); SL hư hại ${sumQty(broken)} (${broken.length} dòng).`,
				{ size: 24, spaceAfter: 120 }
			),
			...warehouseTwoTables(stable, broken)
		],
		opts
	)
	const doc = makeDoc(children, 'Báo cáo kho vật tư')
	await downloadDocx(doc, filename || 'bao-cao-kho-vat-tu.docx')
}

/** Báo cáo hư hại & sửa chữa (tổng hợp) */
export async function exportDamagedRepairAssetsWord(
	broken: WarehouseAssetRow[],
	opts?: MilitaryReportMeta
) {
	const b = brokenWarehouseTable(broken)
	const { children, filename } = wrapReport(
		'VỀ VẬT TƯ ĐANG HƯ HẠI VÀ SỬA CHỮA',
		'(Chi tiết kho hư hại / đang sửa chữa)',
		[
			p(`Tổng số lượng: ${sumQty(broken)}; số dòng: ${broken.length}.`, {
				size: 24,
				spaceAfter: 120
			}),
			new Table({
				width: {
					size: b.widths.reduce((a, c) => a + c, 0),
					type: WidthType.DXA
				},
				columnWidths: b.widths,
				rows: b.rows
			})
		],
		opts
	)
	const doc = makeDoc(children, 'Báo cáo vật tư đang hư hại và sửa chữa')
	await downloadDocx(
		doc,
		filename || 'bao-cao-vat-tu-dang-hu-hai-va-sua-chua.docx'
	)
}

export type WarehouseGroupBy = 'building' | 'room'

/** Hư hại & SC theo tòa / theo lớp */
export async function exportDamagedRepairGroupedWord(
	broken: WarehouseAssetRow[],
	opts: MilitaryReportMeta & { groupBy: WarehouseGroupBy }
) {
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
					? `${r.roomName || r.roomCode}${r.buildingName ? ` — ${r.buildingName}` : ''}`
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

	const isRoom = opts.groupBy === 'room'
	const about = isRoom ? '(Theo từng lớp / phòng)' : '(Theo từng tòa nhà)'

	const indexWidths = [600, 5200, 1800, 1800]
	const indexRows: TableRow[] = [
		headerRow(
			['STT', isRoom ? 'Lớp / Phòng' : 'Tòa nhà', 'SL hư hại', 'Số dòng'],
			indexWidths
		)
	]
	groups.forEach((g, i) => {
		indexRows.push(
			dataRow(
				[
					String(i + 1),
					g.label,
					String(sumQty(g.items)),
					String(g.items.length)
				],
				indexWidths,
				{ centerCols: [0, 2, 3] }
			)
		)
	})

	const body: (Paragraph | Table)[] = [
		sectionTitle('I. Tóm tắt theo nhóm'),
		new Table({
			width: {
				size: indexWidths.reduce((a, b) => a + b, 0),
				type: WidthType.DXA
			},
			columnWidths: indexWidths,
			rows: indexRows
		}),
		sectionTitle('II. Chi tiết từng nhóm')
	]

	groups.forEach((g, gi) => {
		const t = brokenWarehouseTable(g.items)
		body.push(
			sectionTitle(`${gi + 1}. ${g.label}`, 'dot'),
			p(`Tổng SL: ${sumQty(g.items)}; số dòng: ${g.items.length}.`, {
				size: 22,
				spaceAfter: 80
			}),
			new Table({
				width: {
					size: t.widths.reduce((a, c) => a + c, 0),
					type: WidthType.DXA
				},
				columnWidths: t.widths,
				rows: t.rows
			})
		)
	})

	const { children, filename } = wrapReport(
		'VỀ VẬT TƯ ĐANG HƯ HẠI VÀ SỬA CHỮA',
		about,
		body,
		opts
	)
	const doc = makeDoc(children, 'Báo cáo hư hại và sửa chữa')
	const prefix = isRoom
		? 'bao-cao-hu-hai-sua-chua-theo-lop'
		: 'bao-cao-hu-hai-sua-chua-theo-toa'
	await downloadDocx(doc, filename || `${prefix}.docx`)
}

/** Kho theo tòa / theo lớp */
export async function exportWarehouseGroupedWord(
	stable: WarehouseAssetRow[],
	broken: WarehouseAssetRow[],
	opts: MilitaryReportMeta & { groupBy: WarehouseGroupBy }
) {
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
					? `${r.roomName || r.roomCode}${r.buildingName ? ` — ${r.buildingName}` : ''}`
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

	const isRoom = opts.groupBy === 'room'
	const indexWidths = [600, 4200, 1600, 1600, 1400]
	const indexRows: TableRow[] = [
		headerRow(
			[
				'STT',
				isRoom ? 'Lớp / Phòng' : 'Tòa nhà',
				'SL ổn định',
				'SL hư hại',
				'Số dòng'
			],
			indexWidths
		)
	]
	groups.forEach((g, i) => {
		indexRows.push(
			dataRow(
				[
					String(i + 1),
					g.label,
					String(sumQty(g.stable)),
					String(sumQty(g.broken)),
					String(g.stable.length + g.broken.length)
				],
				indexWidths,
				{ centerCols: [0, 2, 3, 4] }
			)
		)
	})

	const body: (Paragraph | Table)[] = [
		sectionTitle('I. Tóm tắt theo nhóm'),
		p(`Số nhóm: ${groups.length}.`, { size: 24, spaceAfter: 80 }),
		new Table({
			width: {
				size: indexWidths.reduce((a, b) => a + b, 0),
				type: WidthType.DXA
			},
			columnWidths: indexWidths,
			rows: indexRows
		}),
		sectionTitle('II. Chi tiết từng nhóm')
	]

	groups.forEach((g, gi) => {
		body.push(
			sectionTitle(`${gi + 1}. ${g.label}`, 'dot'),
			p(
				`SL ổn định: ${sumQty(g.stable)}; SL hư hại: ${sumQty(g.broken)}.`,
				{ size: 22, spaceAfter: 80 }
			),
			...warehouseTwoTables(g.stable, g.broken)
		)
	})

	const { children, filename } = wrapReport(
		'VỀ TÌNH HÌNH KHO VẬT TƯ',
		isRoom ? '(Theo từng lớp / phòng)' : '(Theo từng tòa nhà)',
		body,
		opts
	)
	const doc = makeDoc(
		children,
		isRoom ? 'Báo cáo kho theo lớp' : 'Báo cáo kho theo tòa'
	)
	const prefix = isRoom ? 'bao-cao-kho-theo-lop' : 'bao-cao-kho-theo-toa'
	await downloadDocx(doc, filename || `${prefix}.docx`)
}

const UPDATE_MOVEMENT_TYPES = new Set(['INCREASE', 'DECREASE', 'ADJUST'])

/** Nhật ký cập nhật (chỉ tăng / giảm / điều chỉnh) */
export async function exportAssetMovementsWord(
	rows: AssetMovementReportRow[],
	opts?: MilitaryReportMeta
) {
	const onlyUpdates = rows.filter((r) =>
		UPDATE_MOVEMENT_TYPES.has(r.movementType)
	)
	const widths = [500, 1000, 1100, 2100, 700, 700, 700, 1800, 1200, 1338]
	const tableRows: TableRow[] = [
		headerRow(
			[
				'STT',
				'Ngày',
				'Loại',
				'Tên thiết bị',
				'SL',
				'Trước',
				'Sau',
				'Vị trí',
				'Người TH',
				'Ghi chú'
			],
			widths
		)
	]

	const formatDt = (
		executedAt?: string | null,
		createdAt?: string | null
	) => {
		const s = formatMovementDate(executedAt, createdAt)
		return s === '—' ? '' : s
	}

	onlyUpdates.forEach((r, i) => {
		const location = [
			r.buildingName || r.buildingCode,
			r.roomName || r.roomCode
		]
			.filter(Boolean)
			.join(' / ')
		// Lý do + có đề xuất từ ai không + ai phê duyệt
		const note = formatMovementReportNote(r)
		tableRows.push(
			dataRow(
				[
					String(i + 1),
					formatDt(r.executedAt, r.createdAt),
					movementTypeLabel(r.movementType),
					r.assetName || r.assetCode || '',
					String(r.quantity ?? 0),
					String(r.quantityBefore ?? ''),
					String(r.quantityAfter ?? ''),
					location,
					r.performer || '',
					note
				],
				widths,
				{ centerCols: [0, 1, 4, 5, 6] }
			)
		)
	})

	const { children, filename } = wrapReport(
		'VỀ NHẬT KÝ CẬP NHẬT VẬT TƯ',
		'(Tăng / giảm / điều chỉnh)',
		[
			p(`Tổng số giao dịch: ${onlyUpdates.length}.`, {
				size: 24,
				spaceAfter: 120
			}),
			new Table({
				width: {
					size: widths.reduce((a, b) => a + b, 0),
					type: WidthType.DXA
				},
				columnWidths: widths,
				rows: tableRows
			})
		],
		opts
	)
	const doc = makeDoc(children, 'Báo cáo nhật ký cập nhật vật tư')
	await downloadDocx(doc, filename || 'bao-cao-cap-nhat-vat-tu.docx')
}

// ── Quyết định điều động / thu hồi ─────────────────────────────

/** Một dòng trang bị trên bảng Quyết định (không ghi mã số) */
export type TransferDecisionLine = {
	name: string
	/** Đơn vị tính (Chiếc, Bộ, Cái…) */
	unit?: string | null
	grade?: number | null
	quantity: number
	note?: string
}

export type TransferDecisionExportInput = {
	mode?: 'TRANSFER' | 'RECALL'
	/** Tên phòng nguồn */
	sourceRoomLabel: string
	/** Tên phòng đích (= đơn vị giữ/sử dụng) */
	targetRoomLabel: string
	lines: TransferDecisionLine[]
	/** «Theo đề nghị của Trưởng …» */
	proposedBy?: string
	/** Lý do bổ sung */
	reasonExtra?: string
	decisionDate?: string
	/** Số quyết định — in trên đầu văn bản (Số: …/QĐ-…) */
	decisionNumber?: string
	executedAt?: string
	signer?: string
	performer?: string
	/** Đơn vị thực hiện (đã chọn) — ghi trong căn cứ / giao nhiệm vụ */
	executingUnit?: string
	/** Nơi nhận (mỗi dòng một mục) */
	recipients?: string[]
	meta?: MilitaryReportMeta
}

function safeText(v: unknown, fallback = ''): string {
	if (v === null || v === undefined) return fallback
	return String(v).replace(/\0/g, '').trim() || fallback
}

/** Parse «nguồn → đích» từ diễn giải log điều động/thu hồi */
function parseRouteFromExplanation(explanation?: string | null): {
	source: string
	target: string
	ok: boolean
} {
	const exp = safeText(explanation)
	// Điều động: A → B (SL n)  |  Thu hồi: A → B (SL n)
	const m = exp.match(
		/^(?:Điều động|Thu hồi)\s*:\s*(.+?)\s*→\s*(.+?)(?:\s*\(SL|\s*$)/i
	)
	if (m) {
		return {
			source: safeText(m[1], 'phòng nguồn'),
			target: safeText(m[2], 'phòng đích'),
			ok: true
		}
	}
	// Fallback: "A → B"
	const arrow = exp.split(/\s*→\s*/)
	if (arrow.length >= 2) {
		return {
			source: safeText(
				arrow[0].replace(/^(?:Điều động|Thu hồi)\s*:\s*/i, ''),
				'phòng nguồn'
			),
			target: safeText(arrow[1].replace(/\(SL.*$/i, ''), 'phòng đích'),
			ok: true
		}
	}
	return { source: 'phòng nguồn', target: 'phòng đích', ok: false }
}

/**
 * Suy ĐVT từ tên trang bị khi log không lưu unit.
 * Khớp thói quen dữ liệu hiện có: Bộ / Cái / Chiếc.
 */
export function inferAssetUnit(
	name?: string | null,
	category?: string | null
): string {
	const hay = `${name ?? ''} ${category ?? ''}`.toLocaleLowerCase('vi')
	if (!hay.trim()) return 'Cái'
	// Laptop
	if (/xách tay|laptop|notebook/.test(hay)) return 'Chiếc'
	// Bộ: máy tính để bàn, máy chủ, máy chiếu, màn hình led, rack…
	if (
		/máy tính để bàn|máy tính\b|máy chủ|máy chiếu|màn hình led|tủ rack|bảng tương tác/.test(
			hay
		)
	) {
		return 'Bộ'
	}
	// Cái: máy in, fax, scan, camera, switch, router, converter, photo…
	if (
		/máy in|máy fax|máy scan|scanner|camera|switch|router|converter|photo|hủy tài liệu|quang/.test(
			hay
		)
	) {
		return 'Cái'
	}
	// Mặc định theo nhóm còn lại
	if (/máy tính/.test(hay)) return 'Bộ'
	return 'Cái'
}

/**
 * Chuẩn hóa «Trưởng …» — chỉ tên đơn vị, không mã (PTMHC → Phòng Tham mưu Hậu cần).
 * VD: "Trưởng PTMHC — Phòng Tham mưu Hậu cần" → "Trưởng Phòng Tham mưu Hậu cần"
 */
function formatProposedBy(raw?: string | null): string {
	const s = safeText(raw, 'đồng chí Trưởng ban / Trưởng phòng có liên quan')
	// Bỏ prefix "Theo đề nghị của" nếu lỡ dính
	const body = s.replace(/^Theo đề nghị của\s+/i, '').trim()

	const m = body.match(/^Trưởng\s+(.+)$/i)
	const rest = m ? m[1].trim() : body

	// "PTMHC — Phòng Tham mưu Hậu cần" hoặc "PTMHC — Phòng … — lý do"
	const parts = rest
		.split(/\s*[—–]\s*/)
		.map((x) => x.trim())
		.filter(Boolean)
	if (parts.length >= 2) {
		const first = parts[0]
		const isCode =
			/^[A-Z0-9]{2,12}$/i.test(first) ||
			/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(first)
		if (isCode) {
			// parts[1] = tên đơn vị; parts[2+] = lý do (không gộp vào Trưởng)
			return `Trưởng ${nameOnly(parts[1], parts[1])}`
		}
		// "Trưởng Phòng X — lý do thêm" → chỉ lấy tên phòng
		return `Trưởng ${nameOnly(first, first)}`
	}

	// "Trưởng PTMHC" hoặc "Trưởng Phòng Tham mưu…"
	const name = nameOnly(rest, rest)
	// Nếu còn là mã thuần (PTMHC) — giữ nguyên (không có tên để map)
	return m ? `Trưởng ${name}` : name
}

/** Gộp proposedBy / reasonExtra từ reasonOther log */
function parseProposedAndReason(reasonOther?: string | null): {
	proposedBy?: string
	reasonExtra?: string
} {
	const raw = safeText(reasonOther)
	if (!raw) return {}

	// «Theo đề nghị của Trưởng PTMHC — Phòng Tham mưu Hậu cần — lý do…»
	const m = raw.match(/^Theo đề nghị của\s+(.+)$/i)
	if (m) {
		const rest = safeText(m[1])
		const truong = rest.match(/^Trưởng\s+(.+)$/i)
		const after = truong ? truong[1].trim() : rest
		const parts = after
			.split(/\s*[—–]\s*/)
			.map((x) => x.trim())
			.filter(Boolean)

		if (parts.length >= 2) {
			const first = parts[0]
			const isCode =
				/^[A-Z0-9]{2,12}$/i.test(first) ||
				/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/i.test(first)
			if (isCode) {
				return {
					proposedBy: `Trưởng ${nameOnly(parts[1], parts[1])}`,
					reasonExtra: parts.slice(2).join(' — ').trim() || undefined
				}
			}
			return {
				proposedBy: `Trưởng ${nameOnly(first, first)}`,
				reasonExtra: parts.slice(1).join(' — ').trim() || undefined
			}
		}

		return {
			proposedBy: formatProposedBy(truong ? rest : `Trưởng ${rest}`)
		}
	}

	if (/đề nghị/i.test(raw)) {
		return { proposedBy: formatProposedBy(raw) }
	}
	return { reasonExtra: raw }
}

/**
 * Build nội dung Word «QUYẾT ĐỊNH» (dùng chung khi tạo QĐ và khi xuất lại từ log).
 */
function buildTransferDecisionChildren(
	input: TransferDecisionExportInput
): (Paragraph | Table)[] {
	const decisionNo = safeText(input.decisionNumber) || '....../QĐ-HC2'

	const m = mergeMeta({
		commanderPosition: 'HIỆU TRƯỞNG',
		commanderName: safeText(input.signer),
		docNumber: decisionNo,
		...input.meta
	})

	const isRecall = input.mode === 'RECALL'
	const source = nameOnly(input.sourceRoomLabel, 'phòng nguồn')
	const target = nameOnly(input.targetRoomLabel, 'phòng đích')
	const execUnit = nameOnly(input.executingUnit || '', '')
	const lines = (input.lines ?? []).filter(
		(l) => (Number(l.quantity) || 0) > 0
	)

	if (!lines.length) {
		throw new Error('Không có dòng trang bị để xuất Quyết định')
	}

	const totalQty = lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0)

	const widths = [600, 3400, 900, 1000, 1000, 2738]
	const tableRows: TableRow[] = [
		headerRow(
			['STT', 'Tên trang bị', 'ĐVT', 'Phân cấp', 'Số lượng', 'Ghi chú'],
			widths
		)
	]
	for (let i = 0; i < lines.length; i++) {
		const l = lines[i]
		const dvt = safeText(l.unit) || inferAssetUnit(l.name) || 'Cái'
		tableRows.push(
			dataRow(
				[
					String(i + 1),
					safeText(l.name, '—'),
					dvt,
					gradeNum(l.grade),
					String(Number(l.quantity) || 0),
					safeText(l.note)
				],
				widths,
				{ centerCols: [0, 2, 3, 4] }
			)
		)
	}
	tableRows.push(
		dataRow(['', 'Tổng cộng', '', '', String(totalQty), ''], widths, {
			centerCols: [0, 2, 3, 4],
			bold: true
		})
	)
	const equipmentTable = new Table({
		width: { size: CONTENT_WIDTH, type: WidthType.DXA },
		columnWidths: widths,
		rows: tableRows
	})

	// Chỉ tên đơn vị — không mã (PTMHC → Phòng Tham mưu Hậu cần)
	const proposed = formatProposedBy(input.proposedBy)
	// reasonExtra không được nhầm là tên đơn vị (đã tách ở parseProposedAndReason)
	const reasonExtraClean = safeText(input.reasonExtra)
	const reasonLine =
		reasonExtraClean &&
		!/^(Phòng|Ban|Khoa|Tiểu đoàn|Đại đội)\b/i.test(reasonExtraClean)
			? `Căn cứ ${reasonExtraClean};`
			: 'Căn cứ nhu cầu biên chế và nhu cầu huấn luyện;'

	const dieu1 = isRecall
		? `Điều 1. Thu hồi từ ${source} về ${target} các loại trang bị cụ thể sau:`
		: `Điều 1. Điều động từ ${source} đến ${target} các loại trang bị cụ thể sau:`

	const dieu2 = (() => {
		const giaoNhan = isRecall
			? `${source} liên hệ với ${target} để giao nhận tại kho ${target}`
			: `${target} liên hệ với ${source} để giao nhận tại kho ${source}`
		if (execUnit) {
			return `Điều 2. Giao ${execUnit} chủ trì tổ chức thực hiện; ${giaoNhan}.`
		}
		return `Điều 2. ${giaoNhan}.`
	})()

	const dieu3a = 'Điều 3. Quyết định có hiệu lực thi hành kể từ ngày ký.'
	const dieu3b = `Chỉ huy ${target}, ${source} và Thủ trưởng các cơ quan, đơn vị có liên quan chịu trách nhiệm thi hành Quyết định.`

	const recipients = (
		input.recipients?.length
			? input.recipients
			: [
					source,
					target,
					...(execUnit ? [execUnit] : []),
					'Lưu: VT, Hồ sơ.'
				]
	)
		.map((r) => {
			const t = safeText(r)
			if (!t) return ''
			if (/^Lưu\s*:/i.test(t)) return t
			return nameOnly(t, t)
		})
		.filter(Boolean)

	const { day, month, year } = todayParts()
	let dateLine = `${m.city}, ngày ${day} tháng ${month} năm ${year}`
	const dRaw = safeText(input.decisionDate || input.executedAt)
	if (dRaw) {
		const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(dRaw)
		if (iso) {
			dateLine = `${m.city}, ngày ${iso[3]} tháng ${iso[2]} năm ${iso[1]}`
		} else {
			const dmy = /^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/.exec(dRaw)
			if (dmy) {
				dateLine = `${m.city}, ngày ${dmy[1].padStart(2, '0')} tháng ${dmy[2].padStart(2, '0')} năm ${dmy[3]}`
			}
		}
	}

	const leftW = Math.floor(CONTENT_WIDTH / 2)
	const rightW = CONTENT_WIDTH - leftW
	const superior = safeText(m.superiorUnitName, 'TỔNG CỤC HẬU CẦN')

	const headerTable = new Table({
		width: { size: CONTENT_WIDTH, type: WidthType.DXA },
		columnWidths: [leftW, rightW],
		rows: [
			new TableRow({
				children: [
					borderlessCell(
						[
							p(superior.toUpperCase(), {
								bold: true,
								center: true,
								size: 22,
								spaceAfter: 40
							}),
							p(m.unitName.toUpperCase(), {
								bold: true,
								center: true,
								size: 22,
								spaceAfter: 40
							}),
							p('———————', {
								center: true,
								size: 18,
								spaceAfter: 40
							}),
							p(`Số: ${decisionNo}`, {
								center: true,
								size: 22,
								spaceAfter: 40
							})
						],
						leftW
					),
					borderlessCell(
						[
							p(m.republic.toUpperCase(), {
								bold: true,
								center: true,
								size: 22,
								spaceAfter: 40
							}),
							p(m.motto, {
								bold: true,
								center: true,
								size: 22,
								spaceAfter: 40,
								underline: true
							}),
							p('———————', {
								center: true,
								size: 18,
								spaceAfter: 40
							}),
							p(dateLine, {
								center: true,
								size: 22,
								italics: true,
								spaceAfter: 20
							})
						],
						rightW
					)
				]
			})
		]
	})

	const signerParas: Paragraph[] = [
		p(m.commanderPosition.toUpperCase(), {
			bold: true,
			center: true,
			size: 24,
			spaceAfter: 40
		}),
		p(m.commanderHint || '(Ký, ghi rõ họ tên, cấp bậc)', {
			center: true,
			size: 20,
			italics: true,
			spaceAfter: 360
		}),
		p(commanderSignLine(m as ReportTemplate), {
			bold: true,
			center: true,
			size: 24,
			spaceAfter: 20
		})
	]
	if (input.performer?.trim()) {
		signerParas.push(
			p(`Người thực hiện: ${safeText(input.performer)}`, {
				center: true,
				size: 20,
				italics: true,
				spaceAfter: 20
			})
		)
	}

	return [
		headerTable,
		p('\u00A0', { spaceAfter: 100 }),
		p('QUYẾT ĐỊNH', {
			bold: true,
			center: true,
			size: 32,
			spaceAfter: 60
		}),
		p(
			isRecall
				? 'Về việc thu hồi vũ khí, trang bị kỹ thuật'
				: 'Về việc điều động vũ khí, trang bị kỹ thuật',
			{ bold: true, center: true, size: 26, spaceAfter: 160 }
		),
		p(reasonLine, { justify: true, size: 26, spaceAfter: 40 }),
		p('Căn cứ yêu cầu nhiệm vụ của các đơn vị;', {
			justify: true,
			size: 26,
			spaceAfter: 40
		}),
		p(`Theo đề nghị của ${proposed};`, {
			justify: true,
			size: 26,
			spaceAfter: 120
		}),
		p('QUYẾT ĐỊNH:', {
			bold: true,
			center: true,
			size: 28,
			spaceAfter: 120
		}),
		p(dieu1, { justify: true, size: 26, spaceAfter: 100 }),
		equipmentTable,
		p('\u00A0', { spaceAfter: 80 }),
		p(dieu2, { justify: true, size: 26, spaceAfter: 120 }),
		p(dieu3a, { justify: true, size: 26, spaceAfter: 40 }),
		p(dieu3b, { justify: true, size: 26, spaceAfter: 200 }),
		new Table({
			width: { size: CONTENT_WIDTH, type: WidthType.DXA },
			columnWidths: [leftW, rightW],
			rows: [
				new TableRow({
					children: [
						borderlessCell(
							[
								p(m.recipientsTitle || 'Nơi nhận:', {
									bold: true,
									size: 22,
									spaceAfter: 40
								}),
								...(recipients.length
									? recipients.map((r) =>
											p(
												r.startsWith('-')
													? r
													: `- ${r}${/;$/.test(r) ? '' : ';'}`,
												{
													size: 20,
													spaceAfter: 20
												}
											)
										)
									: recipientLines(m as ReportTemplate).map(
											(line) =>
												p(line, {
													size: 20,
													spaceAfter: 20
												})
										))
							],
							leftW
						),
						borderlessCell(signerParas, rightW)
					]
				})
			]
		})
	]
}

/**
 * Xuất Word «QUYẾT ĐỊNH» theo mẫu hành chính:
 * - Chỉ tên phòng/đơn vị (không in mã tòa/phòng)
 * - Không ghi mã số trang bị
 * - Điều 1 + bảng (Tên, ĐVT, Phân cấp, SL, Ghi chú) + hàng Tổng
 * - Điều 2 giao nhận tại kho
 * - Điều 3 hiệu lực + trách nhiệm thi hành
 */
export async function exportTransferDecisionWord(
	input: TransferDecisionExportInput
) {
	const isRecall = input.mode === 'RECALL'
	const children = buildTransferDecisionChildren(input)
	const m = mergeMeta({
		commanderPosition: 'HIỆU TRƯỞNG',
		commanderName: safeText(input.signer),
		...input.meta
	})

	try {
		const doc = makeDoc(
			children,
			isRecall
				? 'Quyết định thu hồi trang bị kỹ thuật'
				: 'Quyết định điều động trang bị kỹ thuật'
		)
		const fname =
			m.filename ||
			(isRecall
				? 'quyet-dinh-thu-hoi-trang-bi.docx'
				: 'quyet-dinh-dieu-dong-trang-bi.docx')
		await downloadDocx(doc, fname)
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		throw new Error(`Xuất Word thất bại: ${msg}`)
	}
}

/**
 * Xuất nhật ký điều động/thu hồi ra Word — **cùng mẫu Quyết định**
 * (quốc hiệu, số QĐ, căn cứ, Điều 1–3, bảng trang bị, nơi nhận, chữ ký).
 * Nhiều phiếu (khác số QĐ / tuyến) → nhiều quyết định trong 1 file, ngắt trang.
 */
export async function exportTransferRecallLogsWord(
	rows: AssetMovementReportRow[],
	opts?: MilitaryReportMeta
) {
	if (!rows.length) {
		throw new Error('Không có nhật ký điều động / thu hồi để xuất')
	}

	// Gộp dòng cùng phiếu (cùng loại + số QĐ + ngày + tuyến + đơn vị)
	type Group = {
		key: string
		mode: 'TRANSFER' | 'RECALL'
		source: string
		target: string
		input: TransferDecisionExportInput
	}
	const groups = new Map<string, Group>()

	for (const r of rows) {
		if (r.movementType !== 'TRANSFER' && r.movementType !== 'RECALL') {
			continue
		}
		const mode = r.movementType as 'TRANSFER' | 'RECALL'
		const route = parseRouteFromExplanation(r.explanation)
		/**
		 * QUAN TRỌNG: không lấy roomName hiện tại của VT (có thể đã chuyển tiếp),
		 * mà lấy nguồn/đích từ diễn giải đã snapshot lúc ghi log.
		 * nameOnly() sau đó chỉ còn tên (bỏ mã).
		 */
		const noteSrc = safeText(r.note).match(
			/Nguồn\s*:\s*(.+?)(?:\s*\(|$| \|)/i
		)

		let sourceLabel = route.source
		let targetLabel = route.target
		if (!route.ok) {
			// Fallback khi không parse được explanation
			if (noteSrc?.[1]) sourceLabel = safeText(noteSrc[1])
			const destFallback =
				safeText(r.roomName) ||
				[r.buildingCode, r.roomCode].filter(Boolean).join(' / ')
			if (destFallback) targetLabel = destFallback
		} else {
			// Bổ sung nguồn từ note nếu parse thiếu
			if (
				(sourceLabel === 'phòng nguồn' || !sourceLabel) &&
				noteSrc?.[1]
			) {
				sourceLabel = safeText(noteSrc[1])
			}
		}

		const { proposedBy, reasonExtra } = parseProposedAndReason(
			r.reasonOther
		)

		const key = [
			mode,
			safeText(r.decisionNumber),
			safeText(r.decisionDate || r.executedAt),
			safeText(r.executingUnit),
			sourceLabel,
			targetLabel,
			safeText(r.signer),
			safeText(r.performer)
		].join('|')

		const line: TransferDecisionLine = {
			name: safeText(r.assetName, '—'),
			// Log không lưu ĐVT → suy từ tên (Bộ/Cái/Chiếc)
			unit: inferAssetUnit(r.assetName),
			grade: r.grade ?? 1,
			quantity: Number(r.quantity) || 0,
			note:
				safeText(r.note)
					.replace(/\s*\|\s*Nguồn:.*$/i, '')
					.replace(/^Nguồn:.*$/i, '')
					.trim() || undefined
		}

		const existing = groups.get(key)
		if (existing) {
			existing.input.lines.push(line)
		} else {
			groups.set(key, {
				key,
				mode,
				source: sourceLabel,
				target: targetLabel,
				input: {
					mode,
					sourceRoomLabel: sourceLabel,
					targetRoomLabel: targetLabel,
					lines: [line],
					proposedBy,
					reasonExtra,
					decisionDate: r.decisionDate || r.executedAt || undefined,
					decisionNumber: r.decisionNumber || undefined,
					executedAt: r.executedAt || undefined,
					signer: r.signer || undefined,
					performer: r.performer || undefined,
					executingUnit: r.executingUnit || undefined,
					meta: opts
				}
			})
		}
	}

	if (groups.size === 0) {
		throw new Error(
			'Không có dòng TRANSFER/RECALL hợp lệ để xuất Quyết định'
		)
	}

	const allChildren: (Paragraph | Table)[] = []
	let idx = 0
	for (const g of groups.values()) {
		if (idx > 0) {
			// Ngắt trang giữa các quyết định
			allChildren.push(
				new Paragraph({
					children: [],
					pageBreakBefore: true
				})
			)
		}
		allChildren.push(...buildTransferDecisionChildren(g.input))
		idx++
	}

	const stamp = new Date().toISOString().slice(0, 10)
	const fname = opts?.filename || `quyet-dinh-dieu-dong-thu-hoi-${stamp}.docx`

	try {
		const doc = makeDoc(
			allChildren,
			'Quyết định điều động / thu hồi trang bị kỹ thuật'
		)
		await downloadDocx(doc, fname)
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err)
		throw new Error(`Xuất Word thất bại: ${msg}`)
	}
}
