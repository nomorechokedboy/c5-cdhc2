/**
 * Thêm 1 đơn vị + nhiều vật tư/dụng cụ với đủ phân cấp 1–5 để test báo cáo thực lực.
 *
 *   pnpm exec tsx scripts/seed-rich-unit-assets.ts
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

const UNIT_ALIAS = 'KTB'
const UNIT_NAME = 'Khoa Trang bị kỹ thuật'

type Item = {
	name: string
	category: string
	unit: string
	grade: number
	qty: number
	/** true = tồn kho (chưa gán đơn vị / phòng kho) */
	kho?: boolean
}

/** Nhiều dụng cụ, phân cấp đa dạng 1–5 */
const ITEMS: Item[] = [
	// Phân cấp 1 — rất tốt
	{
		name: 'Máy tính xách tay Dell Latitude',
		category: 'IT',
		unit: 'cái',
		grade: 1,
		qty: 25
	},
	{
		name: 'Máy chiếu Epson EB-X06',
		category: 'AV',
		unit: 'cái',
		grade: 1,
		qty: 8
	},
	{
		name: 'Máy in laser HP M404',
		category: 'IT',
		unit: 'cái',
		grade: 1,
		qty: 6
	},
	{
		name: 'Bộ đàm Kenwood TK-2000',
		category: 'TT',
		unit: 'bộ',
		grade: 1,
		qty: 40
	},
	{
		name: 'Bàn thao tác kỹ thuật',
		category: 'Nội thất',
		unit: 'cái',
		grade: 1,
		qty: 12
	},
	// Phân cấp 2 — tốt
	{
		name: 'Máy tính để bàn HP EliteDesk',
		category: 'IT',
		unit: 'bộ',
		grade: 2,
		qty: 30
	},
	{
		name: 'Màn hình LCD 24 inch',
		category: 'IT',
		unit: 'cái',
		grade: 2,
		qty: 30
	},
	{
		name: 'Máy lạnh Daikin 1.5HP',
		category: 'Điện lạnh',
		unit: 'cái',
		grade: 2,
		qty: 10
	},
	{
		name: 'Máy ảnh kỹ thuật số Canon',
		category: 'AV',
		unit: 'cái',
		grade: 2,
		qty: 5
	},
	{
		name: 'Tủ dụng cụ kim loại 5 ngăn',
		category: 'Nội thất',
		unit: 'cái',
		grade: 2,
		qty: 15
	},
	// Phân cấp 3 — bình thường
	{
		name: 'Máy photocopy Ricoh',
		category: 'IT',
		unit: 'cái',
		grade: 3,
		qty: 3
	},
	{
		name: 'Máy hàn điện TIG 200',
		category: 'Kỹ thuật',
		unit: 'bộ',
		grade: 3,
		qty: 4
	},
	{
		name: 'Máy khoan bàn 13mm',
		category: 'Kỹ thuật',
		unit: 'cái',
		grade: 3,
		qty: 8
	},
	{
		name: 'Đồng hồ vạn năng Fluke',
		category: 'Kỹ thuật',
		unit: 'cái',
		grade: 3,
		qty: 12
	},
	{
		name: 'Quạt công nghiệp đứng',
		category: 'Điện',
		unit: 'cái',
		grade: 3,
		qty: 20
	},
	// Phân cấp 4 — có khả năng hư
	{
		name: 'Máy phát điện 5kVA',
		category: 'Điện',
		unit: 'cái',
		grade: 4,
		qty: 2
	},
	{
		name: 'Máy nén khí 50L',
		category: 'Kỹ thuật',
		unit: 'cái',
		grade: 4,
		qty: 3
	},
	{ name: 'UPS 1500VA', category: 'IT', unit: 'cái', grade: 4, qty: 10 },
	{
		name: 'Máy cắt plasma',
		category: 'Kỹ thuật',
		unit: 'bộ',
		grade: 4,
		qty: 2
	},
	// Phân cấp 5 — hỏng / đang SC (một phần trong kho)
	{
		name: 'Máy tính xách tay Dell Latitude',
		category: 'IT',
		unit: 'cái',
		grade: 5,
		qty: 4
	},
	{
		name: 'Máy chiếu Epson EB-X06',
		category: 'AV',
		unit: 'cái',
		grade: 5,
		qty: 2
	},
	{
		name: 'Máy hàn điện TIG 200',
		category: 'Kỹ thuật',
		unit: 'bộ',
		grade: 5,
		qty: 1
	},
	{
		name: 'Máy lạnh Daikin 1.5HP',
		category: 'Điện lạnh',
		unit: 'cái',
		grade: 5,
		qty: 3
	},
	// Kho — chưa sử dụng (holding null, phòng kho)
	{
		name: 'Ổ cứng SSD 512GB (dự phòng)',
		category: 'IT',
		unit: 'cái',
		grade: 1,
		qty: 50,
		kho: true
	},
	{
		name: 'Cáp mạng Cat6 cuộn 305m',
		category: 'IT',
		unit: 'cuộn',
		grade: 1,
		qty: 20,
		kho: true
	},
	{
		name: 'Đèn LED panel 60x60',
		category: 'Điện',
		unit: 'cái',
		grade: 2,
		qty: 40,
		kho: true
	},
	{
		name: 'Bộ tua vít đa năng',
		category: 'Kỹ thuật',
		unit: 'bộ',
		grade: 1,
		qty: 35,
		kho: true
	},
	{
		name: 'Găng tay cách điện',
		category: 'Bảo hộ',
		unit: 'đôi',
		grade: 1,
		qty: 100,
		kho: true
	},
	{
		name: 'Mặt nạ hàn tự động',
		category: 'Bảo hộ',
		unit: 'cái',
		grade: 2,
		qty: 15,
		kho: true
	},
	{
		name: 'Dây hàn que 3.2mm (kg)',
		category: 'Kỹ thuật',
		unit: 'kg',
		grade: 1,
		qty: 80,
		kho: true
	}
]

