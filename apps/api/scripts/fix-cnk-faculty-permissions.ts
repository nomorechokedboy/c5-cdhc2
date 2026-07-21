/**
 * Chỉnh quyền Chủ nhiệm khoa (K1…K8) theo đặc tả:
 *
 * CNK (exam_dept_head):
 *   ✓ exams:create/read/update  — soạn (vận hành) + duyệt bước 1
 *   ✓ exam-bank:read            — xem ngân hàng
 *   ✗ exam-draw:*               — chỉ Ban KT
 *   ✗ exam-bank:create/update/delete
 *   ✗ exams:delete              — không xóa hàng loạt đề
 *
 * user_nganh (VT ngành — nếu còn dùng):
 *   gỡ exam-draw + exam-bank ghi; giữ exams + bank:read
 *
 * 8 CNK cnk.k1…cnk.k8 → role exam_dept_head + faculty_heads
 *
 *   cd apps/api && pnpm exec tsx scripts/fix-cnk-faculty-permissions.ts
 */
import { createClient } from '@libsql/client'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('./.env') })

const DB = process.env.DATABASE_URI?.replace(/^file:/, '') || './local.db'
type Client = ReturnType<typeof createClient>

const CNK_USERNAMES = [
	'cnk.k1',
	'cnk.k2',
	'cnk.k3',
	'cnk.k4',
	'cnk.k5',
	'cnk.k6',
	'cnk.k7',
	'cnk.k8'
] as const

/** Quyền đề thi cho CNK / khoa */
const DEPT_HEAD_PERMS = [
	'exams:create',
	'exams:read',
	'exams:update',
	'exam-bank:read'
] as const

