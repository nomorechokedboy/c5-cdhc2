/**
 * Import dữ liệu từ /home/itho/Downloads/data/da ta/*.xlsx
 *
 *   NGANH_QUAN LY.xlsx        → categories (mã ngành HC2A…)
 *   CHUYEN_NGANH.xlsx         → categories (mã chuyên ngành HC2A01…)
 *   DANH MUC_VAT TU.xlsx      → materials
 *   TOAN NHA_GIANG DUONG.xlsx → buildings
 *   PHONG.xlsx                → floors (suy ra) + rooms
 *
 * Usage (from apps/api):
 *   pnpm exec tsx scripts/seed-from-excel-data.ts
 *   pnpm exec tsx scripts/seed-from-excel-data.ts --reset   # xóa data import rồi seed lại
 *   DATA_DIR="/path/to/da ta" pnpm exec tsx scripts/seed-from-excel-data.ts
 */
import { createClient } from '@libsql/client'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { existsSync } from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env') })

const require = createRequire(import.meta.url)
// Prefer local xlsx, fall back to /tmp install used during import
let XLSX: typeof import('xlsx')
try {
	XLSX = require('xlsx')
} catch {
	XLSX = require('/tmp/node_modules/xlsx')
}

const RESET = process.argv.includes('--reset')
const DATA_DIR = process.env.DATA_DIR || '/home/itho/Downloads/data/da ta'

const dbUrl = process.env.DATABASE_URI || 'file:local.db'
const client = createClient({
	url: dbUrl.startsWith('file:') ? dbUrl : `file:${dbUrl}`
})

/** Marker in description to identify rows seeded by this script */
const SEED_TAG = '[import:da-ta]'

function loadSheet(fileName: string): Record<string, unknown>[] {
	const full = path.join(DATA_DIR, fileName)
	if (!existsSync(full)) {
		throw new Error(`Missing file: ${full}`)
	}
	const wb = XLSX.readFile(full)
	const sheet = wb.Sheets[wb.SheetNames[0]!]
	return XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<
		string,
		unknown
	>[]
}

function str(v: unknown): string {
	return String(v ?? '').trim()
}

/** E.000 → 0, H1.101 → 1, S4.201 → 2, S1.001 → 0 */
function floorFromRoomCode(roomCode: string): number {
	const m = roomCode.match(/\.(\d+)$/)
	if (!m) return 0
	const digits = m[1]!
	if (digits.length >= 3) {
		return parseInt(digits.slice(0, digits.length - 2), 10) || 0
	}
	return 0
}

function floorName(n: number): string {
	if (n === 0) return 'Tầng trệt / nền'
	return `Tầng ${n}`
}

async function resetImported() {
	// rooms/floors cascade when building deleted; materials cascade when category deleted
	// Only delete buildings that we imported (all Ma_GD from file, not CDHC2)
	const buildings = loadSheet('TOAN NHA_GIANG DUONG.xlsx')
	const codes = buildings.map((b) => str(b.Ma_GD)).filter(Boolean)
	for (const code of codes) {
		await client.execute({
			sql: `DELETE FROM buildings WHERE code = ?`,
			args: [code]
		})
	}
	// Categories: nganh + chuyen nganh codes
	const nganh = loadSheet('NGANH_QUAN LY.xlsx')
	const cn = loadSheet('CHUYEN_NGANH.xlsx')
	const catCodes = [
		...nganh.map((r) => str(r.MaNganh)),
		...cn.map((r) => str(r.MaCN))
	].filter(Boolean)
	for (const code of catCodes) {
		await client.execute({
			sql: `DELETE FROM categories WHERE code = ?`,
			args: [code]
		})
	}
	console.log('Reset: cleared imported buildings/categories (cascade)')
}

