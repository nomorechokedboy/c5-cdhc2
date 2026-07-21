/**
 * Tạo / cập nhật 8 Chủ nhiệm khoa (K1…K8) — 1 TK / khoa.
 * Ghi vào users + user_roles (user_nganh) + exam_faculty_heads.
 *
 *   cd apps/api && pnpm exec tsx scripts/seed-cnk-by-faculty.ts
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

const PASSWORD = 'User@123'

/** 8 khoa chuẩn DMĐT */
const FACULTIES: Array<{
	code: string
	name: string
	username: string
	/** Họ tên gợi ý trên danh sách users */
	personName: string
}> = [
	{
		code: 'K1',
		name: 'Khoa Quân sự chung',
		username: 'cnk.k1',
		personName: 'Nguyễn Văn Quyền'
	},
	{
		code: 'K2',
		name: 'Khoa Khoa học xã hội và nhân văn',
		username: 'cnk.k2',
		personName: 'Trần Thị Văn'
	},
	{
		code: 'K3',
		name: 'Khoa Khoa học cơ bản',
		username: 'cnk.k3',
		personName: 'Lê Minh Cơ'
	},
	{
		code: 'K4',
		name: 'Khoa Y học cơ sở',
		username: 'cnk.k4',
		personName: 'Phạm Thị Yến'
	},
	{
		code: 'K5',
		name: 'Khoa Y học lâm sàng',
		username: 'cnk.k5',
		personName: 'Hoàng Văn Lâm'
	},
	{
		code: 'K6',
		name: 'Khoa Y học quân sự',
		username: 'cnk.k6',
		personName: 'Vũ Đức Quân'
	},
	{
		code: 'K7',
		name: 'Khoa Điều dưỡng',
		username: 'cnk.k7',
		personName: 'Nguyễn Thị Lan'
	},
	{
		code: 'K8',
		name: 'Khoa Dược',
		username: 'cnk.k8',
		personName: 'Đặng Thị Dược'
	}
]

type Client = ReturnType<typeof createClient>

async function hashPwd(password: string) {
	return argon2.hash(password, { secret: Buffer.from(HASH_SECRET!) })
}

