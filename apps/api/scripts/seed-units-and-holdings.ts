/**
 * Thêm đơn vị + gán holding_unit_id / bổ sung vật tư demo cho báo cáo thực lực.
 *
 *   pnpm exec tsx scripts/seed-units-and-holdings.ts
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

async function ensureColumn() {
	const cols = await client.execute('PRAGMA table_info(room_assets)')
	const names = cols.rows.map((r) => String(r.name))
	if (!names.includes('holding_unit_id')) {
		await client.execute(
			`ALTER TABLE room_assets ADD COLUMN holding_unit_id integer REFERENCES units(id) ON DELETE SET NULL`
		)
		console.log('Added column holding_unit_id')
	}
}

async function seedUnits() {
	const extra = [
		{
			alias: 'd3',
			level: 0,
			name: 'Tiểu đoàn 3',
			parent: null as string | null
		},
		{ alias: 'c6', level: 1, name: 'Đại đội 6', parent: 'd1' },
		{ alias: 'c7', level: 1, name: 'Đại đội 7', parent: 'd2' },
		{ alias: 'c8', level: 1, name: 'Đại đội 8', parent: 'd3' },
		{ alias: 'c9', level: 1, name: 'Đại đội 9', parent: 'd3' },
		{ alias: 'phc', level: 1, name: 'Phòng Hậu cần', parent: null },
		{ alias: 'kdt', level: 1, name: 'Khoa Đào tạo', parent: null },
		{ alias: 'ktc', level: 1, name: 'Khoa Tài chính', parent: null },
		{ alias: 'kcn', level: 1, name: 'Khoa Công nghệ', parent: null }
	]
	for (const u of extra) {
		const exists = await client.execute({
			sql: 'SELECT id FROM units WHERE alias = ?',
			args: [u.alias]
		})
		if (exists.rows.length) {
			console.log('Unit exists', u.alias)
			continue
		}
		let parentId: number | null = null
		if (u.parent) {
			const p = await client.execute({
				sql: 'SELECT id FROM units WHERE alias = ?',
				args: [u.parent]
			})
			parentId = (p.rows[0]?.id as number) ?? null
		}
		await client.execute({
			sql: 'INSERT INTO units (alias, level, name, parentId) VALUES (?, ?, ?, ?)',
			args: [u.alias, u.level, u.name, parentId]
		})
		console.log('Inserted unit', u.name)
	}
}

async function assignHoldings() {
	const companies = await client.execute(
		`SELECT id, alias, name FROM units WHERE level = 1 ORDER BY id`
	)
	const unitIds = companies.rows.map((r) => r.id as number)
	if (!unitIds.length) {
		console.warn('No company units')
		return
	}

	const rooms = await client.execute(
		`SELECT r.id, r.room_type, r.room_name FROM rooms r`
	)
	const roomIsKho = new Map<number, boolean>()
	for (const r of rooms.rows) {
		const t = String(r.room_type || '')
		const n = String(r.room_name || '')
		roomIsKho.set(r.id as number, /kho/i.test(t) || /kho/i.test(n))
	}

	const assets = await client.execute(
		`SELECT id, room_id, name, quantity FROM room_assets WHERE quantity > 0`
	)
	let i = 0
	for (const a of assets.rows) {
		const rid = a.room_id as number
		if (roomIsKho.get(rid)) {
			// Kho: không gán đơn vị
			await client.execute({
				sql: `UPDATE room_assets SET holding_unit_id = NULL WHERE id = ?`,
				args: [a.id]
			})
			continue
		}
		const uid = unitIds[i % unitIds.length]
		i++
		await client.execute({
			sql: `UPDATE room_assets SET holding_unit_id = ? WHERE id = ?`,
			args: [uid, a.id]
		})
		console.log(`Asset #${a.id} ${a.name} → unit ${uid}`)
	}
}

async function seedMoreAssets() {
	const kho = await client.execute(
		`SELECT id FROM rooms WHERE room_type LIKE '%Kho%' OR room_name LIKE '%Kho%' LIMIT 1`
	)
	const classRoom = await client.execute(
		`SELECT id FROM rooms WHERE room_type NOT LIKE '%Kho%' LIMIT 1`
	)
	const companies = await client.execute(
		`SELECT id FROM units WHERE level = 1 ORDER BY id`
	)
	const unitIds = companies.rows.map((r) => r.id as number)
	const khoId = kho.rows[0]?.id as number | undefined
	const roomId = classRoom.rows[0]?.id as number | undefined
	if (!roomId || !unitIds.length) return

	const samples: Array<{
		name: string
		cat: string
		qty: number
		unit: string
		grade: number
		kho?: boolean
		unitIdx?: number
	}> = [
		{
			name: 'Máy tính xách tay',
			cat: 'IT',
			qty: 12,
			unit: 'cái',
			grade: 1,
			unitIdx: 0
		},
		{
			name: 'Máy tính xách tay',
			cat: 'IT',
			qty: 5,
			unit: 'cái',
			grade: 2,
			unitIdx: 1
		},
		{
			name: 'Máy in laser',
			cat: 'IT',
			qty: 4,
			unit: 'cái',
			grade: 1,
			unitIdx: 2
		},
		{
			name: 'Bàn ghế hội trường',
			cat: 'Nội thất',
			qty: 50,
			unit: 'bộ',
			grade: 1,
			unitIdx: 3
		},
		{
			name: 'Micro không dây',
			cat: 'AV',
			qty: 8,
			unit: 'bộ',
			grade: 1,
			unitIdx: 0
		},
		{
			name: 'Tivi LED 55"',
			cat: 'AV',
			qty: 6,
			unit: 'cái',
			grade: 2,
			unitIdx: 4
		},
		{
			name: 'Tủ hồ sơ sắt',
			cat: 'Nội thất',
			qty: 15,
			unit: 'cái',
			grade: 1,
			kho: true
		},
		{
			name: 'Giấy A4',
			cat: 'VPP',
			qty: 100,
			unit: 'ram',
			grade: 1,
			kho: true
		},
		{
			name: 'Mực in laser',
			cat: 'VPP',
			qty: 30,
			unit: 'hộp',
			grade: 1,
			kho: true
		},
		{
			name: 'Bộ đàm cầm tay',
			cat: 'TT',
			qty: 20,
			unit: 'bộ',
			grade: 1,
			unitIdx: 5
		}
	]

	for (const s of samples) {
		const exists = await client.execute({
			sql: `SELECT id FROM room_assets WHERE name = ? AND grade = ? LIMIT 1`,
			args: [s.name, s.grade]
		})
		if (exists.rows.length) continue
		const useKho = s.kho && khoId
		const rid = useKho ? khoId! : roomId
		const holding =
			useKho || s.unitIdx === undefined
				? null
				: unitIds[s.unitIdx % unitIds.length]
		const code =
			`TL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`.toUpperCase()
		await client.execute({
			sql: `INSERT INTO room_assets (room_id, code, name, category, quantity, unit, grade, status, holding_unit_id, install_address)
			      VALUES (?, ?, ?, ?, ?, ?, ?, 'NORMAL', ?, ?)`,
			args: [
				rid,
				code,
				s.name,
				s.cat,
				s.qty,
				s.unit,
				s.grade,
				holding,
				useKho ? 'Kho vật tư' : null
			]
		})
		console.log('Added asset', s.name, 'qty', s.qty)
	}
}

async function main() {
	await ensureColumn()
	await seedUnits()
	await assignHoldings()
	await seedMoreAssets()
	const u = await client.execute('SELECT count(*) c FROM units')
	const a = await client.execute(
		'SELECT count(*) c FROM room_assets WHERE quantity > 0'
	)
	console.log('Units total:', u.rows[0]?.c, 'Assets qty>0:', a.rows[0]?.c)
	console.log('Done.')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