async function seedCategoriesAndMaterials() {
	const nganh = loadSheet('NGANH_QUAN LY.xlsx')
	const cn = loadSheet('CHUYEN_NGANH.xlsx')
	const vatTu = loadSheet('DANH MUC_VAT TU.xlsx')

	const nganhName = new Map<string, string>()
	let nganhIns = 0
	for (const row of nganh) {
		const code = str(row.MaNganh)
		const name = str(row.TenNganh)
		if (!code) continue
		nganhName.set(code, name)
		const exists = await client.execute({
			sql: 'SELECT id FROM categories WHERE code = ?',
			args: [code]
		})
		if (exists.rows.length) continue
		await client.execute({
			sql: `INSERT INTO categories (code, name, description) VALUES (?, ?, ?)`,
			args: [code, name, `Ngành quản lý. ${SEED_TAG}`]
		})
		nganhIns++
	}
	console.log(`categories (ngành): +${nganhIns} / ${nganh.length}`)

	const cnToNganh = new Map<string, string>()
	let cnIns = 0
	for (const row of cn) {
		const code = str(row.MaCN)
		const name = str(row.TenCN)
		const maNganh = str(row.MaNganh)
		if (!code) continue
		cnToNganh.set(code, maNganh)
		const parentName = nganhName.get(maNganh) || maNganh
		const exists = await client.execute({
			sql: 'SELECT id FROM categories WHERE code = ?',
			args: [code]
		})
		if (exists.rows.length) continue
		await client.execute({
			sql: `INSERT INTO categories (code, name, description) VALUES (?, ?, ?)`,
			args: [
				code,
				name,
				`Chuyên ngành thuộc ${parentName} (${maNganh}). ${SEED_TAG}`
			]
		})
		cnIns++
	}
	console.log(`categories (chuyên ngành): +${cnIns} / ${cn.length}`)

	// Resolve category id by MaCN (preferred) or MaNganh
	const catByCode = new Map<string, number>()
	const allCats = await client.execute(`SELECT id, code FROM categories`)
	for (const r of allCats.rows) {
		catByCode.set(String(r.code), r.id as number)
	}

	let matIns = 0
	let matSkip = 0
	for (const row of vatTu) {
		const code = str(row.MaVT)
		const name = str(row['Tên trang bị'] ?? row.TenTrangBi ?? row.name)
		const unit = str(row['Đơn vị tính'] ?? row.DonViTinh ?? 'cái') || 'cái'
		const maCN = str(row.MaCN)
		if (!code || !name) continue

		const exists = await client.execute({
			sql: 'SELECT id FROM materials WHERE code = ?',
			args: [code]
		})
		if (exists.rows.length) {
			matSkip++
			continue
		}

		const categoryId =
			catByCode.get(maCN) ??
			catByCode.get(cnToNganh.get(maCN) || '') ??
			catByCode.get('HC2A')
		if (!categoryId) {
			console.warn(`  skip material ${code}: no category for ${maCN}`)
			continue
		}

		await client.execute({
			sql: `INSERT INTO materials (category_id, code, name, unit, quantity, min_quantity, status, description)
			      VALUES (?, ?, ?, ?, 0, 0, 'ACTIVE', ?)`,
			args: [categoryId, code, name, unit, `MaCN=${maCN}. ${SEED_TAG}`]
		})
		matIns++
	}
	console.log(
		`materials: +${matIns}, skipped existing ${matSkip} / ${vatTu.length}`
	)
}

async function seedBuildingsFloorsRooms() {
	const buildings = loadSheet('TOAN NHA_GIANG DUONG.xlsx')
	const rooms = loadSheet('PHONG.xlsx')

	const buildingIdByCode = new Map<string, number>()
	let bIns = 0
	for (const row of buildings) {
		const code = str(row.Ma_GD)
		const name = str(row.Ten_GD)
		const note = str(row.Ghi_chu)
		if (!code) continue

		const exists = await client.execute({
			sql: 'SELECT id FROM buildings WHERE code = ?',
			args: [code]
		})
		if (exists.rows.length) {
			buildingIdByCode.set(code, exists.rows[0]!.id as number)
			continue
		}
		await client.execute({
			sql: `INSERT INTO buildings (code, name, description) VALUES (?, ?, ?)`,
			args: [
				code,
				name || code,
				[note, SEED_TAG].filter(Boolean).join(' ')
			]
		})
		const got = await client.execute({
			sql: 'SELECT id FROM buildings WHERE code = ?',
			args: [code]
		})
		buildingIdByCode.set(code, got.rows[0]!.id as number)
		bIns++
	}
	console.log(`buildings: +${bIns} / ${buildings.length}`)

	// Group rooms by building → floors needed
	type RoomRow = {
		code: string
		building: string
		dvql: string
		note: string
		floor: number
	}
	const roomRows: RoomRow[] = []
	for (const row of rooms) {
		const code = str(row.Ma_phong)
		const building = str(row.Ma_GD)
		if (!code || !building) continue
		roomRows.push({
			code,
			building,
			dvql: str(row.DVQL),
			note: str(row.Ghi_chu),
			floor: floorFromRoomCode(code)
		})
	}

	// floors: key buildingCode|floorNumber
	const floorIdByKey = new Map<string, number>()
	// load existing floors for these buildings
	for (const [bCode, bId] of buildingIdByCode) {
		const fl = await client.execute({
			sql: 'SELECT id, floor_number FROM floors WHERE building_id = ?',
			args: [bId]
		})
		for (const r of fl.rows) {
			floorIdByKey.set(`${bCode}|${r.floor_number}`, r.id as number)
		}
	}

	const floorsNeeded = new Map<string, { bCode: string; n: number }>()
	for (const r of roomRows) {
		const key = `${r.building}|${r.floor}`
		if (!floorsNeeded.has(key)) {
			floorsNeeded.set(key, { bCode: r.building, n: r.floor })
		}
	}

	let fIns = 0
	for (const [key, { bCode, n }] of floorsNeeded) {
		if (floorIdByKey.has(key)) continue
		const bId = buildingIdByCode.get(bCode)
		if (!bId) {
			console.warn(`  skip floor ${key}: building missing`)
			continue
		}
		const fCode = `${bCode}-F${n}`
		await client.execute({
			sql: `INSERT INTO floors (building_id, floor_number, code, name, description)
			      VALUES (?, ?, ?, ?, ?)`,
			args: [
				bId,
				n,
				fCode,
				floorName(n),
				`Import từ mã phòng. ${SEED_TAG}`
			]
		})
		const got = await client.execute({
			sql: `SELECT id FROM floors WHERE building_id = ? AND floor_number = ?`,
			args: [bId, n]
		})
		floorIdByKey.set(key, got.rows[0]!.id as number)
		fIns++
	}
	console.log(`floors: +${fIns} / needed ${floorsNeeded.size}`)

	let rIns = 0
	let rSkip = 0
	for (const r of roomRows) {
		const exists = await client.execute({
			sql: 'SELECT id FROM rooms WHERE room_code = ?',
			args: [r.code]
		})
		if (exists.rows.length) {
			rSkip++
			continue
		}
		const floorId = floorIdByKey.get(`${r.building}|${r.floor}`)
		if (!floorId) {
			console.warn(`  skip room ${r.code}: no floor`)
			continue
		}
		const roomName = r.note ? `${r.code} — ${r.note}` : `Phòng ${r.code}`
		await client.execute({
			sql: `INSERT INTO rooms (floor_id, room_code, room_name, room_type, manager, capacity, status, description)
			      VALUES (?, ?, ?, ?, ?, 0, 'ACTIVE', ?)`,
			args: [
				floorId,
				r.code,
				roomName,
				'Phòng',
				r.dvql || null,
				[r.note, r.dvql ? `ĐVQL: ${r.dvql}` : '', SEED_TAG]
					.filter(Boolean)
					.join(' | ')
			]
		})
		rIns++
	}
	console.log(
		`rooms: +${rIns}, skipped existing ${rSkip} / ${roomRows.length}`
	)
}

