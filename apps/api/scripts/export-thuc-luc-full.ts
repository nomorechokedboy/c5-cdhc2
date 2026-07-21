/**
 * Xuất Word thống kê thực lực (dữ liệu REAL đa phân cấp).
 *   pnpm exec tsx scripts/export-thuc-luc-full.ts
 */
import { createClient } from '@libsql/client'
import { mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
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
	VerticalAlign,
	VerticalMergeType,
	WidthType
} from '../../../apps/web/node_modules/docx/dist/index.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env') })
const client = createClient({
	url: (process.env.DATABASE_URI || 'file:local.db').startsWith('file:')
		? process.env.DATABASE_URI || 'file:local.db'
		: `file:${process.env.DATABASE_URI}`
})

const FONT = 'Times New Roman'
const A4_W = 16838
const A4_H = 11906
const M = 500
const CW = A4_W - M * 2

function asOf() {
	const d = new Date()
	return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}
function p(text: string, o: Record<string, unknown> = {}) {
	return new Paragraph({
		alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
		spacing: { after: (o.after as number) ?? 40 },
		children: [
			new TextRun({
				text,
				bold: !!o.bold,
				italics: !!o.italics,
				size: (o.size as number) ?? 16,
				font: FONT
			})
		]
	})
}
function cell(text: string, w: number, o: Record<string, unknown> = {}) {
	return new TableCell({
		width: { size: w * ((o.span as number) || 1), type: WidthType.DXA },
		columnSpan: o.span as number | undefined,
		verticalMerge: o.vm as
			| (typeof VerticalMergeType)[keyof typeof VerticalMergeType]
			| undefined,
		borders: {
			top: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			bottom: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			left: { style: BorderStyle.SINGLE, size: 4, color: '000000' },
			right: { style: BorderStyle.SINGLE, size: 4, color: '000000' }
		},
		margins: { top: 8, bottom: 8, left: 10, right: 10 },
		verticalAlign: VerticalAlign.CENTER,
		shading: o.h ? { fill: 'D9D9D9' } : undefined,
		children: [
			new Paragraph({
				alignment: o.c ? AlignmentType.CENTER : AlignmentType.LEFT,
				children: [
					new TextRun({
						text: String(text ?? ''),
						bold: !!(o.b || o.h),
						size: (o.fs as number) ?? (o.h ? 11 : 9),
						font: FONT
					})
				]
			})
		]
	})
}

