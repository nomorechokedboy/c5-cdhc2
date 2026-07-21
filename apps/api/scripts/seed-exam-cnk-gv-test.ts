/**
 * Seed tài khoản theo DANH MỤC ĐÀO TẠO thật (exam_systems / majors / faculties / subjects):
 *
 * - CNK (user_nganh): 1 tài khoản / ngành đào tạo (8 ngành A_* / B_*)
 * - GV (exam_lecturer): 1 tài khoản / khoa K1…K8, phân công môn thuộc khoa đó
 * - Cập nhật displayName + role trong bảng users (danh sách người dùng)
 * - Xóa phân công demo cũ (CNTT/LLCT/KT) rồi gán lại theo DMĐT
 *
 * GV import đề: API + UI chỉ cho môn đã phân công → Hệ/Ngành/Khoa/Môn cố định.
 *
 *   cd apps/api && pnpm exec tsx scripts/seed-exam-cnk-gv-test.ts
 *   # hoặc: pnpm seed:exam-test
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
	// 1 role chính cho tài khoản test (ghi đè role cũ)
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

async function ensureMajorHead(
	client: Client,
	opts: {
		userId: number
		username: string
		displayName: string
		majorId: number
		note: string
	}
) {
	const ex = await client.execute({
		sql: 'SELECT id FROM exam_major_heads WHERE user_id = ? AND major_id = ?',
		args: [opts.userId, opts.majorId]
	})
	if (ex.rows.length) {
		await client.execute({
			sql: `UPDATE exam_major_heads SET username = ?, display_name = ?, note = ?, updated_at = datetime('now')
			      WHERE user_id = ? AND major_id = ?`,
			args: [
				opts.username,
				opts.displayName,
				opts.note,
				opts.userId,
				opts.majorId
			]
		})
		return
	}
	await client.execute({
		sql: `INSERT INTO exam_major_heads (major_id, user_id, username, display_name, note)
		      VALUES (?, ?, ?, ?, ?)`,
		args: [
			opts.majorId,
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

/** username CNK ổn định từ mã ngành: A_CDYSDK → cnk.a_cdysdk */
function cnkUsernameFromMajorCode(code: string) {
	return `cnk.${code.toLowerCase()}`
}

