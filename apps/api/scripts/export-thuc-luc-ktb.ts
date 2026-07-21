/**
 * Seed (nếu cần) + xuất Word thống kê thực lực cho đơn vị KTB.
 *
 *   pnpm exec tsx scripts/export-thuc-luc-ktb.ts
 *
 * File ra: apps/api/exports/bao-cao-thuc-luc-KTB.docx
 */
import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, writeFileSync } from 'fs'
import { config } from 'dotenv'
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
	VerticalMergeType,
	WidthType
} from '../../../apps/web/node_modules/docx/dist/index.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env') })

const dbUrl = process.env.DATABASE_URI || 'file:local.db'
const client = createClient({
	url: dbUrl.startsWith('file:') ? dbUrl : `file:${dbUrl}`
})

const FONT = 'Times New Roman'
const A4_W = 16838
const A4_H = 11906
const MARGIN = 560
const CONTENT_W = A4_W - MARGIN * 2
const UNIT_ALIAS = 'KTB'

function todayVN() {
	const d = new Date()
	const dd = String(d.getDate()).padStart(2, '0')
	const mm = String(d.getMonth() + 1).padStart(2, '0')
	return `${dd}/${mm}/${d.getFullYear()}`
}

function p(
	text: string,
	opts?: {
		bold?: boolean
		size?: number
		center?: boolean
		italics?: boolean
		spaceAfter?: number
		spaceBefore?: number
		underline?: boolean
	}
) {
	return new Paragraph({
		alignment: opts?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
		spacing: {
			after: opts?.spaceAfter ?? 40,
			before: opts?.spaceBefore ?? 0
		},
		children: [
			new TextRun({
				text,
				bold: opts?.bold,
				italics: opts?.italics,
				size: opts?.size ?? 18,
				font: FONT,
				underline: opts?.underline
					? { type: UnderlineType.SINGLE }
					: undefined
			})
		]
	})
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
) {
	const span = opts?.columnSpan ?? 1
	return new TableCell({
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
		shading: opts?.header ? { fill: 'D9D9D9' } : undefined,
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
	})
}

async function loadUnit() {
	const u = await client.execute({
		sql: 'SELECT id, alias, name FROM units WHERE alias = ?',
		args: [UNIT_ALIAS]
	})
	if (!u.rows.length) {
		throw new Error(
			`Chưa có đơn vị ${UNIT_ALIAS}. Chạy: pnpm exec tsx scripts/seed-rich-unit-assets.ts`
		)
	}
	return {
		id: u.rows[0].id as number,
		alias: String(u.rows[0].alias),
		name: String(u.rows[0].name)
	}
}

type Row = {
	code: string
	name: string
	category: string
	dvt: string
	grade: number
	qtyUnit: number
	qtyKho: number
	total: number
}

async function loadRows(unitId: number): Promise<Row[]> {
	const assets = await client.execute({
		sql: `SELECT a.code, a.name, a.category, a.unit, a.grade, a.quantity,
                  a.holding_unit_id, a.room_id, r.room_type, r.room_name
           FROM room_assets a
           LEFT JOIN rooms r ON r.id = a.room_id
           WHERE a.quantity > 0
             AND (a.holding_unit_id = ? OR a.code LIKE 'KTB-%')
           ORDER BY a.category, a.name, a.grade`,
		args: [unitId]
	})

	type Acc = Row
	const map = new Map<string, Acc>()
	for (const a of assets.rows) {
		const qty = Number(a.quantity) || 0
		if (qty <= 0) continue
		const name = String(a.name || '—')
		const grade = Number(a.grade ?? 1)
		const dvt = String(a.unit || 'cái')
		const category = String(a.category || 'Khác')
		const key = `${category}|${name}|${grade}|${dvt}`.toLowerCase()
		const isKho =
			a.holding_unit_id == null ||
			/kho/i.test(String(a.room_type || '')) ||
			/kho/i.test(String(a.room_name || ''))
		let row = map.get(key)
		if (!row) {
			row = {
				code: String(a.code || ''),
				name,
				category,
				dvt,
				grade,
				qtyUnit: 0,
				qtyKho: 0,
				total: 0
			}
			map.set(key, row)
		} else if (
			a.code &&
			(!row.code || String(a.code).length < row.code.length)
		) {
			row.code = String(a.code)
		}
		if (isKho) row.qtyKho += qty
		else row.qtyUnit += qty
		row.total += qty
	}
	return [...map.values()].sort((a, b) => {
		const c = a.category.localeCompare(b.category, 'vi')
		if (c) return c
		const n = a.name.localeCompare(b.name, 'vi')
		if (n) return n
		return a.grade - b.grade
	})
}