async function ensureRole(client: Client, name: string, description: string) {
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

async function ensureFacultyHeadsTable(client: Client) {
	await client.execute(`
		CREATE TABLE IF NOT EXISTS exam_faculty_heads (
			id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			created_at text DEFAULT (datetime('now')) NOT NULL,
			updated_at text DEFAULT (datetime('now')) NOT NULL,
			faculty_code text NOT NULL,
			faculty_name text,
			user_id integer NOT NULL,
			username text,
			display_name text,
			note text
		)
	`)
	await client.execute(
		`CREATE UNIQUE INDEX IF NOT EXISTS exam_faculty_heads_user_fac_uq
		 ON exam_faculty_heads (user_id, faculty_code)`
	)
}

async function upsertUser(
	client: Client,
	u: {
		username: string
		password: string
		displayName: string
		role: string
	}
): Promise<number> {
	const hashed = await hashPwd(u.password)
	const existing = await client.execute({
		sql: 'SELECT id FROM users WHERE username = ?',
		args: [u.username]
	})
	let userId: number
	if (existing.rows.length) {
		userId = existing.rows[0]!.id as number
		await client.execute({
			sql: `UPDATE users SET password = ?, displayName = ?, isSuperUser = 0, status = 'approved' WHERE id = ?`,
			args: [hashed, u.displayName, userId]
		})
		console.log(`↻ user ${u.username} — ${u.displayName}`)
	} else {
		await client.execute({
			sql: `INSERT INTO users (username, password, displayName, isSuperUser, status)
			      VALUES (?, ?, ?, 0, 'approved')`,
			args: [u.username, hashed, u.displayName]
		})
		const row = await client.execute({
			sql: 'SELECT id FROM users WHERE username = ?',
			args: [u.username]
		})
		userId = row.rows[0]!.id as number
		console.log(`+ user ${u.username} — ${u.displayName}`)
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

async function ensureFacultyHead(
	client: Client,
	opts: {
		userId: number
		username: string
		displayName: string
		facultyCode: string
		facultyName: string
		note: string
	}
) {
	// 1 khoa = 1 CNK chính: gỡ head cũ khác user trên cùng mã khoa
	await client.execute({
		sql: `DELETE FROM exam_faculty_heads
		      WHERE faculty_code = ? AND user_id != ?`,
		args: [opts.facultyCode, opts.userId]
	})

	const ex = await client.execute({
		sql: 'SELECT id FROM exam_faculty_heads WHERE user_id = ? AND faculty_code = ?',
		args: [opts.userId, opts.facultyCode]
	})
	if (ex.rows.length) {
		await client.execute({
			sql: `UPDATE exam_faculty_heads
			      SET username = ?, display_name = ?, faculty_name = ?, note = ?,
			          updated_at = datetime('now')
			      WHERE user_id = ? AND faculty_code = ?`,
			args: [
				opts.username,
				opts.displayName,
				opts.facultyName,
				opts.note,
				opts.userId,
				opts.facultyCode
			]
		})
		console.log(`  ↻ faculty_head ${opts.facultyCode}`)
		return
	}
	await client.execute({
		sql: `INSERT INTO exam_faculty_heads
		      (faculty_code, faculty_name, user_id, username, display_name, note)
		      VALUES (?, ?, ?, ?, ?, ?)`,
		args: [
			opts.facultyCode,
			opts.facultyName,
			opts.userId,
			opts.username,
			opts.displayName,
			opts.note
		]
	})
	console.log(`  + faculty_head ${opts.facultyCode}`)
}

async function main() {
	const client = createClient({
		url: DB.startsWith('file:') ? DB : `file:${path.resolve(DB)}`
	})

	await ensureFacultyHeadsTable(client)

	console.log('=== Role exam_dept_head (CNK / khoa) + quyền exam ===')
	const deptRole = await ensureRole(
		client,
		'exam_dept_head',
		'Chủ nhiệm khoa (K1…K8) — duyệt đề bước 1 theo khoa; không rút đề'
	)
	// Chỉ quyền đúng đặc tả CNK (không exam-draw full)
	await client.execute({
		sql: `
		DELETE FROM role_permissions
		WHERE role_id = ?
		AND permission_id IN (SELECT id FROM permissions WHERE name LIKE 'exam%')`,
		args: [deptRole]
	})
	for (const perm of [
		'exams:create',
		'exams:read',
		'exams:update',
		'exam-bank:read'
	] as const) {
		await client.execute({
			sql: `
			INSERT INTO role_permissions (role_id, permission_id)
			SELECT ?, p.id FROM permissions p
			WHERE p.name = ?
			AND NOT EXISTS (
				SELECT 1 FROM role_permissions rp
				WHERE rp.role_id = ? AND rp.permission_id = p.id
			)`,
			args: [deptRole, perm, deptRole]
		})
	}
	// grantExamPerms không dùng cho CNK (quá rộng — có draw)

	// Lấy tên khoa chuẩn từ DMĐT nếu có
	const facFromDb = await client.execute(`
		SELECT code, name FROM exam_faculties
		WHERE code GLOB 'K[0-9]*'
		GROUP BY code
		ORDER BY code
	`)
	const nameByCode = new Map<string, string>()
	for (const r of facFromDb.rows) {
		nameByCode.set(String(r.code), String(r.name))
	}

	console.log('\n=== 8 Chủ nhiệm khoa (users + faculty_heads) ===')
	for (const fac of FACULTIES) {
		const facName = nameByCode.get(fac.code) || fac.name
		const displayName = `CNK — ${facName}`
		const userId = await upsertUser(client, {
			username: fac.username,
			password: PASSWORD,
			displayName,
			role: 'exam_dept_head'
		})
		// Ghi chú họ tên gợi ý (alias) nếu cột alias tồn tại
		try {
			await client.execute({
				sql: `UPDATE users SET alias = ? WHERE id = ?`,
				args: [fac.personName, userId]
			})
		} catch {
			/* alias optional */
		}
		await ensureFacultyHead(client, {
			userId,
			username: fac.username,
			displayName,
			facultyCode: fac.code,
			facultyName: facName,
			note: `CNK ${facName} (${fac.code}) — duyệt mọi ngành/môn thuộc khoa · ${fac.personName}`
		})
	}

	// Chỉ giữ 8 CNK theo khoa — gỡ head/user CNK theo ngành (a_tcysdk, a_cdysdk…)
	const keep = FACULTIES.map((f) => f.username)
	const allHeads = await client.execute(
		'SELECT id, username, faculty_code FROM exam_faculty_heads'
	)
	for (const h of allHeads.rows) {
		const un = String(h.username || '')
		if (un && !keep.includes(un)) {
			await client.execute({
				sql: 'DELETE FROM exam_faculty_heads WHERE id = ?',
				args: [h.id]
			})
			console.log(`  ⊘ gỡ head lạ: ${un} (${h.faculty_code})`)
		}
	}
	// Không dùng major_heads cho CNK (1 khoa = 1 TK, không tách TC/CD/LT)
	await client.execute('DELETE FROM exam_major_heads')
	console.log('  ⊘ đã xóa exam_major_heads (CNK theo khoa, không theo ngành)')

	console.log('\n========== 8 CNK TRONG DANH SÁCH NGƯỜI DÙNG ==========')
	console.log(`Mật khẩu chung: ${PASSWORD}`)
	console.log('')
	const list = await client.execute(`
		SELECT u.username, u.displayName, u.status, r.name AS role,
		       fh.faculty_code, fh.faculty_name
		FROM users u
		JOIN exam_faculty_heads fh ON fh.user_id = u.id
		LEFT JOIN user_roles ur ON ur.user_id = u.id
		LEFT JOIN roles r ON r.id = ur.role_id
		ORDER BY fh.faculty_code
	`)
	for (const r of list.rows) {
		console.log(
			`  ${String(r.username).padEnd(12)} ${String(r.displayName).padEnd(48)} ${r.faculty_code} · ${r.role || '—'}`
		)
	}
	console.log('======================================================')
	console.log(`Tổng faculty_heads: ${list.rows.length} (cần = 8)`)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
