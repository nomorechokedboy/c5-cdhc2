/**
 * Seed demo data for Quản lý vật tư (buildings → floors → rooms → assets + logs).
 *
 * Usage (from apps/api):
 *   pnpm exec tsx scripts/seed-asset-demo.ts
 *   pnpm exec tsx scripts/seed-asset-demo.ts --reset   # xóa data demo (mã BLD-DEMO-*) rồi seed lại
 */
import { createClient } from '@libsql/client'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { createHash } from 'crypto'

const DB = process.env.DATABASE_URI?.replace(/^file:/, '') || './local.db'
const RESET = process.argv.includes('--reset')

function hashMigration(content: string) {
	return createHash('sha256').update(content).digest('hex')
}

function splitSql(sql: string) {
	return sql
		.split('--> statement-breakpoint')
		.map((s) => s.trim())
		.filter(Boolean)
}

async function ensureMigrations(client: ReturnType<typeof createClient>) {
	// Ensure migration tracking table exists (drizzle default name)
	await client.execute(`
		CREATE TABLE IF NOT EXISTS __drizzle_migrations (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			hash TEXT NOT NULL,
			created_at NUMERIC
		)
	`)

	const migrationsDir = path.resolve('./migrations')
	for (const file of [
		'0004_asset-management-tables.sql',
		'0005_seed-asset-authz.sql',
		'0006_room-asset-repair-fields.sql',
		'0007_repair-requests.sql'
	]) {
		const full = path.join(migrationsDir, file)
		if (!existsSync(full)) {
			console.warn(`Skip missing migration: ${file}`)
			continue
		}
		const content = readFileSync(full, 'utf8')
		const hash = hashMigration(content)
		const exists = await client.execute({
			sql: 'SELECT 1 AS ok FROM __drizzle_migrations WHERE hash = ? LIMIT 1',
			args: [hash]
		})
		if (exists.rows.length) {
			console.log(`Migration already applied: ${file}`)
			continue
		}

		// 0004: skip if buildings already exist
		if (file.startsWith('0004')) {
			const t = await client.execute(
				`SELECT name FROM sqlite_master WHERE type='table' AND name='buildings'`
			)
			if (t.rows.length) {
				console.log(`Tables exist, record hash only: ${file}`)
				await client.execute({
					sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
					args: [hash, Date.now()]
				})
				continue
			}
		}
		// 0007: create table if missing
		if (file.startsWith('0007')) {
			const t = await client.execute(
				`SELECT name FROM sqlite_master WHERE type='table' AND name='repair_requests'`
			)
			if (t.rows.length) {
				console.log(
					`Table repair_requests exists, record hash: ${file}`
				)
				await client.execute({
					sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
					args: [hash, Date.now()]
				})
				// still try seed RBAC parts by running statements that are idempotent
				for (const stmt of splitSql(content)) {
					if (stmt.trim().toUpperCase().startsWith('CREATE TABLE'))
						continue
					try {
						await client.execute(stmt)
					} catch {
						/* ignore */
					}
				}
				continue
			}
		}
		// 0006: apply ALTERs; ignore duplicate column
		if (file.startsWith('0006')) {
			console.log(`Applying ${file}...`)
			for (const stmt of splitSql(content)) {
				try {
					await client.execute(stmt)
				} catch (e) {
					const msg = (e as Error).message || ''
					if (msg.includes('duplicate column')) {
						console.warn(`  column exists, skip`)
						continue
					}
					throw e
				}
			}
			await client.execute({
				sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
				args: [hash, Date.now()]
			})
			console.log(`Done: ${file}`)
			continue
		}

		console.log(`Applying ${file}...`)
		for (const stmt of splitSql(content)) {
			try {
				await client.execute(stmt)
			} catch (e) {
				const msg = (e as Error).message || ''
				// idempotent-ish for partial seeds
				if (
					msg.includes('already exists') ||
					msg.includes('UNIQUE constraint')
				) {
					console.warn(`  warn (ignored): ${msg.slice(0, 80)}`)
					continue
				}
				throw e
			}
		}
		await client.execute({
			sql: 'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?)',
			args: [hash, Date.now()]
		})
		console.log(`Done: ${file}`)
	}
}

async function clearDemo(client: ReturnType<typeof createClient>) {
	// Cascade: buildings with demo codes
	await client.execute(`DELETE FROM buildings WHERE code LIKE 'BLD-DEMO-%'`)
	console.log('Cleared previous BLD-DEMO-* data (cascade)')
}

