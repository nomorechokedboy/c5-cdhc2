/**
 * Chuẩn hóa đơn vị quản lý học viên + lớp mặc định (khi trường không dùng Moodle).
 *
 * Cấu trúc:
 *   Tiểu đoàn 1 (d1) → Đại đội 1, 2, 3
 *   Tiểu đoàn 2 (d2) → Đại đội 4, 5
 *
 * Mỗi đại đội có 1 lớp mặc định «HV {tên đại đội}» nếu chưa có lớp nào
 * (để thêm học viên không phụ thuộc Moodle/lớp ảo).
 *
 * Chạy: cd apps/api && pnpm exec tsx scripts/ensure-student-units.ts
 */
import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath =
	process.env.DATABASE_URI || path.join(__dirname, '..', 'local.db')
const url = dbPath.startsWith('file:') ? dbPath : `file:${dbPath}`

const db = createClient({ url })

const STRUCTURE: {
	battalion: { alias: string; name: string }
	companies: { alias: string; name: string }[]
}[] = [
	{
		battalion: { alias: 'd1', name: 'Tiểu đoàn 1' },
		companies: [
			{ alias: 'D1', name: 'Đại đội 1' },
			{ alias: 'D2', name: 'Đại đội 2' },
			{ alias: 'D3', name: 'Đại đội 3' }
		]
	},
	{
		battalion: { alias: 'd2', name: 'Tiểu đoàn 2' },
		companies: [
			{ alias: 'D4', name: 'Đại đội 4' },
			{ alias: 'D5', name: 'Đại đội 5' }
		]
	}
]

async function upsertUnit(
	alias: string,
	name: string,
	level: 0 | 1,
	parentId: number | null
): Promise<number> {
	const existing = await db.execute({
		sql: `SELECT id FROM units WHERE alias = ? OR name = ? LIMIT 1`,
		args: [alias, name]
	})
	if (existing.rows.length) {
		const id = Number(existing.rows[0].id)
		await db.execute({
			sql: `UPDATE units SET alias = ?, name = ?, level = ?, parentId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
			args: [alias, name, level, parentId, id]
		})
		console.log(`  update unit #${id} ${alias} ${name} parent=${parentId}`)
		return id
	}
	const ins = await db.execute({
		sql: `INSERT INTO units (alias, name, level, parentId) VALUES (?, ?, ?, ?)`,
		args: [alias, name, level, parentId]
	})
	const id = Number(ins.lastInsertRowid)
	console.log(`  insert unit #${id} ${alias} ${name}`)
	return id
}

async function ensureDefaultClass(unitId: number, companyName: string) {
	const cnt = await db.execute({
		sql: `SELECT COUNT(*) AS c FROM classes WHERE unitId = ?`,
		args: [unitId]
	})
	const n = Number(cnt.rows[0]?.c ?? 0)
	if (n > 0) {
		console.log(`  classes for unit ${unitId}: ${n} (skip default)`)
		return
	}
	const className = `HV ${companyName}`
	await db.execute({
		sql: `INSERT INTO classes (name, description, status, unitId) VALUES (?, ?, 'ongoing', ?)`,
		args: [className, 'Lớp mặc định (không lấy từ Moodle)', unitId]
	})
	console.log(`  created default class «${className}» for unit ${unitId}`)
}

async function main() {
	console.log('DB:', url)
	console.log('Ensure student unit structure TD1/TD2 …')

	for (const block of STRUCTURE) {
		const bid = await upsertUnit(
			block.battalion.alias,
			block.battalion.name,
			0,
			null
		)
		for (const c of block.companies) {
			// chấp nhận alias cũ c1..c5 nếu đã có
			const alt = c.alias.replace(/^D/, 'c').toLowerCase()
			const found = await db.execute({
				sql: `SELECT id, alias FROM units WHERE alias IN (?, ?, ?) OR name = ? LIMIT 1`,
				args: [c.alias, alt, c.alias.toLowerCase(), c.name]
			})
			let cid: number
			if (found.rows.length) {
				cid = Number(found.rows[0].id)
				await db.execute({
					sql: `UPDATE units SET alias = ?, name = ?, level = 1, parentId = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?`,
					args: [c.alias, c.name, bid, cid]
				})
				console.log(
					`  link company #${cid} ${c.alias} → ${block.battalion.alias}`
				)
			} else {
				cid = await upsertUnit(c.alias, c.name, 1, bid)
			}
			await ensureDefaultClass(cid, c.name)
		}
	}

	// Đại đội 6/7… không thuộc cấu trúc HV → gỡ khỏi TD1/TD2
	const d3 = await db.execute({
		sql: `SELECT id FROM units WHERE alias = 'd3' LIMIT 1`,
		args: []
	})
	const d3id = d3.rows.length ? Number(d3.rows[0].id) : null
	if (d3id != null) {
		await db.execute({
			sql: `UPDATE units SET parentId = ?, updatedAt = CURRENT_TIMESTAMP
             WHERE alias IN ('D6','D7','c6','c7')
               AND parentId IN (SELECT id FROM units WHERE alias IN ('d1','d2'))`,
			args: [d3id]
		})
		console.log('  detached D6/D7 from TD1/TD2 → parent d3')
	}

	console.log('Done. HV menu: TD1→D1,D2,D3 | TD2→D4,D5')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