async function printSummary() {
	const q = async (sql: string) => {
		const r = await client.execute(sql)
		return r.rows
	}

	console.log('\n========== TỔNG HỢP SAU IMPORT ==========')
	for (const [label, sql] of [
		['buildings', 'SELECT COUNT(*) AS c FROM buildings'],
		['floors', 'SELECT COUNT(*) AS c FROM floors'],
		['rooms', 'SELECT COUNT(*) AS c FROM rooms'],
		['categories', 'SELECT COUNT(*) AS c FROM categories'],
		['materials', 'SELECT COUNT(*) AS c FROM materials'],
		['room_assets', 'SELECT COUNT(*) AS c FROM room_assets']
	] as const) {
		const rows = await q(sql)
		console.log(`  ${label}: ${rows[0]!.c}`)
	}

	console.log('\n--- buildings ---')
	for (const r of await q(`SELECT code, name FROM buildings ORDER BY code`)) {
		console.log(`  ${r.code}\t${r.name}`)
	}

	console.log('\n--- rooms per building ---')
	for (const r of await q(`
		SELECT b.code, b.name, COUNT(rm.id) AS room_count
		FROM buildings b
		LEFT JOIN floors f ON f.building_id = b.id
		LEFT JOIN rooms rm ON rm.floor_id = f.id
		GROUP BY b.id
		ORDER BY b.code
	`)) {
		console.log(`  ${r.code}\t${r.room_count}\t${r.name}`)
	}

	console.log('\n--- categories (ngành) ---')
	for (const r of await q(
		`SELECT code, name FROM categories WHERE length(code) <= 4 ORDER BY code`
	)) {
		console.log(`  ${r.code}\t${r.name}`)
	}

	console.log('\n--- materials sample (10) ---')
	for (const r of await q(
		`SELECT m.code, m.name, m.unit, c.code AS cat
		 FROM materials m JOIN categories c ON c.id = m.category_id
		 ORDER BY m.code LIMIT 10`
	)) {
		console.log(`  ${r.code}\t${r.unit}\t[${r.cat}]\t${r.name}`)
	}
}

async function main() {
	console.log('DATA_DIR =', DATA_DIR)
	console.log('DATABASE =', dbUrl)

	if (!existsSync(DATA_DIR)) {
		throw new Error(`DATA_DIR not found: ${DATA_DIR}`)
	}

	if (RESET) {
		await resetImported()
	}

	await seedCategoriesAndMaterials()
	await seedBuildingsFloorsRooms()
	await printSummary()
	console.log('\nDone.')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
