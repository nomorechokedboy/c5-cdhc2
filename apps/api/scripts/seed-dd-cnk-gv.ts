/**
 * Tạo 1 Chủ nhiệm khoa Điều dưỡng (theo KHOA K7, dùng chung mọi ngành)
 * + 1 Giảng viên Khoa Điều dưỡng.
 *
 * CNK gán exam_faculty_heads (1 bản ghi/khoa) — không cần 1 CNK/ngành.
 *
 *   cd apps/api && pnpm exec tsx scripts/seed-dd-cnk-gv.ts
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
const FAC_CODE = 'K7'
const FAC_NAME = 'Khoa Điều dưỡng'

/** Ngành thuộc khoa Điều dưỡng */
const NURSING_MAJOR_CODES = ['A_CDDD', 'A_LTDD', 'B_CDDD'] as const

const CNK = {
	username: 'cnk.dieuduong',
	displayName: 'CNK — Khoa Điều dưỡng',
	fullName: 'Nguyễn Thị Lan'
}

const GV = {
	username: 'gv.lethihuong',
	displayName: 'GV — Lê Thị Hương',
	fullName: 'Lê Thị Hương'
}

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

async function grantExamPerms(client: Client, roleId: number) {
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

async function grantLecturerExamPerms(client: Client, roleId: number) {
	await client.execute({
		sql: `
		DELETE FROM role_permissions
		WHERE role_id = ?
		AND permission_id IN (
			SELECT id FROM permissions
			WHERE name LIKE 'exam-draw:%' OR name LIKE 'exam-bank:%'
		)`,
		args: [roleId]
	})
	await client.execute({
		sql: `
		INSERT INTO role_permissions (role_id, permission_id)
		SELECT ?, p.id FROM permissions p
		WHERE p.name IN (
			'exams:create', 'exams:read', 'exams:update', 'exams:delete'
		)
		AND NOT EXISTS (
			SELECT 1 FROM role_permissions rp
			WHERE rp.role_id = ? AND rp.permission_id = p.id
		)`,
		args: [roleId, roleId]
	})
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
		console.log(`↻ ${u.username} — ${u.displayName}`)
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
	// Đảm bảo bảng tồn tại (migration 0039)
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
}

async function ensureAssignment(
	client: Client,
	opts: {
		userId: number
		username: string
		displayName: string
		subjectId: number
		note: string
		assignedByUserId: number
		assignedByUsername: string
		assignedByDisplayName: string
	}
) {
	const ex = await client.execute({
		sql: 'SELECT id FROM exam_teaching_assignments WHERE user_id = ? AND subject_id = ?',
		args: [opts.userId, opts.subjectId]
	})
	if (ex.rows.length) {
		await client.execute({
			sql: `UPDATE exam_teaching_assignments
			      SET username = ?, display_name = ?, note = ?,
			          assigned_by_user_id = ?, assigned_by_username = ?, assigned_by_display_name = ?
			      WHERE user_id = ? AND subject_id = ?`,
			args: [
				opts.username,
				opts.displayName,
				opts.note,
				opts.assignedByUserId,
				opts.assignedByUsername,
				opts.assignedByDisplayName,
				opts.userId,
				opts.subjectId
			]
		})
		return
	}
	await client.execute({
		sql: `INSERT INTO exam_teaching_assignments
		      (subject_id, user_id, username, display_name, note,
		       assigned_by_user_id, assigned_by_username, assigned_by_display_name)
		      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			opts.subjectId,
			opts.userId,
			opts.username,
			opts.displayName,
			opts.note,
			opts.assignedByUserId,
			opts.assignedByUsername,
			opts.assignedByDisplayName
		]
	})
}

async function ensureTeacherCatalog(
	client: Client,
	opts: {
		userId: number
		username: string
		displayName: string
		facultyCode: string
		facultyName: string
		note: string
		createdByUserId: number
		createdByUsername: string
		createdByDisplayName: string
	}
) {
	const ex = await client.execute({
		sql: 'SELECT id FROM exam_teachers WHERE user_id = ?',
		args: [opts.userId]
	})
	if (ex.rows.length) {
		await client.execute({
			sql: `UPDATE exam_teachers
			      SET username = ?, display_name = ?, faculty_code = ?, faculty_name = ?, note = ?,
			          created_by_user_id = ?, created_by_username = ?, created_by_display_name = ?
			      WHERE user_id = ?`,
			args: [
				opts.username,
				opts.displayName,
				opts.facultyCode,
				opts.facultyName,
				opts.note,
				opts.createdByUserId,
				opts.createdByUsername,
				opts.createdByDisplayName,
				opts.userId
			]
		})
		return
	}
	await client.execute({
		sql: `INSERT INTO exam_teachers
			(user_id, username, display_name, faculty_code, faculty_name, note,
			 created_by_user_id, created_by_username, created_by_display_name)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		args: [
			opts.userId,
			opts.username,
			opts.displayName,
			opts.facultyCode,
			opts.facultyName,
			opts.note,
			opts.createdByUserId,
			opts.createdByUsername,
			opts.createdByDisplayName
		]
	})
}

async function main() {
	const client = createClient({
		url: DB.startsWith('file:') ? DB : `file:${path.resolve(DB)}`
	})

	console.log('=== Roles + quyền exam ===')
	const nganhRole = await ensureRole(
		client,
		'user_nganh',
		'Chủ nhiệm khoa / User ngành — duyệt đề bước 1 theo ngành DMĐT'
	)
	const lectRole = await ensureRole(
		client,
		'exam_lecturer',
		'Giảng viên soạn đề theo phân công môn (DMĐT)'
	)
	await grantExamPerms(client, nganhRole)
	await grantLecturerExamPerms(client, lectRole)

	// Ngành Điều dưỡng
	const majors = await client.execute({
		sql: `SELECT id, code, name FROM exam_majors
		      WHERE code IN (${NURSING_MAJOR_CODES.map(() => '?').join(',')})
		      ORDER BY id`,
		args: [...NURSING_MAJOR_CODES]
	})
	if (!majors.rows.length) {
		console.error(
			'Không tìm thấy ngành Điều dưỡng (A_CDDD / A_LTDD / B_CDDD). Import DMĐT trước.'
		)
		process.exit(1)
	}
	console.log(`Ngành DD: ${majors.rows.map((m) => `${m.code}`).join(', ')}`)

	// Theo KHOA (K7), không lọc theo ngành — 1 GV dạy nhiều môn trong khoa
	const subjects = await client.execute({
		sql: `
		SELECT s.id, s.code, s.name, s.major_id, m.code AS major_code, m.name AS major_name
		FROM exam_subjects s
		JOIN exam_majors m ON m.id = s.major_id
		JOIN exam_faculties f ON f.id = s.faculty_id
		WHERE f.code = ?
		ORDER BY s.name, m.code
		`,
		args: [FAC_CODE]
	})
	if (!subjects.rows.length) {
		console.error(
			`Không có môn thuộc ${FAC_NAME} (${FAC_CODE}). Import DMĐT trước.`
		)
		process.exit(1)
	}
	const assignSubjects = subjects.rows
	console.log(
		`Môn gán GV theo khoa ${FAC_CODE} (${assignSubjects.length}): ${assignSubjects
			.map((s) => `${s.name} [${s.major_code}]`)
			.join('; ')}`
	)

	// ── CNK Khoa Điều dưỡng (1 tài khoản / khoa — mọi ngành) ──
	console.log('\n=== Chủ nhiệm khoa Điều dưỡng (theo KHOA) ===')
	const cnkId = await upsertUser(client, {
		username: CNK.username,
		password: PASSWORD,
		displayName: CNK.displayName,
		role: 'user_nganh'
	})
	await ensureFacultyHead(client, {
		userId: cnkId,
		username: CNK.username,
		displayName: CNK.displayName,
		facultyCode: FAC_CODE,
		facultyName: FAC_NAME,
		note: `CNK ${FAC_NAME} — 1 TK duyệt mọi ngành/môn thuộc khoa`
	})
	console.log(`  → faculty_head: ${FAC_CODE} ${FAC_NAME} (mọi ngành)`)

	// ── GV Khoa Điều dưỡng ──
	console.log('\n=== Giảng viên Khoa Điều dưỡng ===')
	const gvId = await upsertUser(client, {
		username: GV.username,
		password: PASSWORD,
		displayName: GV.displayName,
		role: 'exam_lecturer'
	})
	await ensureTeacherCatalog(client, {
		userId: gvId,
		username: GV.username,
		displayName: GV.displayName,
		facultyCode: FAC_CODE,
		facultyName: FAC_NAME,
		note: `GV ${FAC_NAME} — ${GV.fullName}`,
		createdByUserId: cnkId,
		createdByUsername: CNK.username,
		createdByDisplayName: CNK.displayName
	})
	console.log(`  → catalog: ${FAC_CODE} ${FAC_NAME}`)

	// Xóa phân công cũ của GV này rồi gán lại (tránh còn 3 môn trùng tên)
	await client.execute({
		sql: 'DELETE FROM exam_teaching_assignments WHERE user_id = ?',
		args: [gvId]
	})

	for (const s of assignSubjects) {
		await ensureAssignment(client, {
			userId: gvId,
			username: GV.username,
			displayName: GV.displayName,
			subjectId: s.id as number,
			note: `${GV.fullName} · ${s.name} (${s.major_code})`,
			assignedByUserId: cnkId,
			assignedByUsername: CNK.username,
			assignedByDisplayName: CNK.displayName
		})
		console.log(`  → phân công: [${s.major_code}] ${s.name}`)
	}

	console.log('\n========== TÀI KHOẢN KHOA ĐIỀU DƯỠNG ==========')
	console.log(`CNK:  ${CNK.username.padEnd(18)} ${CNK.displayName}`)
	console.log(`       Mật khẩu: ${PASSWORD}`)
	console.log(`       Phụ trách KHOA: ${FAC_CODE} — ${FAC_NAME}`)
	console.log(
		`       (mọi ngành có môn thuộc khoa: ${majors.rows.map((m) => m.code).join(', ')}…)`
	)
	console.log(`       → 1 TK duyệt bước 1 cho cả khoa (user_nganh)`)
	console.log('')
	console.log(`GV:   ${GV.username.padEnd(18)} ${GV.displayName}`)
	console.log(`       Mật khẩu: ${PASSWORD}`)
	console.log(`       Khoa: ${FAC_CODE} — ${FAC_NAME}`)
	console.log(`       Môn: ${assignSubjects.map((s) => s.name).join(', ')}`)
	console.log(`       → Đăng nhập «Đề của tôi» → import đề`)
	console.log('================================================')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
