/**
 * Đồng bộ tài khoản:
 * 1) rooms.managerCode → users (pending nếu chưa có, mật khẩu mặc định 123456)
 * 2) exam_teachers / exam_faculty_heads / exam_teaching_assignments ← username/tên từ users
 *
 *   cd apps/api && pnpm exec tsx scripts/sync-accounts.ts
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

async function main() {
	const client = createClient({ url: `file:${DB}` })
	console.log('DB:', DB)

	// 1) Room accounts → users
	const rooms = await client.execute(
		`SELECT id, manager_code, manager, room_name, room_code
     FROM rooms
     WHERE manager_code IS NOT NULL AND trim(manager_code) != ''`
	)
	let roomUsersCreated = 0
	let roomUsersExisting = 0
	for (const r of rooms.rows) {
		const code = String(r.manager_code || '').trim()
		if (!code) continue
		const ex = await client.execute({
			sql: 'SELECT id, status FROM users WHERE username = ?',
			args: [code]
		})
		if (ex.rows.length) {
			roomUsersExisting++
			// Chưa có role → pending
			const uid = ex.rows[0]!.id as number
			const roles = await client.execute({
				sql: 'SELECT 1 FROM user_roles WHERE user_id = ? LIMIT 1',
				args: [uid]
			})
			if (!roles.rows.length) {
				await client.execute({
					sql: `UPDATE users SET status = 'pending', position = COALESCE(position, 'Tài khoản phòng') WHERE id = ?`,
					args: [uid]
				})
			}
			console.log(`  ↻ room user exists: ${code}`)
			continue
		}
		const pw = await hashPwd('123456')
		const displayName = String(r.manager || r.room_name || code)
		await client.execute({
			sql: `INSERT INTO users (username, password, displayName, isSuperUser, status, position)
            VALUES (?, ?, ?, 0, 'pending', 'Tài khoản phòng')`,
			args: [code, pw, displayName]
		})
		roomUsersCreated++
		console.log(
			`  + room user: ${code} — ${displayName} (pw 123456, pending)`
		)
	}

	// 2) Denorm from users
	const users = await client.execute(
		'SELECT id, username, displayName FROM users'
	)
	const byId = new Map(
		users.rows.map((u) => [
			u.id as number,
			{
				username: String(u.username || ''),
				displayName: String(u.displayName || '')
			}
		])
	)

	let teachersUpdated = 0
	const teachers = await client.execute(
		'SELECT id, user_id, username, display_name FROM exam_teachers'
	)
	for (const t of teachers.rows) {
		const u = byId.get(t.user_id as number)
		if (!u) continue
		if (u.username === t.username && u.displayName === t.display_name)
			continue
		await client.execute({
			sql: `UPDATE exam_teachers SET username = ?, display_name = ?, updatedAt = datetime('now') WHERE id = ?`,
			args: [u.username, u.displayName, t.id]
		})
		teachersUpdated++
	}

	let facultyHeadsUpdated = 0
	const heads = await client.execute(
		'SELECT id, user_id, username, display_name FROM exam_faculty_heads'
	)
	for (const h of heads.rows) {
		const u = byId.get(h.user_id as number)
		if (!u) continue
		if (u.username === h.username && u.displayName === h.display_name)
			continue
		await client.execute({
			sql: `UPDATE exam_faculty_heads SET username = ?, display_name = ?, updated_at = datetime('now') WHERE id = ?`,
			args: [u.username, u.displayName, h.id]
		})
		facultyHeadsUpdated++
	}

	let assignmentsUpdated = 0
	const assigns = await client.execute(
		'SELECT id, user_id, username, display_name FROM exam_teaching_assignments'
	)
	for (const a of assigns.rows) {
		const u = byId.get(a.user_id as number)
		if (!u) continue
		if (u.username === a.username && u.displayName === a.display_name)
			continue
		await client.execute({
			sql: `UPDATE exam_teaching_assignments SET username = ?, display_name = ?, updatedAt = datetime('now') WHERE id = ?`,
			args: [u.username, u.displayName, a.id]
		})
		assignmentsUpdated++
	}

	const miss = await client.execute(
		`SELECT r.manager_code FROM rooms r
     LEFT JOIN users u ON u.username = r.manager_code
     WHERE r.manager_code IS NOT NULL AND trim(r.manager_code) != '' AND u.id IS NULL`
	)

	console.log('\n=== Kết quả đồng bộ ===')
	console.log(
		JSON.stringify(
			{
				roomUsersCreated,
				roomUsersExisting,
				teachersUpdated,
				facultyHeadsUpdated,
				assignmentsUpdated,
				stillMissingRoomUsers: miss.rows.map((r) => r.manager_code)
			},
			null,
			2
		)
	)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