function code(prefix: string, i: number) {
	return `KTB-${prefix}-${String(i).padStart(3, '0')}`
}

async function ensureUnit(): Promise<number> {
	const ex = await client.execute({
		sql: 'SELECT id FROM units WHERE alias = ?',
		args: [UNIT_ALIAS]
	})
	if (ex.rows.length) {
		console.log('Unit exists', UNIT_ALIAS, ex.rows[0].id)
		return ex.rows[0].id as number
	}
	await client.execute({
		sql: 'INSERT INTO units (alias, level, name, parentId) VALUES (?, 1, ?, NULL)',
		args: [UNIT_ALIAS, UNIT_NAME]
	})
	const r = await client.execute({
		sql: 'SELECT id FROM units WHERE alias = ?',
		args: [UNIT_ALIAS]
	})
	const id = r.rows[0]!.id as number
	console.log('Created unit', UNIT_ALIAS, UNIT_NAME, id)
	return id
}

async function ensureRooms(): Promise<{ useRoom: number; khoRoom: number }> {
	let useRoom: number | undefined
	let khoRoom: number | undefined

	const rooms = await client.execute(
		`SELECT id, room_code, room_type, room_name FROM rooms`
	)
	for (const r of rooms.rows) {
		if (
			!khoRoom &&
			(/kho/i.test(String(r.room_type)) ||
				/kho/i.test(String(r.room_name)))
		) {
			khoRoom = r.id as number
		}
		if (
			!useRoom &&
			!/kho/i.test(String(r.room_type || '')) &&
			!/kho/i.test(String(r.room_name || ''))
		) {
			useRoom = r.id as number
		}
	}

	if (!useRoom || !khoRoom) {
		// tạo tòa + phòng nếu thiếu
		const b = await client.execute(
			`SELECT id FROM buildings WHERE code = 'BLD-KTB' LIMIT 1`
		)
		let bid = b.rows[0]?.id as number | undefined
		if (!bid) {
			await client.execute({
				sql: `INSERT INTO buildings (code, name, address) VALUES (?, ?, ?)`,
				args: ['BLD-KTB', 'Khu Khoa Trang bị', 'Khu kỹ thuật']
			})
			bid = (
				await client.execute(
					`SELECT id FROM buildings WHERE code = 'BLD-KTB'`
				)
			).rows[0]!.id as number
		}
		const f = await client.execute({
			sql: `SELECT id FROM floors WHERE building_id = ? LIMIT 1`,
			args: [bid]
		})
		let fid = f.rows[0]?.id as number | undefined
		if (!fid) {
			await client.execute({
				sql: `INSERT INTO floors (building_id, floor_number, name) VALUES (?, 1, ?)`,
				args: [bid, 'Tầng 1']
			})
			fid = (
				await client.execute({
					sql: `SELECT id FROM floors WHERE building_id = ?`,
					args: [bid]
				})
			).rows[0]!.id as number
		}
		if (!useRoom) {
			await client.execute({
				sql: `INSERT INTO rooms (floor_id, room_code, room_name, room_type, status)
              VALUES (?, 'KTB-P01', 'Xưởng thực hành KTB', 'Lab', 'ACTIVE')`,
				args: [fid]
			})
			useRoom = (
				await client.execute(
					`SELECT id FROM rooms WHERE room_code = 'KTB-P01'`
				)
			).rows[0]!.id as number
		}
		if (!khoRoom) {
			await client.execute({
				sql: `INSERT INTO rooms (floor_id, room_code, room_name, room_type, status)
              VALUES (?, 'KTB-K01', 'Kho Khoa Trang bị', 'Kho', 'ACTIVE')`,
				args: [fid]
			})
			khoRoom = (
				await client.execute(
					`SELECT id FROM rooms WHERE room_code = 'KTB-K01'`
				)
			).rows[0]!.id as number
		}
	}

	return { useRoom: useRoom!, khoRoom: khoRoom! }
}