async function seed(client: ReturnType<typeof createClient>) {
	const today = new Date()
	const d = (offsetDays: number) => {
		const x = new Date(today)
		x.setDate(x.getDate() + offsetDays)
		return x.toISOString().slice(0, 10)
	}

	// ── Tòa A ──────────────────────────────────────────────
	await client.execute({
		sql: `INSERT INTO buildings (code, name, address, description)
		      VALUES (?, ?, ?, ?)`,
		args: [
			'BLD-DEMO-A',
			'Tòa học tập A',
			'Khu A - CĐHC2',
			'Dữ liệu demo test Quản lý vật tư'
		]
	})
	const bA = await client.execute(
		`SELECT id FROM buildings WHERE code = 'BLD-DEMO-A'`
	)
	const buildingA = bA.rows[0]!.id as number

	await client.execute({
		sql: `INSERT INTO floors (building_id, floor_number, name, description) VALUES (?, ?, ?, ?)`,
		args: [buildingA, 1, 'Tầng 1', 'Sảnh + phòng học']
	})
	await client.execute({
		sql: `INSERT INTO floors (building_id, floor_number, name, description) VALUES (?, ?, ?, ?)`,
		args: [buildingA, 2, 'Tầng 2', 'Phòng chuyên ngành']
	})
	const floorsA = await client.execute({
		sql: `SELECT id, floor_number FROM floors WHERE building_id = ? ORDER BY floor_number`,
		args: [buildingA]
	})
	const fA1 = floorsA.rows[0]!.id as number
	const fA2 = floorsA.rows[1]!.id as number

	// Rooms floor 1
	await client.execute({
		sql: `INSERT INTO rooms (floor_id, room_code, room_name, room_type, manager, capacity, status, description)
		      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			fA1,
			'A-101',
			'Phòng học 101',
			'Học tập',
			'Thượng úy An',
			40,
			'ACTIVE',
			'Phòng học demo'
		]
	})
	await client.execute({
		sql: `INSERT INTO rooms (floor_id, room_code, room_name, room_type, manager, capacity, status)
		      VALUES (?, ?, ?, ?, ?, ?, ?)`,
		args: [
			fA1,
			'A-102',
			'Phòng máy 102',
			'Lab',
			'Trung úy Bình',
			30,
			'ACTIVE'
		]
	})
	// Rooms floor 2
	await client.execute({
		sql: `INSERT INTO rooms (floor_id, room_code, room_name, room_type, manager, capacity, status)
		      VALUES (?, ?, ?, ?, ?, ?, ?)`,
		args: [
			fA2,
			'A-201',
			'Phòng họp 201',
			'Họp',
			'Đại úy Cường',
			20,
			'MAINTENANCE'
		]
	})

	const roomsA = await client.execute(
		`SELECT id, room_code FROM rooms WHERE room_code IN ('A-101','A-102','A-201')`
	)
	const roomByCode = Object.fromEntries(
		roomsA.rows.map((r) => [r.room_code as string, r.id as number])
	)

	// Assets room A-101
	const r101 = roomByCode['A-101']
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, name, category, quantity, unit, status, purchase_date, expiry_date, description)
		      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			r101,
			'Máy chiếu Epson',
			'AV',
			1,
			'cái',
			'NORMAL',
			d(-400),
			d(15),
			'Sắp hết BH — test báo cáo hết hạn'
		]
	})
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, name, category, quantity, unit, status, purchase_date, expiry_date)
		      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			r101,
			'Bàn học sinh',
			'Nội thất',
			20,
			'cái',
			'NORMAL',
			d(-800),
			null
		]
	})
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, name, category, quantity, unit, status, purchase_date, broken_at, repair_started_at, repair_completed_at, repair_performer)
		      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			r101,
			'Quạt trần',
			'Điện',
			4,
			'cái',
			'BROKEN',
			d(-600),
			d(-10),
			null,
			null,
			null
		]
	})

	// Assets room A-102
	const r102 = roomByCode['A-102']
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, name, category, quantity, unit, status, purchase_date, expiry_date)
		      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			r102,
			'PC Dell OptiPlex',
			'IT',
			15,
			'bộ',
			'NORMAL',
			d(-200),
			d(90)
		]
	})
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, name, category, quantity, unit, status, broken_at, repair_started_at, repair_completed_at, repair_performer)
		      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			r102,
			'Switch 24 port',
			'IT',
			1,
			'cái',
			'REPAIRING',
			d(-5),
			d(-2),
			null,
			'KTV Lan'
		]
	})

	// Assets room A-201
	const r201 = roomByCode['A-201']
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, name, category, quantity, unit, status, expiry_date)
		      VALUES (?, ?, ?, ?, ?, ?, ?)`,
		args: [
			r201,
			'Máy lạnh Daikin 2HP',
			'Điện lạnh',
			2,
			'cái',
			'NORMAL',
			d(5)
		]
	})

	// Images (URI giả — không cần file thật)
	await client.execute({
		sql: `INSERT INTO room_images (room_id, image_url, title, description)
		      VALUES (?, ?, ?, ?)`,
		args: [
			r101,
			'demo://rooms/a-101-overview.jpg',
			'Ảnh tổng quan 101',
			'URI demo'
		]
	})
	await client.execute({
		sql: `INSERT INTO room_images (room_id, image_url, title)
		      VALUES (?, ?, ?)`,
		args: [r102, 'demo://rooms/a-102-lab.jpg', 'Phòng máy 102']
	})

	// Get asset ids for logs
	const assets101 = await client.execute({
		sql: `SELECT id, name, status FROM room_assets WHERE room_id = ?`,
		args: [r101]
	})
	const projector = assets101.rows.find((a) =>
		String(a.name).includes('Máy chiếu')
	)
	const fan = assets101.rows.find((a) => String(a.name).includes('Quạt'))
	const assets102 = await client.execute({
		sql: `SELECT id, name FROM room_assets WHERE room_id = ?`,
		args: [r102]
	})
	const switchAsset = assets102.rows.find((a) =>
		String(a.name).includes('Switch')
	)

	if (projector) {
		await client.execute({
			sql: `INSERT INTO repair_logs (room_asset_id, repair_date, content, cost, performer, note)
			      VALUES (?, ?, ?, ?, ?, ?)`,
			args: [
				projector.id,
				d(-30),
				'Thay bóng đèn máy chiếu',
				450000,
				'KTV Minh',
				'Demo SC'
			]
		})
		await client.execute({
			sql: `INSERT INTO inventory_logs (room_asset_id, inventory_date, actual_quantity, expected_quantity, result, note)
			      VALUES (?, ?, ?, ?, ?, ?)`,
			args: [projector.id, d(-7), 1, 1, 'OK', 'Kiểm kê định kỳ']
		})
		await client.execute({
			sql: `INSERT INTO replacement_logs (room_asset_id, replacement_date, old_asset, new_asset, reason, performer)
			      VALUES (?, ?, ?, ?, ?, ?)`,
			args: [
				projector.id,
				d(-120),
				'Máy chiếu cũ Sony',
				'Máy chiếu Epson',
				'Hết khấu hao',
				'Ban CSVC'
			]
		})
	}
	if (fan) {
		await client.execute({
			sql: `INSERT INTO repair_logs (room_asset_id, repair_date, content, cost, performer)
			      VALUES (?, ?, ?, ?, ?)`,
			args: [fan.id, d(-3), 'Quạt kêu to — chờ thay motor', 0, 'KTV Hùng']
		})
		await client.execute({
			sql: `INSERT INTO inventory_logs (room_asset_id, inventory_date, actual_quantity, expected_quantity, result)
			      VALUES (?, ?, ?, ?, ?)`,
			args: [fan.id, d(-1), 3, 4, 'Thiếu 1']
		})
	}
	if (switchAsset) {
		await client.execute({
			sql: `INSERT INTO repair_logs (room_asset_id, repair_date, content, cost, performer)
			      VALUES (?, ?, ?, ?, ?)`,
			args: [
				switchAsset.id,
				d(-2),
				'Sửa port hỏng, đang chờ linh kiện',
				1200000,
				'KTV Lan'
			]
		})
	}

	// Phiếu báo hỏng demo (chờ phân công) — quạt A-101
	if (fan) {
		await client.execute({
			sql: `INSERT INTO repair_requests (
				room_id, room_asset_id, asset_name, category, description, status,
				broken_at, reported_by_name
			) VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`,
			args: [
				r101,
				fan.id,
				'Quạt trần',
				'Điện',
				'Quạt kêu to, không quay ổn định — báo từ phòng',
				d(-1),
				'Trực ban phòng 101'
			]
		})
	}
	// Phiếu đã gán demo — switch A-102
	if (switchAsset) {
		await client.execute({
			sql: `INSERT INTO repair_requests (
				room_id, room_asset_id, asset_name, category, description, status,
				broken_at, reported_by_name, assigned_to_name, assigned_at, assigned_by_name,
				repair_started_at
			) VALUES (?, ?, ?, ?, ?, 'IN_PROGRESS', ?, ?, ?, ?, ?, ?)`,
			args: [
				r102,
				switchAsset.id,
				'Switch 24 port',
				'IT',
				'Port 12-16 die',
				d(-5),
				'QL phòng máy',
				'KTV Lan',
				d(-2),
				'Admin CSVC',
				d(-2)
			]
		})
	}

	// ── Tòa B (nhỏ hơn) ────────────────────────────────────
	await client.execute({
		sql: `INSERT INTO buildings (code, name, address) VALUES (?, ?, ?)`,
		args: ['BLD-DEMO-B', 'Nhà để xe / kho B', 'Khu B']
	})
	const bB = await client.execute(
		`SELECT id FROM buildings WHERE code = 'BLD-DEMO-B'`
	)
	const buildingB = bB.rows[0]!.id as number
	await client.execute({
		sql: `INSERT INTO floors (building_id, floor_number, name) VALUES (?, ?, ?)`,
		args: [buildingB, 0, 'Tầng trệt']
	})
	const fB = await client.execute({
		sql: `SELECT id FROM floors WHERE building_id = ?`,
		args: [buildingB]
	})
	const fB0 = fB.rows[0]!.id as number
	await client.execute({
		sql: `INSERT INTO rooms (floor_id, room_code, room_name, room_type, capacity, status)
		      VALUES (?, ?, ?, ?, ?, ?)`,
		args: [fB0, 'B-K01', 'Kho vật tư', 'Kho', 0, 'ACTIVE']
	})
	const rK = await client.execute(
		`SELECT id FROM rooms WHERE room_code = 'B-K01'`
	)
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, name, category, quantity, unit, status, expiry_date)
		      VALUES (?, ?, ?, ?, ?, ?, ?)`,
		args: [
			rK.rows[0]!.id,
			'Bình chữa cháy CO2',
			'PCCC',
			8,
			'bình',
			'NORMAL',
			d(20)
		]
	})

	console.log(`
