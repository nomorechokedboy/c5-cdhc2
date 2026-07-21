/**
 * Seed thực tế: MỖI loại vật tư có nhiều phân cấp (1–5),
 * SL phân bổ khác nhau theo từng đơn vị + một phần kho.
 *
 *   pnpm exec tsx scripts/seed-realistic-grades.ts
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
 * Mỗi vật tư: tổng SL theo từng phân cấp (1–5).
 * Phần lớn cấp 1–2; ít cấp 4–5. Kho = % tách riêng.
 */
type Mat = {
	name: string
	category: string
	dvt: string
	/** [g1, g2, g3, g4, g5] số lượng */
	byGrade: [number, number, number, number, number]
	/** tỷ lệ đưa vào kho (0–1) trên từng cấp */
	khoRatio?: number
}

const MATERIALS: Mat[] = [
	{
		name: 'Máy tính xách tay Dell Latitude',
		category: 'IT',
		dvt: 'cái',
		byGrade: [40, 18, 8, 4, 5],
		khoRatio: 0.15
	},
	{
		name: 'Máy tính để bàn HP EliteDesk',
		category: 'IT',
		dvt: 'bộ',
		byGrade: [35, 22, 10, 5, 3],
		khoRatio: 0.1
	},
	{
		name: 'Màn hình LCD 24 inch',
		category: 'IT',
		dvt: 'cái',
		byGrade: [50, 20, 12, 6, 4],
		khoRatio: 0.12
	},
	{
		name: 'Máy chiếu Epson EB-X06',
		category: 'AV',
		dvt: 'cái',
		byGrade: [12, 6, 3, 2, 2],
		khoRatio: 0.1
	},
	{
		name: 'Máy in laser HP M404',
		category: 'IT',
		dvt: 'cái',
		byGrade: [10, 5, 3, 2, 1],
		khoRatio: 0.08
	},
	{
		name: 'Bộ đàm Kenwood TK-2000',
		category: 'TT',
		dvt: 'bộ',
		byGrade: [60, 25, 10, 5, 3],
		khoRatio: 0.2
	},
	{
		name: 'Máy lạnh Daikin 1.5HP',
		category: 'Điện lạnh',
		dvt: 'cái',
		byGrade: [15, 8, 4, 3, 4],
		khoRatio: 0.05
	},
	{
		name: 'Máy hàn điện TIG 200',
		category: 'Kỹ thuật',
		dvt: 'bộ',
		byGrade: [8, 5, 4, 2, 2],
		khoRatio: 0.1
	},
	{
		name: 'Máy khoan bàn 13mm',
		category: 'Kỹ thuật',
		dvt: 'cái',
		byGrade: [14, 8, 5, 3, 2],
		khoRatio: 0.1
	},
	{
		name: 'Đồng hồ vạn năng Fluke',
		category: 'Kỹ thuật',
		dvt: 'cái',
		byGrade: [20, 10, 6, 3, 1],
		khoRatio: 0.15
	},
	{
		name: 'UPS 1500VA',
		category: 'IT',
		dvt: 'cái',
		byGrade: [18, 10, 5, 4, 2],
		khoRatio: 0.12
	},
	{
		name: 'Máy phát điện 5kVA',
		category: 'Điện',
		dvt: 'cái',
		byGrade: [4, 3, 2, 2, 1],
		khoRatio: 0.1
	},
	{
		name: 'Quạt công nghiệp đứng',
		category: 'Điện',
		dvt: 'cái',
		byGrade: [25, 15, 8, 4, 2],
		khoRatio: 0.1
	},
	{
		name: 'Bàn thao tác kỹ thuật',
		category: 'Nội thất',
		dvt: 'cái',
		byGrade: [20, 10, 5, 2, 1],
		khoRatio: 0.05
	},
	{
		name: 'Tủ dụng cụ kim loại 5 ngăn',
		category: 'Nội thất',
		dvt: 'cái',
		byGrade: [16, 8, 4, 2, 1],
		khoRatio: 0.08
	},
	{
		name: 'Bộ tua vít đa năng',
		category: 'Kỹ thuật',
		dvt: 'bộ',
		byGrade: [40, 15, 8, 3, 2],
		khoRatio: 0.25
	},
	{
		name: 'Găng tay cách điện',
		category: 'Bảo hộ',
		dvt: 'đôi',
		byGrade: [80, 30, 15, 5, 0],
		khoRatio: 0.4
	},
	{
		name: 'Mặt nạ hàn tự động',
		category: 'Bảo hộ',
		dvt: 'cái',
		byGrade: [20, 10, 5, 3, 2],
		khoRatio: 0.2
	},
	{
		name: 'Micro không dây',
		category: 'AV',
		dvt: 'bộ',
		byGrade: [15, 8, 4, 2, 1],
		khoRatio: 0.1
	},
	{
		name: 'Tivi LED 55 inch',
		category: 'AV',
		dvt: 'cái',
		byGrade: [10, 6, 3, 2, 1],
		khoRatio: 0.05
	},
	/**
	 * Ví dụ rõ: cùng 1 loại VT, tách từng phân cấp
	 * cấp 2: 3, cấp 3: 1 (+ các cấp khác)
	 */
	{
		name: 'Switch 24 port',
		category: 'IT',
		dvt: 'cái',
		// [g1, g2, g3, g4, g5]
		byGrade: [5, 3, 1, 1, 2],
		khoRatio: 0.15
	},
	{
		name: 'Router Cisco ISR',
		category: 'IT',
		dvt: 'cái',
		byGrade: [4, 2, 2, 1, 1],
		khoRatio: 0.1
	},
	{
		name: 'Access Point WiFi 6',
		category: 'IT',
		dvt: 'cái',
		byGrade: [8, 4, 2, 1, 1],
		khoRatio: 0.12
	}
]

