/**
 * Tạo / reset tài khoản test với mật khẩu rõ ràng.
 *
 * Cần HASH_SECRET trùng với lúc chạy API (file .env hoặc env shell).
 *
 *   cd apps/api
 *   pnpm exec tsx scripts/seed-test-users.ts
 */
import { createClient } from '@libsql/client'
import argon2 from 'argon2'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('./.env') })

const DB = process.env.DATABASE_URI?.replace(/^file:/, '') || './local.db'
const HASH_SECRET = process.env.HASH_SECRET

if (!HASH_SECRET) {
	console.error(`
❌ Thiếu HASH_SECRET.

Tạo file apps/api/.env (hoặc export biến môi trường), ví dụ:

  HASH_SECRET=dev-hash-secret-cdhc2
  JWT_PRIVATE_KEY=dev-jwt-private-key
  S3_ACCESS_KEY=minio
  S3_SECRET_KEY=minio123

Rồi chạy lại: pnpm exec tsx scripts/seed-test-users.ts

Lưu ý: HASH_SECRET phải GIỐNG lúc encore run, nếu không login sẽ fail.
`)
	process.exit(1)
}

type SeedUser = {
	username: string
	password: string
	displayName: string
	isSuperUser: boolean
	/** role name in roles table */
	role?: string
	note: string
}

const USERS: SeedUser[] = [
	{
		username: 'admin.cdhc2',
		password: 'Admin@123',
		displayName: 'Admin CDHC2',
		isSuperUser: true,
		role: 'super_admin',
		note: 'Super admin — full quyền (reset password)'
	},
	{
		username: 'bgh.cdhc2',
		password: 'Admin@123',
		displayName: 'Ban Giám Hiệu',
		isSuperUser: false,
		role: 'admin',
		note: 'BGH — phê duyệt đề xuất, nhận kết quả từ ngành'
	},
	{
		username: 'phong.a101',
		password: 'User@123',
		displayName: 'Trực ban phòng A-101',
		isSuperUser: false,
		role: 'company_commander',
		note: 'Cấp phòng — báo hỏng thiết bị'
	},
	{
		username: 'phong.a102',
		password: 'User@123',
		displayName: 'QL phòng máy A-102',
		isSuperUser: false,
		role: 'company_commander',
		note: 'Cấp phòng — báo hỏng'
	},
	{
		username: 'viewer',
		password: 'User@123',
		displayName: 'Người xem',
		isSuperUser: false,
		role: 'viewer',
		note: 'Chỉ xem (không báo hỏng / không phân công)'
	}
]

async function hashPwd(password: string) {
	return argon2.hash(password, {
		secret: Buffer.from(HASH_SECRET!)
	})
}

async function main() {
	const client = createClient({
		url: DB.startsWith('file:') ? DB : `file:${path.resolve(DB)}`
	})

	console.log(`DB: ${path.resolve(DB)}`)
	console.log(
		`HASH_SECRET: ${HASH_SECRET!.slice(0, 4)}… (${HASH_SECRET!.length} chars)\n`
	)

	for (const u of USERS) {
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
			console.log(`↻ updated  ${u.username}`)
		} else {
			const ins = await client.execute({
				sql: `INSERT INTO users (username, password, displayName, isSuperUser, status)
				      VALUES (?, ?, ?, ?, 'approved')`,
				args: [u.username, hashed, u.displayName, u.isSuperUser ? 1 : 0]
			})
			// get id
			const row = await client.execute({
				sql: 'SELECT id FROM users WHERE username = ?',
				args: [u.username]
			})
			userId = row.rows[0]!.id as number
			console.log(`+ created  ${u.username}`)
		}

		if (u.role) {
			const role = await client.execute({
				sql: 'SELECT id FROM roles WHERE name = ?',
				args: [u.role]
			})
			if (role.rows.length) {
				const roleId = role.rows[0]!.id as number
				await client.execute({
					sql: `DELETE FROM user_roles WHERE user_id = ?`,
					args: [userId]
				})
				await client.execute({
					sql: `INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`,
					args: [userId, roleId]
				})
			}
		}
	}

	client.close()

	console.log(`
╔══════════════════════════════════════════════════════════════╗
║              TÀI KHOẢN TEST — Quản lý vật tư                 ║
╠════════════════╦══════════════╦══════════════════════════════╣
║ Username       ║ Password     ║ Vai trò / ghi chú            ║
╠════════════════╬══════════════╬══════════════════════════════╣
║ admin.cdhc2    ║ Admin@123    ║ Super admin (full)           ║
║ bgh.cdhc2      ║ Admin@123    ║ BGH — phê duyệt đề xuất      ║
║ phong.a101     ║ User@123     ║ Cấp phòng — báo hỏng         ║
║ phong.a102     ║ User@123     ║ Cấp phòng — báo hỏng         ║
║ viewer         ║ User@123     ║ Chỉ xem                      ║
╚════════════════╩══════════════╩══════════════════════════════╝

Login web: http://localhost:3000/login

Gợi ý test:
  • phong.a101  → Hồ sơ phòng A-101 → Báo hỏng
  • bgh.cdhc2   → Đề xuất — phê duyệt / từ chối
  • admin.cdhc2 → full quyền
`)
}

main().catch((e) => {
	console.error(e)
	process.exit(1)
})