async function ensureRole(
	client: Client,
	name: string,
	description: string
): Promise<number> {
	const ex = await client.execute({
		sql: 'SELECT id FROM roles WHERE name = ?',
		args: [name]
	})
	if (ex.rows.length) {
		await client.execute({
			sql: 'UPDATE roles SET description = ? WHERE id = ?',
			args: [description, ex.rows[0]!.id]
		})
		return ex.rows[0]!.id as number
	}
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

async function setRolePermissionsExact(
	client: Client,
	roleId: number,
	permNames: readonly string[],
	/** Nếu true: xóa mọi exam* rồi gán lại; nếu false: chỉ gán các perm thiếu */
	replaceExamOnly: boolean
) {
	if (replaceExamOnly) {
		await client.execute({
			sql: `
			DELETE FROM role_permissions
			WHERE role_id = ?
			AND permission_id IN (
				SELECT id FROM permissions WHERE name LIKE 'exam%'
			)`,
			args: [roleId]
		})
	}
	for (const name of permNames) {
		const p = await client.execute({
			sql: 'SELECT id FROM permissions WHERE name = ?',
			args: [name]
		})
		if (!p.rows.length) {
			console.warn(`  ! thiếu permission ${name}`)
			continue
		}
		const pid = p.rows[0]!.id as number
		await client.execute({
			sql: `
			INSERT INTO role_permissions (role_id, permission_id)
			SELECT ?, ?
			WHERE NOT EXISTS (
				SELECT 1 FROM role_permissions
				WHERE role_id = ? AND permission_id = ?
			)`,
			args: [roleId, pid, roleId, pid]
		})
	}
}

async function stripUserNganhExamExcess(client: Client, nganhRoleId: number) {
	// user_nganh: bỏ rút đề + ghi ngân hàng; giữ soạn/duyệt + xem NH
	await client.execute({
		sql: `
		DELETE FROM role_permissions
		WHERE role_id = ?
		AND permission_id IN (
			SELECT id FROM permissions
			WHERE name LIKE 'exam-draw:%'
			   OR name IN (
					'exam-bank:create',
					'exam-bank:update',
					'exam-bank:delete'
			   )
		)`,
		args: [nganhRoleId]
	})
	// Đảm bảo còn exams + bank:read
	await setRolePermissionsExact(
		client,
		nganhRoleId,
		['exams:create', 'exams:read', 'exams:update', 'exam-bank:read'],
		false
	)
}

async function assignRole(client: Client, userId: number, roleId: number) {
	await client.execute({
		sql: 'DELETE FROM user_roles WHERE user_id = ?',
		args: [userId]
	})
	await client.execute({
		sql: 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
		args: [userId, roleId]
	})
}

async function main() {
	const client = createClient({
		url: DB.startsWith('file:') ? DB : `file:${path.resolve(DB)}`
	})

	console.log('=== 1) Role exam_dept_head (CNK / khoa) ===')
	const deptRoleId = await ensureRole(
		client,
		'exam_dept_head',
		'Chủ nhiệm khoa (K1…K8) — duyệt đề bước 1, phân công GV, xem NH; không rút đề'
	)
	await setRolePermissionsExact(client, deptRoleId, DEPT_HEAD_PERMS, true)
	console.log(`  perms: ${DEPT_HEAD_PERMS.join(', ')}`)

	console.log('\n=== 2) Siết exam* trên user_nganh (không rút đề) ===')
	const nganh = await client.execute({
		sql: "SELECT id FROM roles WHERE name = 'user_nganh'"
	})
	if (nganh.rows.length) {
		const nid = nganh.rows[0]!.id as number
		await stripUserNganhExamExcess(client, nid)
		await client.execute({
			sql: `UPDATE roles SET description = ? WHERE id = ?`,
			args: [
				'User ngành (VT) + hỗ trợ đề: soạn/đọc/cập nhật đề, xem NH — không rút đề',
				nid
			]
		})
		console.log('  user_nganh: đã gỡ exam-draw + exam-bank ghi')
	}

	console.log('\n=== 3) Gán 8 CNK → exam_dept_head ===')
	for (const un of CNK_USERNAMES) {
		const u = await client.execute({
			sql: 'SELECT id, displayName, status FROM users WHERE username = ?',
			args: [un]
		})
		if (!u.rows.length) {
			console.warn(`  ! chưa có user ${un} — chạy pnpm seed:cnk trước`)
			continue
		}
		const userId = u.rows[0]!.id as number
		await client.execute({
			sql: `UPDATE users SET status = 'approved', isSuperUser = 0 WHERE id = ?`,
			args: [userId]
		})
		await assignRole(client, userId, deptRoleId)
		console.log(
			`  ✓ ${un.padEnd(10)} → exam_dept_head · ${u.rows[0]!.displayName}`
		)
	}

	// Alias dieuduong: không gán role CNK chính (tránh trùng K7)
	const alias = await client.execute({
		sql: "SELECT id FROM users WHERE username = 'cnk.dieuduong'"
	})
	if (alias.rows.length) {
		const aid = alias.rows[0]!.id as number
		await client.execute({
			sql: 'DELETE FROM user_roles WHERE user_id = ?',
			args: [aid]
		})
		await client.execute({
			sql: `UPDATE users SET status = 'approved',
				displayName = 'CNK — Khoa Điều dưỡng (alias · dùng cnk.k7)' WHERE id = ?`,
			args: [aid]
		})
		console.log('  ⊘ cnk.dieuduong: bỏ role (dùng cnk.k7)')
	}

	console.log('\n=== 4) Kiểm tra quyền ===')
	const rows = await client.execute({
		sql: `
		SELECT u.username, r.name AS role,
		       (SELECT GROUP_CONCAT(p.name, ', ')
		        FROM role_permissions rp
		        JOIN permissions p ON p.id = rp.permission_id
		        WHERE rp.role_id = r.id AND p.name LIKE 'exam%'
		       ) AS exam_perms
		FROM users u
		JOIN user_roles ur ON ur.user_id = u.id
		JOIN roles r ON r.id = ur.role_id
		WHERE u.username IN (${CNK_USERNAMES.map(() => '?').join(',')})
		ORDER BY u.username
		`,
		args: [...CNK_USERNAMES]
	})
	for (const r of rows.rows) {
		console.log(
			`  ${String(r.username).padEnd(10)} ${String(r.role).padEnd(16)} ${r.exam_perms}`
		)
	}

	const nganhPerms = await client.execute(`
		SELECT p.name FROM role_permissions rp
		JOIN roles r ON r.id = rp.role_id
		JOIN permissions p ON p.id = rp.permission_id
		WHERE r.name = 'user_nganh' AND p.name LIKE 'exam%'
		ORDER BY p.name
	`)
	console.log(
		'\nuser_nganh exam*:',
		nganhPerms.rows.map((x) => x.name).join(', ') || '(none)'
	)

	console.log('\n========== TÓM TẮT QUYỀN KHOA (CNK) ==========')
	console.log('Role: exam_dept_head')
	console.log('  ✓ Soạn / đọc / cập nhật đề (exams:create|read|update)')
	console.log('  ✓ Duyệt bước 1 (PENDING_DEPT) — scope theo khoa K1…K8')
	console.log('  ✓ Xem ngân hàng đề (exam-bank:read)')
	console.log('  ✓ Phân công GV / danh mục GV (theo role UI CNK)')
	console.log('  ✗ Rút đề (exam-draw) — Ban KT')
	console.log('  ✗ Phê duyệt cuối + QR — BGH')
	console.log('  ✗ Ghi ngân hàng / xóa đề hàng loạt')
	console.log('================================================')
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
