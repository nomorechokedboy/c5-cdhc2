/**
 * Tạo role + tài khoản chỉ dùng «Phòng dạy của tôi»:
 * - Xem học viên (lớp gắn phòng)
 * - Xem thiết bị phòng
 * - Báo hỏng → admin phân công sửa
 *
 *   cd apps/api && pnpm exec tsx scripts/seed-room-teacher.ts
 */
import { createClient } from '@libsql/client'
import argon2 from 'argon2'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('./.env') })

const DB = process.env.DATABASE_URI?.replace(/^file:/, '') || './local.db'
const HASH_SECRET = process.env.HASH_SECRET

if (!HASH_SECRET) {
	console.error('Thiếu HASH_SECRET trong .env')
	process.exit(1)
}

const ROLE_NAME = 'room_teacher'
const ROLE_DESC =
	'Quản lý phòng dạy — xem HV, xem thiết bị, báo hỏng (không phân công / không quản trị)'

/** Chỉ các quyền cần cho /phong-day (+ sửa tên TB → nhật ký SC) */
const PERM_NAMES = [
	'students:read',
	'classes:read',
	'units:read',
	'buildings:read',
	'floors:read',
	'rooms:read',
	'room-assets:read',
	'room-assets:update',
	'repair-logs:create',
	'repair-logs:read',
	'repair-requests:read',
	'repair-requests:create'
]

const USER = {
	username: 'phongday',
	password: 'User@123',
	displayName: 'Cán bộ phòng dạy',
	unitAlias: 'D1'
}

async function main() {
	const client = createClient({
		url: DB.startsWith('file:') ? DB : `file:${path.resolve(DB)}`
	})
	console.log('DB:', path.resolve(DB))

	// 1) Role
	let roleId: number
	const roleRow = await client.execute({
		sql: 'SELECT id FROM roles WHERE name = ?',
		args: [ROLE_NAME]
	})
	if (roleRow.rows.length) {
		roleId = Number(roleRow.rows[0].id)
		await client.execute({
			sql: 'UPDATE roles SET description = ? WHERE id = ?',
			args: [ROLE_DESC, roleId]
		})
		console.log('↻ role', ROLE_NAME, roleId)
	} else {
		const ins = await client.execute({
			sql: 'INSERT INTO roles (name, description) VALUES (?, ?)',
			args: [ROLE_NAME, ROLE_DESC]
		})
		roleId = Number(ins.lastInsertRowid)
		console.log('+ role', ROLE_NAME, roleId)
	}

	// 2) Permissions
	await client.execute({
		sql: 'DELETE FROM role_permissions WHERE role_id = ?',
		args: [roleId]
	})
	for (const pname of PERM_NAMES) {
		const p = await client.execute({
			sql: 'SELECT id FROM permissions WHERE name = ?',
			args: [pname]
		})
		if (!p.rows.length) {
			console.warn('  ! missing permission', pname)
			continue
		}
		await client.execute({
			sql: 'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
			args: [roleId, Number(p.rows[0].id)]
		})
		console.log('  + perm', pname)
	}

	// 3) Unit
	let unitId: number | null = null
	const u = await client.execute({
		sql: 'SELECT id FROM units WHERE alias = ? LIMIT 1',
		args: [USER.unitAlias]
	})
	if (u.rows.length) unitId = Number(u.rows[0].id)

	// 4) User
	const hashed = await argon2.hash(USER.password, {
		secret: Buffer.from(HASH_SECRET!)
	})
	const existing = await client.execute({
		sql: 'SELECT id FROM users WHERE username = ?',
		args: [USER.username]
	})
	let userId: number
	if (existing.rows.length) {
		userId = Number(existing.rows[0].id)
		await client.execute({
			sql: `UPDATE users SET password = ?, displayName = ?, isSuperUser = 0, status = 'approved', unitId = ? WHERE id = ?`,
			args: [hashed, USER.displayName, unitId, userId]
		})
		console.log('↻ user', USER.username, userId)
	} else {
		await client.execute({
			sql: `INSERT INTO users (username, password, displayName, isSuperUser, status, unitId)
            VALUES (?, ?, ?, 0, 'approved', ?)`,
			args: [USER.username, hashed, USER.displayName, unitId]
		})
		const row = await client.execute({
			sql: 'SELECT id FROM users WHERE username = ?',
			args: [USER.username]
		})
		userId = Number(row.rows[0].id)
		console.log('+ user', USER.username, userId)
	}

	await client.execute({
		sql: 'DELETE FROM user_roles WHERE user_id = ?',
		args: [userId]
	})
	await client.execute({
		sql: 'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
		args: [userId, roleId]
	})

	await client.execute({
		sql: `UPDATE rooms SET class_id = (
      SELECT id FROM classes ORDER BY id LIMIT 1
    ) WHERE room_code = 'A-101' AND class_id IS NULL`
	})

	client.close()

	console.log(`
╔════════════════════════════════════════════════════════════╗
║  TÀI KHOẢN CHỈ «PHÒNG DẠY CỦA TÔI»                         ║
╠════════════════╦══════════════╦════════════════════════════╣
║ Username       ║ Password     ║ Vai trò                    ║
╠════════════════╬══════════════╬════════════════════════════╣
║ phongday       ║ User@123     ║ room_teacher               ║
╚════════════════╩══════════════╩════════════════════════════╝

Quyền: xem HV · xem thiết bị · báo hỏng
Không: phân công SC · import HV · quản trị · CRUD vật tư

Login → «Phòng dạy của tôi» → chọn phòng A-101
`)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