async function seedAssets(unitId: number, useRoom: number, khoRoom: number) {
	// xóa asset seed cũ của KTB (mã KTB-*)
	await client.execute(`DELETE FROM room_assets WHERE code LIKE 'KTB-%'`)
	console.log('Cleared previous KTB-* assets')

	let i = 0
	for (const it of ITEMS) {
		i++
		const roomId = it.kho ? khoRoom : useRoom
		const holding = it.kho ? null : unitId
		const status = it.grade >= 5 ? 'BROKEN' : 'NORMAL'
		const brokenAt =
			it.grade >= 5 ? new Date().toISOString().slice(0, 10) : null
		const install = it.kho
			? 'Kho Khoa Trang bị'
			: 'Khu Khoa Trang bị, Xưởng thực hành KTB'
		const c = code(it.grade >= 5 ? 'H' : it.kho ? 'K' : 'U', i)

		await client.execute({
			sql: `INSERT INTO room_assets (
        room_id, code, name, category, quantity, unit, grade, status,
        holding_unit_id, install_address, broken_at, manufacture_year, usage_year
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
				roomId,
				c,
				it.name,
				it.category,
				it.qty,
				it.unit,
				it.grade,
				status,
				holding,
				install,
				brokenAt,
				2020 + (it.grade % 4),
				2021 + (it.grade % 3)
			]
		})
		console.log(
			`+ ${c} | ${it.name} | cấp ${it.grade} | SL ${it.qty}${it.kho ? ' [KHO]' : ' [KTB]'}`
		)
	}
}

async function main() {
	const unitId = await ensureUnit()
	const { useRoom, khoRoom } = await ensureRooms()
	await seedAssets(unitId, useRoom, khoRoom)

	const stats = await client.execute({
		sql: `SELECT grade, sum(quantity) q, count(*) n
          FROM room_assets WHERE holding_unit_id = ? OR code LIKE 'KTB-%'
          GROUP BY grade ORDER BY grade`,
		args: [unitId]
	})
	console.log('\nThống kê theo phân cấp (KTB / KTB-*):')
	for (const r of stats.rows) {
		console.log(`  Cấp ${r.grade}: ${r.n} dòng, tổng SL ${r.q}`)
	}
	const total = await client.execute(
		`SELECT count(*) c, sum(quantity) q FROM room_assets WHERE code LIKE 'KTB-%'`
	)
	console.log(
		`Tổng seed: ${total.rows[0]?.c} bản ghi, SL ${total.rows[0]?.q}`
	)
	console.log('Done. Unit alias:', UNIT_ALIAS)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