async function main() {
	const dateStr = asOf()
	const unitsR = await client.execute(
		'SELECT id, alias FROM units WHERE level = 1 ORDER BY alias'
	)
	const allUnits = unitsR.rows.map((u) => ({
		id: u.id as number,
		alias: String(u.alias).toUpperCase()
	}))
	const assets = await client.execute(`
    SELECT a.code, a.name, a.category, a.unit, a.grade, a.quantity, a.holding_unit_id,
           r.room_type, r.room_name
    FROM room_assets a LEFT JOIN rooms r ON r.id = a.room_id
    WHERE a.quantity > 0`)

	type Row = {
		code: string
		name: string
		cat: string
		dvt: string
		grade: number
		byUnit: Record<number, number>
		kho: number
		total: number
	}
	const map = new Map<string, Row>()
	for (const a of assets.rows) {
		const qty = Number(a.quantity) || 0
		if (qty <= 0) continue
		const name = String(a.name)
		const grade = Number(a.grade || 1)
		const dvt = String(a.unit || 'cái')
		const cat = String(a.category || 'Khác')
		const key = `${cat}|${name}|${grade}|${dvt}`.toLowerCase()
		let row = map.get(key)
		if (!row) {
			row = {
				code: String(a.code || ''),
				name,
				cat,
				dvt,
				grade,
				byUnit: Object.fromEntries(allUnits.map((u) => [u.id, 0])),
				kho: 0,
				total: 0
			}
			map.set(key, row)
		}
		const isKho =
			a.holding_unit_id == null ||
			/kho/i.test(String(a.room_type || '')) ||
			/kho/i.test(String(a.room_name || ''))
		if (isKho) row.kho += qty
		else if (row.byUnit[a.holding_unit_id as number] !== undefined)
			row.byUnit[a.holding_unit_id as number] += qty
		else row.kho += qty
		row.total += qty
	}
	const rows = [...map.values()].sort(
		(a, b) =>
			a.cat.localeCompare(b.cat, 'vi') ||
			a.name.localeCompare(b.name, 'vi') ||
			a.grade - b.grade
	)

	const active = allUnits
		.map((u) => ({
			...u,
			t: rows.reduce((s, r) => s + (r.byUnit[u.id] || 0), 0)
		}))
		.filter((u) => u.t > 0)
		.sort((a, b) => b.t - a.t)
		.slice(0, 12)

	const fixed = [850, 1900, 400, 480, 700]
	const tail = 400
	const tong = 400
	const uw = Math.max(
		300,
		Math.floor(
			(CW - fixed.reduce((a, b) => a + b, 0) - tail - tong) /
				Math.max(active.length, 1)
		)
	)
	const W = [...fixed, ...active.map(() => uw), tail, tong]
	const us = 5
	const ki = 5 + active.length
	const ti = ki + 1

	const h1 = new TableRow({
		tableHeader: true,
		children: [
			cell('MÃ SỐ', W[0], { h: 1, c: 1, vm: VerticalMergeType.RESTART }),
			cell('TÊN VẬT TƯ TRANG BỊ', W[1], {
				h: 1,
				c: 1,
				vm: VerticalMergeType.RESTART
			}),
			cell('ĐVT', W[2], { h: 1, c: 1, vm: VerticalMergeType.RESTART }),
			cell('Phân cấp', W[3], {
				h: 1,
				c: 1,
				vm: VerticalMergeType.RESTART
			}),
			cell(`Thực lực ngày ${dateStr}`, W[4], {
				h: 1,
				c: 1,
				vm: VerticalMergeType.RESTART,
				fs: 9
			}),
			...(active.length
				? [
						cell('THỰC LỰC CÁC ĐƠN VỊ', uw, {
							h: 1,
							c: 1,
							span: active.length,
							fs: 10
						})
					]
				: []),
			cell('KHO', W[ki], { h: 1, c: 1, vm: VerticalMergeType.RESTART }),
			cell('TỔNG', W[ti], { h: 1, c: 1, vm: VerticalMergeType.RESTART })
		]
	})
	const h2 = new TableRow({
		tableHeader: true,
		children: [
			cell('', W[0], { h: 1, vm: VerticalMergeType.CONTINUE }),
			cell('', W[1], { h: 1, vm: VerticalMergeType.CONTINUE }),
			cell('', W[2], { h: 1, vm: VerticalMergeType.CONTINUE }),
			cell('', W[3], { h: 1, vm: VerticalMergeType.CONTINUE }),
			cell('', W[4], { h: 1, vm: VerticalMergeType.CONTINUE }),
			...active.map((u, i) =>
				cell(u.alias, W[us + i], { h: 1, c: 1, fs: 9 })
			),
			cell('', W[ki], { h: 1, vm: VerticalMergeType.CONTINUE }),
			cell('', W[ti], { h: 1, vm: VerticalMergeType.CONTINUE })
		]
	})
	const trs = [h1, h2]
	const push = (vals: string[], bold?: boolean) =>
		trs.push(
			new TableRow({
				children: vals.map((v, i) =>
					cell(v, W[i], { c: i !== 1, b: bold, fs: bold ? 10 : 9 })
				)
			})
		)

	let lastCat = ''
	let lastName = ''
	let ci = 0
	for (const r of rows) {
		if (r.cat !== lastCat) {
			lastCat = r.cat
			lastName = ''
			ci++
			const e = Array(W.length).fill('')
			e[1] = `${ci}. ${r.cat}`
			push(e, true)
		}
		const same = r.name === lastName
		if (!same) lastName = r.name
		// mỗi dòng = 1 phân cấp; thực lực = SL đúng cấp đó
		push([
			r.code || '',
			same ? '' : r.name,
			r.dvt,
			String(r.grade),
			String(r.total),
			...active.map((u) => {
				const n = r.byUnit[u.id] || 0
				return n > 0 ? String(n) : ''
			}),
			r.kho > 0 ? String(r.kho) : '',
			String(r.total)
		])
	}
	const sumU = active.map((u) =>
		rows.reduce((s, r) => s + (r.byUnit[u.id] || 0), 0)
	)
	const sumK = rows.reduce((s, r) => s + r.kho, 0)
	const sumA = rows.reduce((s, r) => s + r.total, 0)
	push(
		[
			'',
			'TỔNG CỘNG',
			'',
			'',
			String(sumA),
			...sumU.map((n) => (n > 0 ? String(n) : '')),
			sumK > 0 ? String(sumK) : '',
			String(sumA)
		],
		true
	)

	const half = Math.floor(CW / 2)
	const nb = {
		top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
		bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
		left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
		right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }
	}
	const doc = new Document({
		creator: 'QLHV',
		title: 'Thống kê thực lực VT',
		sections: [
			{
				properties: {
					page: {
						size: { width: A4_W, height: A4_H },
						margin: { top: M, bottom: M, left: M, right: M }
					}
				},
				children: [
					new Table({
						width: { size: CW, type: WidthType.DXA },
						columnWidths: [half, half],
						rows: [
							new TableRow({
								children: [
									new TableCell({
										width: {
											size: half,
											type: WidthType.DXA
										},
										borders: nb,
										children: [
											p('TỔNG CỤC HẬU CẦN', {
												bold: true,
												center: true,
												size: 15
											}),
											p('TRƯỜNG CAO ĐẲNG HẬU CẦN 2', {
												bold: true,
												center: true,
												size: 17
											}),
											p('Số: ....../BC-CDHC', {
												center: true,
												size: 14
											})
										]
									}),
									new TableCell({
										width: {
											size: half,
											type: WidthType.DXA
										},
										borders: nb,
										children: [
											p(
												'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
												{
													bold: true,
													center: true,
													size: 15
												}
											),
											p('Độc lập - Tự do - Hạnh phúc', {
												bold: true,
												center: true,
												size: 15
											}),
											p(
												`Thành phố Hồ Chí Minh, ngày ${dateStr}`,
												{
													center: true,
													italics: true,
													size: 13
												}
											)
										]
									})
								]
							})
						]
					}),
					p('', { after: 30 }),
					p(
						'BÁO CÁO THỐNG KÊ THỰC LỰC VẬT TƯ, TRANG BỊ KỸ THUẬT HIỆN CÓ',
						{ bold: true, center: true, size: 18, after: 20 }
					),
					p(
						`Số liệu đến ngày: ${dateStr} — Mỗi VT có phân cấp 1–5; SL chia theo đơn vị + kho`,
						{ center: true, size: 12, after: 40 }
					),
					new Table({
						width: {
							size: W.reduce((a, b) => a + b, 0),
							type: WidthType.DXA
						},
						columnWidths: W,
						rows: trs
					})
				]
			}
		]
	})

	const buf = await Packer.toBuffer(doc)
	const outDir = path.join(__dirname, '../exports')
	mkdirSync(outDir, { recursive: true })
	const out1 = path.join(outDir, 'bao-cao-thuc-luc-da-phan-cap.docx')
	const out2 = path.join(
		__dirname,
		'../../../bao-cao-thuc-luc-da-phan-cap.docx'
	)
	writeFileSync(out1, buf)
	writeFileSync(out2, buf)
	console.log(
		`OK: ${rows.length} dòng (${new Set(rows.map((r) => r.name)).size} loại VT), SL ${sumA}`
	)
	console.log('Đơn vị (mẫu 12 cột):', active.map((u) => u.alias).join(', '))
	console.log('File:', out1)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
