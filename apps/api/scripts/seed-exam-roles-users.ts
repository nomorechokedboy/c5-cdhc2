/**
 * Seed tài khoản đề thi:
 * - Chủ nhiệm khoa = user ngành (cập nhật displayName)
 * - Ban Khảo thí = Trưởng phòng Đào tạo (exam_office)
 *
 *   cd apps/api && pnpm exec tsx scripts/seed-exam-roles-users.ts
 */
import { createClient } from '@libsql/client'
import argon2 from 'argon2'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('./.env') })

const DB = process.env.DATABASE_URI?.replace(/^file:/, '') || './local.db'
const HASH_SECRET = process.env.HASH_SECRET

if (!HASH_SECRET) {
	console.error('Thiếu HASH_SECRET')
	process.exit(1)
}

async function hashPwd(password: string) {
	return argon2.hash(password, { secret: Buffer.from(HASH_SECRET!) })
}

async function ensureRole(
	client: ReturnType<typeof createClient>,
	name: string,
	description: string
) {
	const ex = await client.execute({
		sql: 'SELECT id FROM roles WHERE name = ?',
		args: [name]
	})
	if (ex.rows.length) return ex.rows[0]!.id as number
	await client.execute({
		sql: 'INSERT INTO roles (name, description) VALUES (?, ?)',
		args: [name, description]
	})
	const row = await client.execute({
		sql: 'SELECT id FROM roles WHERE name = ?',
		args: [name]
	})
	return row.rows[0]!.id as number
}

async function grantExamPerms(
	client: ReturnType<typeof createClient>,
	roleId: number
) {
	await client.execute({
		sql: `
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT ?, p.id FROM permissions p
		WHERE p.name LIKE 'exam%'
		AND NOT EXISTS (
			SELECT 1 FROM role_permissions rp
			WHERE rp.role_id = ? AND rp.permission_id = p.id
		)`,
		args: [roleId, roleId]
	})
}

async function upsertUser(
	client: ReturnType<typeof createClient>,
	u: {
		username: string
		password: string
		displayName: string
		isSuperUser?: boolean
		role: string
	}
) {
	const hashed = await hashPwd(u.password)
	const existing = await client.execute({
		sql: 'SELECT id FROM users WHERE username = ?',
		args: [u.username]
	})
	let userId: number
	if (existing.rows.length) {
		userId = existing.rows[0]!.id as number
		await client.execute({
			sql: `UPDATE users SET password = ?, displayName = ?, isSuperUser = ?, status = 'approved' WHERE id = ?`,
			args: [hashed, u.displayName, u.isSuperUser ? 1 : 0, userId]
		})
		console.log(`↻ ${u.username} — ${u.displayName}`)
	} else {
		await client.execute({
			sql: `INSERT INTO users (username, password, displayName, isSuperUser, status)
			      VALUES (?, ?, ?, ?, 'approved')`,
			args: [u.username, hashed, u.displayName, u.isSuperUser ? 1 : 0]
		})
		const row = await client.execute({
			sql: 'SELECT id FROM users WHERE username = ?',
			args: [u.username]
		})
		userId = row.rows[0]!.id as number
		console.log(`+ ${u.username} — ${u.displayName}`)
	}

	const role = await client.execute({
		sql: 'SELECT id FROM roles WHERE name = ?',
		args: [u.role]
	})
	if (!role.rows.length) {
		console.warn(`  ! role ${u.role} missing`)
		return userId
	}
	const roleId = role.rows[0]!.id as number
	await client.execute({
		sql: 'DELETE FROM user_roles WHERE user_id = ?',
		args: [userId]
	})
	await client.execute({
		sql: 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
		args: [userId, roleId]
	})
	return userId
}