function buildTable(rows: Row[], unitCode: string, asOf: string): Table {
	// MÃ | TÊN | ĐVT | Phân cấp | Thực lực ngày | KTB | KHO | TỔNG
	const W = [1000, 2800, 550, 650, 1000, 800, 800, 800]
	const h1 = new TableRow({
		tableHeader: true,
		children: [
			cell('MÃ SỐ', W[0], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART
			}),
			cell('TÊN VẬT TƯ TRANG BỊ', W[1], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART
			}),
			cell('ĐVT', W[2], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART
			}),
			cell('Phân cấp', W[3], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART
			}),
			cell(`Thực lực\nngày ${asOf}`, W[4], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART,
				fontSize: 11
			}),
			cell('THỰC LỰC CÁC ĐƠN VỊ', W[5], {
				header: true,
				center: true,
				columnSpan: 1,
				fontSize: 11
			}),
			cell('KHO', W[6], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART
			}),
			cell('TỔNG', W[7], {
				header: true,
				center: true,
				verticalMerge: VerticalMergeType.RESTART
			})
		]
	})
	const h2 = new TableRow({
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
			cell('', W[4], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			}),
			cell(unitCode, W[5], { header: true, center: true, fontSize: 12 }),
			cell('', W[6], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			}),
			cell('', W[7], {
				header: true,
				verticalMerge: VerticalMergeType.CONTINUE
			})
		]
	})

	const tableRows: TableRow[] = [h1, h2]
	let lastCat = ''
	let catI = 0
	let sumUnit = 0
	let sumKho = 0
	let sumAll = 0

	const push = (vals: string[], bold?: boolean) => {
		tableRows.push(
			new TableRow({
				children: vals.map((v, i) =>
					cell(v, W[i], {
						center: i !== 1,
						bold,
						fontSize: bold ? 12 : 11
					})
				)
			})
		)
	}

	for (const r of rows) {
		if (r.category !== lastCat) {
			lastCat = r.category
			catI++
			const empty = Array(8).fill('')
			empty[1] = `${catI}. ${r.category}`
			push(empty, true)
		}
		sumUnit += r.qtyUnit
		sumKho += r.qtyKho
		sumAll += r.total
		push([
			r.code,
			r.name,
			r.dvt,
			String(r.grade),
			String(r.total),
			r.qtyUnit > 0 ? String(r.qtyUnit) : '',
			r.qtyKho > 0 ? String(r.qtyKho) : '',
			String(r.total)
		])
	}
	push(
		[
			'',
			'TỔNG CỘNG',
			'',
			'',
			String(sumAll),
			sumUnit > 0 ? String(sumUnit) : '',
			sumKho > 0 ? String(sumKho) : '',
			String(sumAll)
		],
		true
	)

	return new Table({
		width: { size: W.reduce((a, b) => a + b, 0), type: WidthType.DXA },
		columnWidths: W,
		rows: tableRows
	})
}

async function main() {
	const unit = await loadUnit()
	const rows = await loadRows(unit.id)
	if (!rows.length) {
		throw new Error('Không có vật tư cho đơn vị KTB')
	}

	const asOf = todayVN()
	const noBorder = {
		top: { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' },
		bottom: { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' },
		left: { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' },
		right: { style: BorderStyle.NONE as const, size: 0, color: 'FFFFFF' }
	}
	const half = Math.floor(CONTENT_W / 2)

	const doc = new Document({
		creator: 'QLHV',
		title: `Thực lực VT — ${unit.alias}`,
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
				children: [
					new Table({
						width: {
							size: CONTENT_W,
							type: WidthType.DXA
						},
						columnWidths: [half, half],
						rows: [
							new TableRow({
								children: [
									new TableCell({
										width: {
											size: half,
											type: WidthType.DXA
										},
										borders: noBorder,
										children: [
											p('TỔNG CỤC HẬU CẦN', {
												bold: true,
												center: true,
												size: 16
											}),
											p('TRƯỜNG CAO ĐẲNG HẬU CẦN 2', {
												bold: true,
												center: true,
												size: 18
											}),
											p('————————', {
												center: true,
												size: 14
											}),
											p('Số: ....../BC-CDHC', {
												center: true,
												size: 16
											})
										]
									}),
									new TableCell({
										width: {
											size: half,
											type: WidthType.DXA
										},
										borders: noBorder,
										children: [
											p(
												'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
												{
													bold: true,
													center: true,
													size: 16
												}
											),
											p('Độc lập - Tự do - Hạnh phúc', {
												bold: true,
												center: true,
												size: 16,
												underline: true
											}),
											p('————————', {
												center: true,
												size: 14
											}),
											p(
												`Thành phố Hồ Chí Minh, ngày ${asOf.slice(0, 2)} tháng ${asOf.slice(3, 5)} năm ${asOf.slice(6)}`,
												{
													center: true,
													italics: true,
													size: 14
												}
											)
										]
									})
								]
							})
						]
					}),
					p('', { spaceAfter: 60 }),
					p(
						'BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ, TRANG BỊ KỸ THUẬT HIỆN CÓ',
						{ bold: true, center: true, size: 22, spaceAfter: 40 }
					),
					p(`(Đơn vị: ${unit.alias} — ${unit.name})`, {
						center: true,
						italics: true,
						size: 16,
						spaceAfter: 20
					}),
					p(`Số liệu đến ngày: ${asOf}`, {
						center: true,
						size: 16,
						spaceAfter: 80
					}),
					buildTable(rows, unit.alias, asOf),
					p('', { spaceBefore: 120 }),
					p('Nơi nhận:                              CHỈ HUY ĐƠN VỊ', {
						size: 14,
						spaceAfter: 40
					}),
					p(
						'- Như trên;                    (Ký, ghi rõ họ tên, cấp bậc)',
						{
							size: 13,
							spaceAfter: 200
						}
					),
					p('- Lưu: VT, HC;', { size: 13 })
				]
			}
		]
	})

	const buf = await Packer.toBuffer(doc)
	const outDir = path.join(__dirname, '../exports')
	mkdirSync(outDir, { recursive: true })
	const outPath = path.join(outDir, 'bao-cao-thuc-luc-KTB.docx')
	writeFileSync(outPath, buf)

	const totalQty = rows.reduce((s, r) => s + r.total, 0)
	console.log(`Unit: ${unit.alias} — ${unit.name}`)
	console.log(`Rows: ${rows.length}, total SL: ${totalQty}`)
	console.log(`Exported: ${outPath}`)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