async function main() {
	const client = createClient({
		url: DB.startsWith('file:') ? DB : `file:${path.resolve(DB)}`
	})

	console.log('=== 1) Roles + quyền exam ===')
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
	const officeRole = await ensureRole(
		client,
		'exam_office',
		'Ban Khảo thí — Trưởng phòng Đào tạo'
	)
	await grantExamPerms(client, nganhRole)
	await grantLecturerExamPerms(client, lectRole)
	await grantExamPerms(client, officeRole)

	// Chỉ ngành trong DMĐT chính (bỏ CNTT/LLCT/KT demo nếu còn)
	const majors = await client.execute(`
		SELECT m.id, m.code, m.name, m.system_id, sys.code AS system_code, sys.name AS system_name
		FROM exam_majors m
		JOIN exam_systems sys ON sys.id = m.system_id
		WHERE m.code LIKE 'A_%' OR m.code LIKE 'B_%'
		ORDER BY m.id
	`)
	if (!majors.rows.length) {
		console.error(
			'Không có ngành DMĐT (A_*/B_*). Hãy import danh mục trước.'
		)
		process.exit(1)
	}

	// Khoa duy nhất K1…K8
	const faculties = await client.execute(`
		SELECT code, name FROM exam_faculties
		WHERE code GLOB 'K[0-9]*'
		GROUP BY code
		ORDER BY code
	`)

	console.log(
		`\n=== 2) DMĐT: ${majors.rows.length} ngành · ${faculties.rows.length} khoa ===`
	)

	// Reset phân công / CNK cũ (chỉ seed test — không xóa đề)
	console.log(
		'\n=== 3) Làm sạch major_heads + teaching_assignments (seed lại) ==='
	)
	await client.execute('DELETE FROM exam_teaching_assignments')
	await client.execute('DELETE FROM exam_major_heads')

	console.log('\n=== 4) CNK theo ngành đào tạo (danh sách users) ===')
	const cnkByMajorId = new Map<
		number,
		{ userId: number; username: string; displayName: string }
	>()

	for (const m of majors.rows) {
		const majorId = m.id as number
		const code = String(m.code)
		const name = String(m.name)
		const sysName = String(m.system_name || m.system_code || '')
		const username = cnkUsernameFromMajorCode(code)
		// Chỉ tên ngành (+ hệ nếu cần phân biệt) — không hiện mã
		const displayName = sysName
			? `CNK — ${name} · ${sysName}`
			: `CNK — ${name}`
		const userId = await upsertUser(client, {
			username,
			password: 'User@123',
			displayName,
			role: 'user_nganh'
		})
		await ensureMajorHead(client, {
			userId,
			username,
			displayName,
			majorId,
			note: `CNK phụ trách ngành ${code} — DMĐT`
		})
		cnkByMajorId.set(majorId, { userId, username, displayName })
		console.log(`  → ${username} phụ trách ngành ${code}`)
	}

	// Cập nhật alias CNK cũ (user.cntt, cnk.cntt…) — gán 1 ngành chính để vẫn dùng được
	console.log('\n=== 5) Cập nhật tài khoản CNK cũ trong danh sách users ===')
	const primaryMajor = majors.rows.find((r) => String(r.code) === 'A_CDYSDK')
	const primaryMajorId =
		(primaryMajor?.id as number) || (majors.rows[0]!.id as number)
	const primaryCnk = cnkByMajorId.get(primaryMajorId)!

	const legacyCnk: Array<{ username: string; displayName: string }> = [
		{
			username: 'user.cntt',
			displayName: `CNK — ${primaryMajor?.name || 'Y sĩ đa khoa (cao đẳng)'}`
		},
		{
			username: 'cnk.cntt',
			displayName: `CNK — ${primaryMajor?.name || 'Y sĩ đa khoa (cao đẳng)'}`
		},
		{
			username: 'cnk.llct',
			displayName: 'CNK — Khoa học xã hội và nhân văn'
		},
		{
			username: 'cnk.kt',
			displayName: 'CNK — Kế toán'
		},
		{
			username: 'KHQS.cdhc2',
			displayName: 'CNK — Ban Khoa học Quân sự'
		},
		{
			username: 'BKT.cdhc2',
			displayName: 'CNK — Ban Kỹ thuật'
		},
		{
			username: 'tt.cdhc2',
			displayName: 'CNK — Thông tin'
		},
		{
			username: 'gddt.cdhc2',
			displayName: 'CNK — Giáo dục Đào tạo'
		}
	]
	for (const u of legacyCnk) {
		const exists = await client.execute({
			sql: 'SELECT id FROM users WHERE username = ?',
			args: [u.username]
		})
		if (!exists.rows.length) continue
		const uid = await upsertUser(client, {
			username: u.username,
			password: 'User@123',
			displayName: u.displayName,
			role: 'user_nganh'
		})
		// alias chính: gán ngành A_CDYSDK
		if (u.username === 'user.cntt' || u.username === 'cnk.cntt') {
			await ensureMajorHead(client, {
				userId: uid,
				username: u.username,
				displayName: u.displayName,
				majorId: primaryMajorId,
				note: `Alias CNK → ngành ${primaryMajor?.code || primaryMajorId}`
			})
		}
	}

	console.log(
		'\n=== 6) GV: mỗi người 1 TK (username theo họ tên), nhiều GV / khoa ==='
	)
	/**
	 * Username = gv.<slug họ tên> — KHÔNG dùng gv.k1 (1 khoa có nhiều GV).
	 * displayName = «GV — Họ và tên» — hiện trong danh sách người dùng.
	 */
	function slugName(fullName: string): string {
		return fullName
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '')
			.replace(/đ/g, 'd')
			.replace(/Đ/g, 'd')
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '')
	}

	/** Nhiều giáo viên mỗi khoa (demo) */
	const teachersByFaculty: Record<string, Array<{ fullName: string }>> = {
		K1: [
			{ fullName: 'Nguyễn Văn An' },
			{ fullName: 'Trần Quốc Bảo' },
			{ fullName: 'Lê Minh Đức' }
		],
		K2: [
			{ fullName: 'Trần Thị Bình' },
			{ fullName: 'Phạm Thị Hoa' },
			{ fullName: 'Nguyễn Văn Khoa' }
		],
		K3: [
			{ fullName: 'Lê Minh Cường' },
			{ fullName: 'Hoàng Thị Mai' },
			{ fullName: 'Võ Thành Nam' }
		],
		K4: [
			{ fullName: 'Phạm Thu Dung' },
			{ fullName: 'Ngô Văn Giải' },
			{ fullName: 'Đỗ Thị Hạnh' }
		],
		K5: [
			{ fullName: 'Hoàng Văn Em' },
			{ fullName: 'Bùi Thị Ngọc' },
			{ fullName: 'Trịnh Văn Phong' }
		],
		K6: [{ fullName: 'Vũ Thị Phương' }, { fullName: 'Lương Văn Quang' }],
		K7: [
			{ fullName: 'Đặng Quốc Hùng' },
			{ fullName: 'Mai Thị Loan' },
			{ fullName: 'Phan Văn Sơn' }
		],
		K8: [
			{ fullName: 'Bùi Thị Lan' },
			{ fullName: 'Cao Minh Tú' },
			{ fullName: 'Đinh Thị Uyên' }
		]
	}

	type GvAcc = {
		username: string
		displayName: string
		fullName: string
		facCode: string
		subjects: Array<{
			id: number
			code: string
			name: string
			majorId: number
			majorCode: string
		}>
	}
	const gvAccounts: GvAcc[] = []

	for (const f of faculties.rows) {
		const facCode = String(f.code)
		const facName = String(f.name)
		const people = teachersByFaculty[facCode]
		if (!people?.length) continue

		// Môn thuộc khoa — chia cho các GV (mỗi người 1–2 môn)
		const subjRows = await client.execute({
			sql: `
			SELECT s.id, s.code, s.name, s.major_id, m.code AS major_code
			FROM exam_subjects s
			JOIN exam_faculties fac ON fac.id = s.faculty_id
			JOIN exam_majors m ON m.id = s.major_id
			WHERE fac.code = ?
			ORDER BY
				CASE m.code
					WHEN 'A_CDYSDK' THEN 0
					WHEN 'A_CDDD' THEN 1
					WHEN 'B_CDYSDK' THEN 2
					WHEN 'B_CDDUOC' THEN 3
					ELSE 9
				END,
				s.id
			LIMIT 12
			`,
			args: [facCode]
		})
		if (!subjRows.rows.length) {
			console.warn(`  ! Khoa ${facCode} không có môn — bỏ qua GV`)
			continue
		}

		const allSubj = subjRows.rows.map((s) => ({
			id: s.id as number,
			code: String(s.code),
			name: String(s.name),
			majorId: s.major_id as number,
			majorCode: String(s.major_code)
		}))

		people.forEach((p, idx) => {
			const username = `gv.${slugName(p.fullName)}`
			const displayName = `GV — ${p.fullName}`
			// Mỗi GV 1–2 môn (xoay vòng theo index)
			const subjects = allSubj.filter((_, i) => i % people.length === idx)
			// Ít nhất 1 môn
			const assigned =
				subjects.length > 0
					? subjects.slice(0, 2)
					: [allSubj[idx % allSubj.length]!]

			gvAccounts.push({
				username,
				displayName,
				fullName: p.fullName,
				facCode,
				subjects: assigned
			})
			console.log(
				`  · ${username} = ${displayName} (${facName}) · ${assigned.map((s) => s.name).join(', ')}`
			)
		})
	}

	// Bảng danh mục GV (mỗi user 1 dòng — không trùng)
	await client.execute(`
		CREATE TABLE IF NOT EXISTS exam_teachers (
			id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			createdAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
			updatedAt text DEFAULT CURRENT_TIMESTAMP NOT NULL,
			user_id integer NOT NULL,
			username text,
			display_name text,
			faculty_code text NOT NULL,
			faculty_name text,
			note text,
			created_by_user_id integer,
			created_by_username text,
			created_by_display_name text
		)
	`)
	await client.execute(
		`CREATE UNIQUE INDEX IF NOT EXISTS exam_teachers_user_uq ON exam_teachers (user_id)`
	)

	// Gỡ tài khoản seed kiểu gv.k1 / alias cũ khỏi danh mục + phân công (giữ user nếu cần)
	console.log('\n=== 6a) Gỡ username cũ gv.k* / alias (không còn dùng) ===')
	const obsoleteUsers = await client.execute(`
		SELECT id, username FROM users
		WHERE username GLOB 'gv.k[0-9]*'
		   OR username IN ('gv.cntt','gv.b','gv.llct','gv.ctdl','gv.giaiphau')
	`)
	for (const row of obsoleteUsers.rows) {
		const uid = row.id as number
		const un = String(row.username)
		await client.execute({
			sql: 'DELETE FROM exam_teachers WHERE user_id = ?',
			args: [uid]
		})
		await client.execute({
			sql: 'DELETE FROM exam_teaching_assignments WHERE user_id = ?',
			args: [uid]
		})
		// Đổi username legacy → _old_… để không lẫn danh sách; giữ DB history
		const newUn = `_old_${un.replace(/\./g, '_')}`
		const clash = await client.execute({
			sql: 'SELECT id FROM users WHERE username = ?',
			args: [newUn]
		})
		if (!clash.rows.length) {
			await client.execute({
				sql: `UPDATE users SET username = ?, displayName = ?, status = 'rejected'
				      WHERE id = ?`,
				args: [newUn, `[cũ] ${un}`, uid]
			})
			// gỡ role để không hiện trong ListExamTeachers fallback
			await client.execute({
				sql: `DELETE FROM user_roles WHERE user_id = ? AND role_id IN (
					SELECT id FROM roles WHERE name = 'exam_lecturer'
				)`,
				args: [uid]
			})
			console.log(`  ⊘ ${un} → ${newUn} (ngừng dùng)`)
		} else {
			console.log(`  ⊘ ${un} (đã xử lý)`)
		}
	}

	console.log('\n=== 6b) Tạo TK + danh mục GV (username theo họ tên) ===')
	await client.execute('DELETE FROM exam_teachers')
	// Xóa phân công seed cũ (user mới sẽ gán lại)
	await client.execute(`
		DELETE FROM exam_teaching_assignments
		WHERE username LIKE 'gv.%' OR username LIKE '_old_%'
	`)

	for (const acc of gvAccounts) {
		const userId = await upsertUser(client, {
			username: acc.username,
			password: 'User@123',
			displayName: acc.displayName,
			role: 'exam_lecturer'
		})

		const facNameRow = await client.execute({
			sql: 'SELECT name FROM exam_faculties WHERE code = ? LIMIT 1',
			args: [acc.facCode]
		})
		const facName = (facNameRow.rows[0]?.name as string) || acc.facCode

		const cnkForCat = primaryCnk
		await client.execute({
			sql: `INSERT INTO exam_teachers
				(user_id, username, display_name, faculty_code, faculty_name, note,
				 created_by_user_id, created_by_username, created_by_display_name)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
				userId,
				acc.username,
				acc.displayName,
				acc.facCode,
				facName,
				`GV khoa ${facName}`,
				cnkForCat.userId,
				cnkForCat.username,
				cnkForCat.displayName
			]
		})
		console.log(
			`  ✓ user+catalog ${acc.username} — ${acc.fullName} · ${facName}`
		)

		for (const subj of acc.subjects) {
			const cnk = cnkByMajorId.get(subj.majorId) || primaryCnk
			await ensureAssignment(client, {
				userId,
				username: acc.username,
				displayName: acc.displayName,
				subjectId: subj.id,
				note: `${acc.fullName} · ${subj.name}`,
				assignedByUserId: cnk.userId,
				assignedByUsername: cnk.username,
				assignedByDisplayName: cnk.displayName
			})
		}
	}

	console.log('\n=== 8) Ban Khảo thí ===')
	await upsertUser(client, {
		username: 'tpdt.cdhc2',
		password: 'Admin@123',
		displayName: 'Trưởng phòng Đào tạo — Ban Khảo thí',
		role: 'exam_office'
	})
	await upsertUser(client, {
		username: 'khao.thi',
		password: 'Admin@123',
		displayName: 'Ban Khảo thí (TP Đào tạo)',
		role: 'exam_office'
	})

	// Thống kê
	const nHeads = await client.execute(
		'SELECT COUNT(*) AS n FROM exam_major_heads'
	)
	const nAssign = await client.execute(
		'SELECT COUNT(*) AS n FROM exam_teaching_assignments'
	)

	console.log('\n========== TÀI KHOẢN TEST (DMĐT) ==========')
	console.log(`CNK (major_heads): ${nHeads.rows[0]!.n}`)
	console.log(`Phân công GV–môn:  ${nAssign.rows[0]!.n}`)
	console.log('')
	console.log('── Chủ nhiệm khoa (1 ngành DMĐT) · User@123 ──')
	for (const m of majors.rows) {
		const u = cnkUsernameFromMajorCode(String(m.code))
		console.log(
			`  ${u.padEnd(22)} ${m.code} — ${m.name} (${m.system_name})`
		)
	}
	console.log('')
	console.log('── Giảng viên (mỗi người 1 TK theo họ tên) · User@123 ──')
	const byFac = new Map<string, GvAcc[]>()
	for (const a of gvAccounts) {
		const list = byFac.get(a.facCode) || []
		list.push(a)
		byFac.set(a.facCode, list)
	}
	for (const [fac, list] of byFac) {
		console.log(`  [${fac}] ${list.length} GV:`)
		for (const a of list) {
			console.log(
				`    ${a.username.padEnd(22)} ${a.fullName} · ${a.subjects.map((s) => s.name).join(', ')}`
			)
		}
	}
	console.log('')
	console.log('── Kiểm thử ──')
	console.log(
		'1. Login cnk.a_cdysdk → /de-thi/giao-vien (danh mục nhiều GV/khoa)'
	)
	console.log(
		'2. Login gv.phamthudung / User@123 → đề của tôi (Khoa Y học cơ sở)'
	)
	console.log('3. Login gv.ngovangiai / User@123 → GV khác cùng khoa K4')
	console.log(
		'4. Danh sách người dùng: displayName = «GV — Họ tên», username = gv.<slug>'
	)
	console.log('Mật khẩu CNK/GV: User@123')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
