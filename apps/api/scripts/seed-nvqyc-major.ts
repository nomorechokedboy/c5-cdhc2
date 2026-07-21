/**
 * Seed ngành NVQYc (Nhân viên quân y) — Hệ quân sự (A)
 * + 12 môn theo khung CTĐT, gán khoa theo logic DMĐT hiện có.
 *
 *   cd apps/api && pnpm exec tsx scripts/seed-nvqyc-major.ts
 *   cd apps/api && pnpm exec tsx scripts/seed-nvqyc-major.ts --reset
 */
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('./.env') })

const DB = process.env.DATABASE_URI?.replace(/^file:/, '') || './local.db'
const RESET = process.argv.includes('--reset')

const MAJOR = {
	code: 'A_NVQYC',
	name: 'Nhân viên quân y (NVQYc)',
	shortCode: 'NVQYC',
	levelCode: null as string | null,
	systemLetter: 'A' as const,
	description: 'Chương trình đào tạo Nhân viên quân y (NVQYc) — 25 tín chỉ'
}

/** Khoa chuẩn K1–K8 (giống các ngành khác) */
const FACULTIES: { code: string; name: string }[] = [
	{ code: 'K1', name: 'Khoa Quân sự chung' },
	{ code: 'K2', name: 'Khoa Khoa học xã hội và nhân văn' },
	{ code: 'K3', name: 'Khoa Khoa học cơ bản' },
	{ code: 'K4', name: 'Khoa Y học cơ sở' },
	{ code: 'K5', name: 'Khoa Y học lâm sàng' },
	{ code: 'K6', name: 'Khoa Y học quân sự' },
	{ code: 'K7', name: 'Khoa Điều dưỡng' },
	{ code: 'K8', name: 'Khoa Dược' }
]

/**
 * Môn NVQYc — gán khoa theo tương đồng DMĐT:
 *  K1 Quân sự chung, K2 chính trị/XHNV, K4 y cơ sở,
 *  K5 lâm sàng + thực tập BV, K6 y học quân sự,
 *  K7 điều dưỡng, K8 dược.
 *
 * creditHours = tín chỉ; lessonHours = tổng tiết (LT+TH)
 */
const SUBJECTS: {
	tt: number
	name: string
	baseCode: string
	facultyCode: string
	lt: number
	th: number
	total: number
	credits: number
}[] = [
	{
		tt: 1,
		name: 'Giáo dục chính trị',
		baseCode: 'M001K2',
		facultyCode: 'K2',
		lt: 45,
		th: 8,
		total: 53,
		credits: 3
	},
	{
		tt: 2,
		name: 'Quân sự chung',
		baseCode: 'M002K1',
		facultyCode: 'K1',
		lt: 30,
		th: 33,
		total: 63,
		credits: 3
	},
	{
		tt: 3,
		name: 'Giải phẫu - Sinh lý',
		baseCode: 'M035K4',
		facultyCode: 'K4',
		lt: 20,
		th: 18,
		total: 38,
		credits: 2
	},
	{
		tt: 4,
		name: 'Thuốc thông thường',
		baseCode: 'M095K8',
		facultyCode: 'K8',
		lt: 26,
		th: 12,
		total: 38,
		credits: 2
	},
	{
		tt: 5,
		name: 'Điều dưỡng cơ bản',
		baseCode: 'M071K7',
		facultyCode: 'K7',
		lt: 24,
		th: 30,
		total: 54,
		credits: 3
	},
	{
		tt: 6,
		name: 'Bệnh nội khoa',
		baseCode: 'M038K5',
		facultyCode: 'K5',
		lt: 38,
		th: 0,
		total: 38,
		credits: 2
	},
	{
		tt: 7,
		name: 'Bệnh ngoại khoa',
		baseCode: 'M040K5',
		facultyCode: 'K5',
		lt: 38,
		th: 0,
		total: 38,
		credits: 2
	},
	{
		tt: 8,
		name: 'Y học cổ truyền',
		baseCode: 'M043K5',
		facultyCode: 'K5',
		lt: 19,
		th: 15,
		total: 34,
		credits: 2
	},
	{
		tt: 9,
		name: 'Tổ chức chiến thuật QY',
		baseCode: 'M051K6',
		facultyCode: 'K6',
		lt: 20,
		th: 8,
		total: 28,
		credits: 1
	},
	{
		tt: 10,
		name: 'Vệ sinh - Phòng dịch',
		baseCode: 'M052K6',
		facultyCode: 'K6',
		lt: 23,
		th: 0,
		total: 23,
		credits: 1
	},
	{
		tt: 11,
		name: '5 kỹ thuật cấp cứu',
		baseCode: 'M055K6',
		facultyCode: 'K6',
		lt: 0,
		th: 43,
		total: 43,
		credits: 1
	},
	{
		tt: 12,
		name: 'Thực tập bệnh viện',
		baseCode: 'M045K5',
		facultyCode: 'K5',
		lt: 0,
		th: 135,
		total: 135,
		credits: 3
	}
]

function subjectFullCode(majCode: string, base: string): string {
	const b = base.trim().toUpperCase()
	const m = majCode.trim().toUpperCase()
	if (b.startsWith(m + '_')) return b
	return `${m}_${b}`
}