function splitToUnits(total: number, unitCount: number): number[] {
	if (total <= 0) return Array(unitCount).fill(0)
	if (unitCount <= 0) return []
	const base = Math.floor(total / unitCount)
	const rem = total % unitCount
	const out = Array(unitCount).fill(base)
	// phân bố phần dư không đều — thực tế hơn
	for (let i = 0; i < rem; i++) {
		out[i % unitCount] += 1
	}
	// xáo nhẹ: chuyển bớt từ đầu sang giữa
	for (let i = 0; i < unitCount && out[0] > 1; i++) {
		if (i % 3 === 0 && out[0] > out[unitCount - 1]) {
			out[0]--
			out[unitCount - 1 - (i % unitCount)]++
		}
	}
	return out
}

async function ensureRooms() {
	const rooms = await client.execute(
		`SELECT id, room_type, room_name FROM rooms`
	)
	let useRoom: number | undefined
	let khoRoom: number | undefined
	for (const r of rooms.rows) {
		const kho =
			/kho/i.test(String(r.room_type || '')) ||
			/kho/i.test(String(r.room_name || ''))
		if (kho && !khoRoom) khoRoom = r.id as number
		if (!kho && !useRoom) useRoom = r.id as number
	}
	if (!useRoom || !khoRoom) {
		throw new Error(
			'Cần ít nhất 1 phòng thường + 1 kho. Chạy seed-asset-demo trước.'
		)
	}
	return { useRoom, khoRoom }
}

async function companyUnits(): Promise<Array<{ id: number; alias: string }>> {
	const r = await client.execute(
		`SELECT id, alias FROM units WHERE level = 1 ORDER BY alias`
	)
	return r.rows.map((x) => ({
		id: x.id as number,
		alias: String(x.alias)
	}))
}

async function main() {
	const { useRoom, khoRoom } = await ensureRooms()
	const units = await companyUnits()
	if (units.length < 3) {
		throw new Error('Cần nhiều đơn vị company. Chạy seed-military-depts.ts')
	}

	// Xóa seed cũ REAL-* và KTB-* (demo gộp một cấp)
	await client.execute(
		`DELETE FROM room_assets WHERE code LIKE 'REAL-%' OR code LIKE 'KTB-%'`
	)
	console.log('Cleared REAL-* / KTB-* assets')

	let seq = 0
	let totalRows = 0
	let totalQty = 0

	for (const mat of MATERIALS) {
		const khoRatio = mat.khoRatio ?? 0.1
		console.log(`\n== ${mat.name} ==`)

		for (let g = 1; g <= 5; g++) {
			const gradeQty = mat.byGrade[g - 1]
			if (gradeQty <= 0) continue

			const khoQty = Math.floor(gradeQty * khoRatio)
			const useQty = gradeQty - khoQty

			// chia useQty cho nhiều đơn vị (không dồn 1 đơn vị / 1 cấp)
			const parts = splitToUnits(useQty, units.length)
			// chỉ tạo bản ghi cho đơn vị có SL > 0
			for (let ui = 0; ui < units.length; ui++) {
				const q = parts[ui]
				if (q <= 0) continue
				seq++
				const code = `REAL-${String(seq).padStart(4, '0')}-G${g}`
				const status = g >= 5 ? 'BROKEN' : 'NORMAL'
				await client.execute({
					sql: `INSERT INTO room_assets (
            room_id, code, name, category, quantity, unit, grade, status,
            holding_unit_id, install_address, broken_at, manufacture_year, usage_year
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
					args: [
						useRoom,
						code,
						mat.name,
						mat.category,
						q,
						mat.dvt,
						g,
						status,
						units[ui].id,
						`Đơn vị ${units[ui].alias}`,
						g >= 5 ? new Date().toISOString().slice(0, 10) : null,
						2018 + g,
						2019 + (g % 3)
					]
				})
				totalRows++
				totalQty += q
			}

			if (khoQty > 0) {
				seq++
				const code = `REAL-${String(seq).padStart(4, '0')}-G${g}K`
				await client.execute({
					sql: `INSERT INTO room_assets (
            room_id, code, name, category, quantity, unit, grade, status,
            holding_unit_id, install_address, broken_at, manufacture_year, usage_year
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)`,
					args: [
						khoRoom,
						code,
						mat.name,
						mat.category,
						khoQty,
						mat.dvt,
						g,
						g >= 5 ? 'BROKEN' : 'NORMAL',
						'Kho vật tư',
						g >= 5 ? new Date().toISOString().slice(0, 10) : null,
						2018 + g,
						2019
					]
				})
				totalRows++
				totalQty += khoQty
				console.log(
					`  Cấp ${g}: dùng ${useQty} (chia ${units.length} ĐV) + kho ${khoQty}`
				)
			} else {
				console.log(
					`  Cấp ${g}: dùng ${useQty} (chia ${units.length} ĐV), kho 0`
				)
			}
		}
	}

	// Thống kê mẫu 1 vật tư
	const sample = MATERIALS[0].name
	const st = await client.execute({
		sql: `SELECT grade, holding_unit_id, sum(quantity) q
          FROM room_assets WHERE name = ? AND quantity > 0
          GROUP BY grade, holding_unit_id
          ORDER BY grade, holding_unit_id`,
		args: [sample]
	})
	console.log(`\nChi tiết «${sample}» theo cấp + đơn vị (một phần):`)
	for (const r of st.rows.slice(0, 25)) {
		console.log(
			`  cấp ${r.grade} unit=${r.holding_unit_id ?? 'KHO'} SL=${r.q}`
		)
	}

	console.log(`\nTổng: ${totalRows} bản ghi, SL ${totalQty}`)
	console.log('Done.')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