async function main() {
	const client = createClient({
		url: DB.startsWith('file:') ? DB : `file:${path.resolve(DB)}`
	})

	const nganhRole = await ensureRole(
		client,
		'user_nganh',
		'Chủ nhiệm khoa / User ngành — kiểm duyệt đề trước'
	)
	const ktRole = await ensureRole(
		client,
		'exam_office',
		'Ban Khảo thí — Trưởng phòng Đào tạo: thẩm định đề, rút đề'
	)
	await ensureRole(
		client,
		'exam_dept_head',
		'Chủ nhiệm khoa duyệt đề thi (alias CNK)'
	)
	await grantExamPerms(client, nganhRole)
	await grantExamPerms(client, ktRole)

	// CNK = user ngành (cập nhật tên hiển thị)
	const cnkUsers = [
		{
			username: 'user.cntt',
			password: 'User@123',
			displayName: 'CNK — Công nghệ thông tin',
			role: 'user_nganh'
		},
		{
			username: 'KHQS.cdhc2',
			password: 'User@123',
			displayName: 'CNK — Khoa học Quân sự',
			role: 'user_nganh'
		},
		{
			username: 'BKT.cdhc2',
			password: 'User@123',
			displayName: 'CNK — Ban Kỹ thuật',
			role: 'user_nganh'
		},
		{
			username: 'tt.cdhc2',
			password: 'User@123',
			displayName: 'CNK — Thông tin',
			role: 'user_nganh'
		},
		{
			username: 'gddt.cdhc2',
			password: 'User@123',
			displayName: 'CNK — Giáo dục Đào tạo (ngành)',
			role: 'user_nganh'
		},
		// CNK bổ sung theo ngành demo
		{
			username: 'cnk.cntt',
			password: 'User@123',
			displayName: 'CNK — Ngành CNTT',
			role: 'user_nganh'
		},
		{
			username: 'cnk.kt',
			password: 'User@123',
			displayName: 'CNK — Ngành Kế toán',
			role: 'user_nganh'
		},
		{
			username: 'cnk.llct',
			password: 'User@123',
			displayName: 'CNK — Lý luận chính trị',
			role: 'user_nganh'
		}
	]

	// Ban Khảo thí = Trưởng phòng Đào tạo
	const ktUsers = [
		{
			username: 'tpdt.cdhc2',
			password: 'Admin@123',
			displayName: 'Trưởng phòng Đào tạo — Ban Khảo thí',
			role: 'exam_office'
		},
		{
			username: 'khao.thi',
			password: 'Admin@123',
			displayName: 'Ban Khảo thí (TP Đào tạo)',
			role: 'exam_office'
		}
	]

	console.log('=== Chủ nhiệm khoa (user ngành) ===')
	const cnkIds: Array<{ username: string; userId: number }> = []
	for (const u of cnkUsers) {
		const userId = await upsertUser(client, u)
		cnkIds.push({ username: u.username, userId })
	}

	console.log('\n=== Ban Khảo thí (Trưởng phòng Đào tạo) ===')
	for (const u of ktUsers) await upsertUser(client, u)

	// Gán CNK → ngành đào tạo (chỉ duyệt môn ngành mình)
	console.log('\n=== Phân công CNK theo ngành đào tạo ===')
	await client.execute(`
		CREATE TABLE IF NOT EXISTS exam_major_heads (
			id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			created_at text DEFAULT (datetime('now')) NOT NULL,
			updated_at text DEFAULT (datetime('now')) NOT NULL,
			major_id integer NOT NULL,
			user_id integer NOT NULL,
			username text,
			display_name text,
			note text
		)
	`)
	/** username CNK → mã ngành exam_majors */
	const cnkMajorMap: Record<string, string[]> = {
		'cnk.llct': ['LLCT'],
		'cnk.cntt': ['CNTT', 'TEST-CNTT'],
		'user.cntt': ['CNTT', 'TEST-CNTT'],
		'cnk.kt': ['KT'],
		'KHQS.cdhc2': ['ANND'],
		'BKT.cdhc2': ['DEMO'],
		'tt.cdhc2': ['QTKD'],
		'gddt.cdhc2': ['DD']
	}
	for (const { username, userId } of cnkIds) {
		const codes = cnkMajorMap[username]
		if (!codes?.length) continue
		const urow = await client.execute({
			sql: 'SELECT displayName FROM users WHERE id = ?',
			args: [userId]
		})
		const displayName = (urow.rows[0]?.displayName as string) || username
		for (const code of codes) {
			const maj = await client.execute({
				sql: 'SELECT id, name FROM exam_majors WHERE upper(code) = upper(?)',
				args: [code]
			})
			if (!maj.rows.length) {
				console.warn(`  ! ngành ${code} chưa có — bỏ qua ${username}`)
				continue
			}
			const majorId = maj.rows[0]!.id as number
			const majorName = maj.rows[0]!.name as string
			const ex = await client.execute({
				sql: 'SELECT id FROM exam_major_heads WHERE user_id = ? AND major_id = ?',
				args: [userId, majorId]
			})
			if (ex.rows.length) {
				console.log(`↻ ${username} → ${code} (${majorName})`)
				continue
			}
			await client.execute({
				sql: `INSERT INTO exam_major_heads (major_id, user_id, username, display_name, note)
				      VALUES (?, ?, ?, ?, ?)`,
				args: [
					majorId,
					userId,
					username,
					displayName,
					`CNK phụ trách ngành ${code}`
				]
			})
			console.log(`+ ${username} → ${code} (${majorName})`)
		}
	}

	console.log('\n=== Tài khoản dùng thử ===')
	console.log('CNK LLCT:     cnk.llct / User@123  (chỉ ngành LLCT)')
	console.log('CNK CNTT:     cnk.cntt / User@123  (chỉ ngành CNTT)')
	console.log('CNK KT:       cnk.kt / User@123    (chỉ ngành Kế toán)')
	console.log(
		'Ban KT:       tpdt.cdhc2 / Admin@123  hoặc khao.thi / Admin@123'
	)
	console.log('BGH:          bgh.cdhc2 / Admin@123')
	console.log('Super:        admin.cdhc2 / Admin@123')
	console.log('\nLuồng: Soạn → CNK duyệt (ngành mình) → Ban KT → BGH + QR')
	console.log('        KT không đạt → trả CNK (chuông thông báo)')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