async function main() {
	const client = createClient({ url: `file:${DB}` })

	const sys = await client.execute({
		sql: 'SELECT id, code, letter FROM exam_systems WHERE letter = ?',
		args: [MAJOR.systemLetter]
	})
	if (!sys.rows.length) {
		throw new Error(
			'Chưa có Hệ quân sự (letter=A). Import/seed DMĐT trước.'
		)
	}
	const systemId = Number(sys.rows[0]!.id)
	console.log(`Hệ: ${sys.rows[0]!.code} (id=${systemId})`)

	// Existing major?
	const existing = await client.execute({
		sql: 'SELECT id, code, name FROM exam_majors WHERE upper(code) = upper(?)',
		args: [MAJOR.code]
	})

	let majorId: number

	if (existing.rows.length) {
		majorId = Number(existing.rows[0]!.id)
		if (RESET) {
			console.log(
				`--reset: xóa môn + khoa của ngành ${MAJOR.code} (id=${majorId})`
			)
			await client.execute({
				sql: 'DELETE FROM exam_subjects WHERE major_id = ?',
				args: [majorId]
			})
			await client.execute({
				sql: 'DELETE FROM exam_faculties WHERE major_id = ?',
				args: [majorId]
			})
		} else {
			console.log(
				`Ngành ${MAJOR.code} đã tồn tại (id=${majorId}). Cập nhật metadata; dùng --reset để tạo lại môn.`
			)
		}
		await client.execute({
			sql: `UPDATE exam_majors
			      SET name = ?, short_code = ?, level_code = ?, description = ?,
			          system_id = ?, updatedAt = datetime('now')
			      WHERE id = ?`,
			args: [
				MAJOR.name,
				MAJOR.shortCode,
				MAJOR.levelCode,
				MAJOR.description,
				systemId,
				majorId
			]
		})
	} else {
		const ins = await client.execute({
			sql: `INSERT INTO exam_majors
			      (code, name, system_id, level_code, short_code, description, createdAt, updatedAt)
			      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
			args: [
				MAJOR.code,
				MAJOR.name,
				systemId,
				MAJOR.levelCode,
				MAJOR.shortCode,
				MAJOR.description
			]
		})
		majorId = Number(ins.lastInsertRowid)
		console.log(`Tạo ngành ${MAJOR.code} id=${majorId}`)
	}

	// Faculties for this major
	const facIdByCode = new Map<string, number>()
	for (const f of FACULTIES) {
		const found = await client.execute({
			sql: 'SELECT id FROM exam_faculties WHERE major_id = ? AND upper(code) = upper(?)',
			args: [majorId, f.code]
		})
		if (found.rows.length) {
			const id = Number(found.rows[0]!.id)
			await client.execute({
				sql: `UPDATE exam_faculties SET name = ?, updatedAt = datetime('now') WHERE id = ?`,
				args: [f.name, id]
			})
			facIdByCode.set(f.code, id)
		} else {
			const ins = await client.execute({
				sql: `INSERT INTO exam_faculties
				      (code, name, major_id, description, createdAt, updatedAt)
				      VALUES (?, ?, ?, NULL, datetime('now'), datetime('now'))`,
				args: [f.code, f.name, majorId]
			})
			facIdByCode.set(f.code, Number(ins.lastInsertRowid))
		}
	}
	console.log(`Khoa: ${[...facIdByCode.keys()].join(', ')}`)

	// Subjects used by this program
	const usedFacCodes = new Set(SUBJECTS.map((s) => s.facultyCode))

	let created = 0
	let updated = 0
	for (const s of SUBJECTS) {
		const facultyId = facIdByCode.get(s.facultyCode)
		if (!facultyId) throw new Error(`Thiếu khoa ${s.facultyCode}`)
		const fullCode = subjectFullCode(MAJOR.code, s.baseCode)
		const desc = `LT ${s.lt} tiết · TH ${s.th} tiết · Tổng ${s.total} tiết`
		const found = await client.execute({
			sql: 'SELECT id FROM exam_subjects WHERE upper(code) = upper(?)',
			args: [fullCode]
		})
		if (found.rows.length) {
			await client.execute({
				sql: `UPDATE exam_subjects
				      SET name = ?, base_code = ?, credit_hours = ?, lesson_hours = ?,
				          faculty_id = ?, major_id = ?, description = ?, updatedAt = datetime('now')
				      WHERE id = ?`,
				args: [
					s.name,
					s.baseCode.toUpperCase(),
					s.credits,
					s.total,
					facultyId,
					majorId,
					desc,
					Number(found.rows[0]!.id)
				]
			})
			updated++
			console.log(
				`  ~ ${s.tt}. ${fullCode} | ${s.name} | ${s.facultyCode} | ${s.credits} TC | ${s.total} tiết`
			)
		} else {
			await client.execute({
				sql: `INSERT INTO exam_subjects
				      (code, base_code, name, credit_hours, lesson_hours, faculty_id, major_id, description, createdAt, updatedAt)
				      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
				args: [
					fullCode,
					s.baseCode.toUpperCase(),
					s.name,
					s.credits,
					s.total,
					facultyId,
					majorId,
					desc
				]
			})
			created++
			console.log(
				`  + ${s.tt}. ${fullCode} | ${s.name} | ${s.facultyCode} | ${s.credits} TC | ${s.total} tiết`
			)
		}
	}

	const sumCredits = SUBJECTS.reduce((a, s) => a + s.credits, 0)
	const sumLessons = SUBJECTS.reduce((a, s) => a + s.total, 0)
	console.log('\n=== Tóm tắt ===')
	console.log(`Ngành: ${MAJOR.code} — ${MAJOR.name} (id=${majorId})`)
	console.log(
		`Môn: +${created} mới, ~${updated} cập nhật / ${SUBJECTS.length} tổng`
	)
	console.log(`Tín chỉ: ${sumCredits} | Tổng tiết: ${sumLessons}`)
	console.log(`Khoa có môn: ${[...usedFacCodes].sort().join(', ')}`)
	console.log('Xong.')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