========== SEED DEMO OK ==========
Tòa nhà:
  - BLD-DEMO-A  "Tòa học tập A"  (2 tầng, 3 phòng)
  - BLD-DEMO-B  "Nhà để xe / kho B" (1 tầng, 1 phòng)

Phòng:
  A-101  Phòng học 101   — 3 VT (máy chiếu sắp HH, bàn, quạt HỎNG)
  A-102  Phòng máy 102   — 2 VT (PC, switch đang sửa)
  A-201  Phòng họp 201   — 1 VT (máy lạnh sắp HH 5 ngày) [MAINTENANCE]
  B-K01  Kho vật tư      — bình chữa cháy

Có: ảnh demo URI, NK sửa chữa / kiểm kê / thay thế

Web test:
  1. Sidebar → Quản lý vật tư → Danh mục tòa nhà
  2. Mở hồ sơ phòng A-101
  3. Báo cáo: Hỏng / Sắp hết hạn / Lịch sử SC

Reset & seed lại:
  pnpm exec tsx scripts/seed-asset-demo.ts --reset
==================================
`)
}

async function main() {
	const dbPath = path.isAbsolute(DB) ? DB : path.resolve(DB)
	console.log(`DB: ${dbPath}`)
	if (!existsSync(dbPath) && !existsSync(path.dirname(dbPath))) {
		console.error('Database path invalid')
		process.exit(1)
	}

	const client = createClient({ url: `file:${dbPath}` })
	try {
		await ensureMigrations(client)

		const existing = await client.execute(
			`SELECT code FROM buildings WHERE code LIKE 'BLD-DEMO-%'`
		)
		if (existing.rows.length && !RESET) {
			console.log(
				'Demo data already exists:',
				existing.rows.map((r) => r.code).join(', ')
			)
			console.log('Run with --reset to re-seed.')
			return
		}
		if (RESET) await clearDemo(client)
		await seed(client)
	} finally {
		client.close()
	}
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
