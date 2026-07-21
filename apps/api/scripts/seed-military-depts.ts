/**
 * Seed phòng ban / khoa kiểu quân đội (mã ngắn trên báo cáo thực lực).
 * Cập nhật alias đại đội → D1…D9; thêm các phòng ban theo mẫu BC.
 *
 *   pnpm exec tsx scripts/seed-military-depts.ts
 */
import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env') })

const dbUrl = process.env.DATABASE_URI || 'file:local.db'
const client = createClient({
	url: dbUrl.startsWith('file:') ? dbUrl : `file:${dbUrl}`
})

/**
 * Phòng ban / khoa nhà trường (level company = 1).
 * Khoa dùng mã K1–K8 khớp danh mục đào tạo (exam_faculties / sheet Tổng hợp mã môn).
 */
const DEPTS: Array<{ alias: string; name: string }> = [
	{ alias: 'BBH', name: 'Ban Bảo hộ' },
	{ alias: 'PTMHC', name: 'Phòng Tham mưu Hậu cần' },
	{ alias: 'PDT', name: 'Phòng Đào tạo' },
	{ alias: 'PCT', name: 'Phòng Chính trị' },
	{ alias: 'PHCKT', name: 'Phòng Hậu cần - Kỹ thuật' },
	{ alias: 'BTC', name: 'Ban Tài chính' },
	{ alias: 'BKT', name: 'Ban Kỹ thuật' },
	{ alias: 'BKHQS', name: 'Ban Khoa học Quân sự' },
	{ alias: 'MDD', name: 'Trạm / MĐD' },
	{ alias: 'PHC', name: 'Phòng Hậu cần' },
	// Khoa = danh mục đào tạo
	{ alias: 'K1', name: 'Khoa Quân sự chung' },
	{ alias: 'K2', name: 'Khoa Khoa học xã hội và nhân văn' },
	{ alias: 'K3', name: 'Khoa Khoa học cơ bản' },
	{ alias: 'K4', name: 'Khoa Y học cơ sở' },
	{ alias: 'K5', name: 'Khoa Y học lâm sàng' },
	{ alias: 'K6', name: 'Khoa Y học quân sự' },
	{ alias: 'K7', name: 'Khoa Điều dưỡng' },
	{ alias: 'K8', name: 'Khoa Dược' }
]

/** Đổi alias đại đội c1→D1 … c9→D9 */
const DAI_DOI_ALIAS: Record<string, string> = {
	c1: 'D1',
	c2: 'D2',
	c3: 'D3',
	c4: 'D4',
	c5: 'D5',
	c6: 'D6',
	c7: 'D7',
	c8: 'D8',
	c9: 'D9'
}

async function renameDaiDoiAliases() {
	for (const [oldA, newA] of Object.entries(DAI_DOI_ALIAS)) {
		const row = await client.execute({
			sql: 'SELECT id, name FROM units WHERE alias = ?',
			args: [oldA]
		})
		if (!row.rows.length) continue
		// nếu D1 đã tồn tại thì bỏ
		const clash = await client.execute({
			sql: 'SELECT id FROM units WHERE alias = ?',
			args: [newA]
		})
		if (clash.rows.length) {
			console.log(`Skip rename ${oldA}→${newA} (alias exists)`)
			continue
		}
		await client.execute({
			sql: 'UPDATE units SET alias = ? WHERE alias = ?',
			args: [newA, oldA]
		})
		console.log(`Renamed ${oldA} → ${newA} (${row.rows[0].name})`)
	}
}

async function seedDepts() {
	for (const d of DEPTS) {
		const exists = await client.execute({
			sql: 'SELECT id FROM units WHERE alias = ? OR name = ?',
			args: [d.alias, d.name]
		})
		if (exists.rows.length) {
			// đồng bộ alias nếu trùng tên nhưng alias khác
			const id = exists.rows[0].id as number
			await client.execute({
				sql: 'UPDATE units SET alias = ?, name = ?, level = 1 WHERE id = ?',
				args: [d.alias, d.name, id]
			})
			console.log('Updated', d.alias, d.name)
			continue
		}
		await client.execute({
			sql: 'INSERT INTO units (alias, level, name, parentId) VALUES (?, 1, ?, NULL)',
			args: [d.alias, d.name]
		})
		console.log('Inserted', d.alias, d.name)
	}
}

/** Gán lại holding cho VT demo: xen kẽ các đơn vị company (mã ngắn) */
async function reassignHoldings() {
	const companies = await client.execute(
		`SELECT id, alias, name FROM units WHERE level = 1 ORDER BY alias`
	)
	const unitIds = companies.rows.map((r) => r.id as number)
	if (!unitIds.length) return

	const rooms = await client.execute(
		`SELECT id, room_type, room_name FROM rooms`
	)
	const isKho = new Map<number, boolean>()
	for (const r of rooms.rows) {
		isKho.set(
			r.id as number,
			/kho/i.test(String(r.room_type || '')) ||
				/kho/i.test(String(r.room_name || ''))
		)
	}

	const assets = await client.execute(
		`SELECT id, room_id, name FROM room_assets WHERE quantity > 0`
	)
	let i = 0
	for (const a of assets.rows) {
		if (isKho.get(a.room_id as number)) {
			await client.execute({
				sql: 'UPDATE room_assets SET holding_unit_id = NULL WHERE id = ?',
				args: [a.id]
			})
			continue
		}
		const uid = unitIds[i % unitIds.length]
		i++
		await client.execute({
			sql: 'UPDATE room_assets SET holding_unit_id = ? WHERE id = ?',
			args: [uid, a.id]
		})
	}
	console.log('Reassigned holdings across', unitIds.length, 'units')
}

async function main() {
	await renameDaiDoiAliases()
	// xóa trùng alias phc/kdt cũ nếu đã đổi tên
	await seedDepts()
	// gỡ unit cũ trùng tên (phc lowercase đã đổi PHC)
	const old = ['phc', 'kdt', 'ktc', 'kcn']
	for (const a of old) {
		const r = await client.execute({
			sql: 'SELECT id FROM units WHERE alias = ?',
			args: [a]
		})
		// đã rename trong seedDepts bằng OR name
	}
	await reassignHoldings()
	const all = await client.execute(
		`SELECT alias, name, level FROM units WHERE level = 1 ORDER BY alias`
	)
	console.log('Company units:')
	for (const u of all.rows) {
		console.log(' ', u.alias, '-', u.name)
	}
	console.log('Done.')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
