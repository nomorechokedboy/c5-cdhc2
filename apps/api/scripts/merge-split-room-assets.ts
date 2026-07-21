/**
 * Gộp VT bị tách sai + chuẩn hóa mã theo phân cấp.
 *
 * - Cùng phòng + tên + ĐVT + grade → 1 dòng (cộng SL dùng / hỏng)
 * - Xóa DISPOSED SL=0
 * - Mã: bỏ hậu tố -OK-/-HONG-; nhiều cấp → {base}-G{grade}
 *
 *   cd apps/api && pnpm exec tsx scripts/merge-split-room-assets.ts
 */
import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath =
	process.env.DATABASE_URI || path.join(__dirname, '..', 'local.db')
const url = dbPath.startsWith('file:') ? dbPath : `file:${path.resolve(dbPath)}`
const db = createClient({ url })

function baseCode(code: string | null | undefined): string {
	if (!code) return ''
	return String(code)
		.replace(/-OK-[A-Z0-9]+$/i, '')
		.replace(/-HONG-[A-Z0-9]+$/i, '')
		.replace(/-G[1-5]$/i, '')
		.replace(/-OK$/i, '')
		.replace(/-HONG$/i, '')
}

type R = {
	id: number
	room_id: number
	code: string | null
	name: string
	quantity: number
	bq: number
	unit: string | null
	holding: number | null
	grade: number
	status: string
}

async function main() {
	console.log('DB:', url)
	try {
		await db.execute(
			`ALTER TABLE room_assets ADD COLUMN broken_quantity integer NOT NULL DEFAULT 0`
		)
	} catch {
		/* ok */
	}

	// Xóa rác DISPOSED
	const trash = await db.execute(
		`SELECT id, name FROM room_assets WHERE status='DISPOSED' AND quantity<=0`
	)
	for (const r of trash.rows) {
		const id = Number(r.id)
		await db.execute({
			sql: `UPDATE repair_requests SET room_asset_id=NULL WHERE room_asset_id=?`,
			args: [id]
		})
		await db.execute({
			sql: `UPDATE repair_requests SET source_asset_id=NULL WHERE source_asset_id=?`,
			args: [id]
		})
		await db.execute({
			sql: `DELETE FROM room_assets WHERE id=?`,
			args: [id]
		})
		console.log('del DISPOSED', id, r.name)
	}

	const res = await db.execute(`
    SELECT id, room_id, code, name, quantity, COALESCE(broken_quantity,0) bq,
           unit, holding_unit_id, grade, status FROM room_assets`)
	const rows: R[] = res.rows.map((r) => ({
		id: Number(r.id),
		room_id: Number(r.room_id),
		code: (r.code as string) || null,
		name: String(r.name),
		quantity: Number(r.quantity) || 0,
		bq: Number(r.bq) || 0,
		unit: (r.unit as string) || null,
		holding: r.holding_unit_id == null ? null : Number(r.holding_unit_id),
		grade: Number(r.grade) || 1,
		status: String(r.status || 'NORMAL')
	}))

	const groups = new Map<string, R[]>()
	for (const r of rows) {
		const k = [
			r.room_id,
			r.name.trim().toLowerCase(),
			(r.unit || 'cái').toLowerCase(),
			r.grade
		].join('|')
		if (!groups.has(k)) groups.set(k, [])
		groups.get(k)!.push(r)
	}

	let deleted = 0
	for (const [, g] of groups) {
		if (g.length < 2) continue
		g.sort((a, b) => {
			const as = /-(OK|HONG)/i.test(a.code || '') ? 1 : 0
			const bs = /-(OK|HONG)/i.test(b.code || '') ? 1 : 0
			if (as !== bs) return as - bs
			return a.id - b.id
		})
		const keep = g[0]
		let usable = 0
		let broken = 0
		for (const x of g) {
			if (x.status === 'BROKEN' || x.status === 'REPAIRING') {
				broken += x.quantity + x.bq
			} else {
				usable += x.quantity
				broken += x.bq
			}
		}
		for (const o of g.slice(1)) {
			await db.execute({
				sql: `UPDATE room_assets SET code=NULL WHERE id=?`,
				args: [o.id]
			})
		}
		const holding = g.find((x) => x.holding != null)?.holding ?? null
		const status = usable <= 0 && broken > 0 ? 'BROKEN' : 'NORMAL'
		const grade = status === 'BROKEN' ? 5 : keep.grade
		const raw =
			baseCode(keep.code) ||
			g.map((x) => baseCode(x.code)).find(Boolean) ||
			`VT-${keep.id}`
		let code = raw
		const clash = await db.execute({
			sql: `SELECT id FROM room_assets WHERE code=? AND id!=?`,
			args: [code, keep.id]
		})
		if (clash.rows.length) code = `${raw}-G${grade}`

		await db.execute({
			sql: `UPDATE room_assets SET code=?, quantity=?, broken_quantity=?, status=?, grade=?,
        holding_unit_id=COALESCE(?, holding_unit_id), updatedAt=CURRENT_TIMESTAMP WHERE id=?`,
			args: [code, usable, broken, status, grade, holding, keep.id]
		})
		for (const o of g.slice(1)) {
			await db.execute({
				sql: `UPDATE repair_requests SET room_asset_id=? WHERE room_asset_id=?`,
				args: [keep.id, o.id]
			})
			await db.execute({
				sql: `UPDATE repair_requests SET source_asset_id=? WHERE source_asset_id=?`,
				args: [keep.id, o.id]
			})
			await db.execute({
				sql: `DELETE FROM room_assets WHERE id=?`,
				args: [o.id]
			})
			deleted++
			console.log(`merge #${o.id} → #${keep.id} «${keep.name}» g${grade}`)
		}
	}

	// Chuẩn hóa mã theo product: {base}-G{grade} khi nhiều cấp
	const res2 = await db.execute(
		`SELECT id, room_id, code, name, unit, grade FROM room_assets`
	)
	const byProd = new Map<string, typeof res2.rows>()
	for (const r of res2.rows) {
		const k = [
			r.room_id,
			String(r.name).toLowerCase(),
			String(r.unit || 'cái').toLowerCase()
		].join('|')
		if (!byProd.has(k)) byProd.set(k, [])
		byProd.get(k)!.push(r)
	}
	for (const [, g] of byProd) {
		const bases = g
			.map((x) => baseCode(x.code as string))
			.filter(Boolean)
			.sort((a, b) => a.length - b.length)
		const base = bases[0] || `VT-${g[0].id}`
		for (const r of g) {
			await db.execute({
				sql: `UPDATE room_assets SET code=NULL WHERE id=?`,
				args: [r.id]
			})
		}
		for (const r of g) {
			const grade = Number(r.grade) || 1
			const code = g.length > 1 ? `${base}-G${grade}` : base
			await db.execute({
				sql: `UPDATE room_assets SET code=? WHERE id=?`,
				args: [code, r.id]
			})
			console.log(`code #${r.id} g${grade} → ${code}`)
		}
	}

	console.log(`\nDone. deleted=${deleted}`)
	const fin = await db.execute(`
    SELECT id, room_id, code, name, quantity, COALESCE(broken_quantity,0) bq, grade, status
    FROM room_assets ORDER BY room_id, name, grade`)
	for (const r of fin.rows) {
		console.log(
			`#${r.id} r${r.room_id} ${r.code} | ${r.name} | dùng=${r.quantity} hỏng=${r.bq} g${r.grade} ${r.status}`
		)
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
