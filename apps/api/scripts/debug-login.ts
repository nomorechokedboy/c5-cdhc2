import { createClient } from '@libsql/client'
import argon2 from 'argon2'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve('./.env') })

async function main() {
	const secret = process.env.HASH_SECRET
	console.log('HASH_SECRET set?', !!secret, 'len', secret?.length)

	const client = createClient({ url: 'file:./local.db' })
	const users = await client.execute(
		`SELECT id, username, displayName, isSuperUser, status, unitId FROM users`
	)
	console.log('all users:', users.rows)

	const target = 'phong.a101'
	const row = await client.execute({
		sql: 'SELECT id, username, password, status FROM users WHERE username = ?',
		args: [target]
	})
	if (!row.rows.length) {
		console.log('USER NOT FOUND:', target)
		client.close()
		return
	}
	const u = row.rows[0]!
	console.log('user', {
		id: u.id,
		username: u.username,
		status: u.status,
		hashPrefix: String(u.password).slice(0, 40)
	})

	const roles = await client.execute({
		sql: `SELECT r.name FROM user_roles ur
		      JOIN roles r ON r.id = ur.role_id
		      WHERE ur.user_id = ?`,
		args: [u.id]
	})
	console.log('roles:', roles.rows)

	if (secret) {
		const ok = await argon2.verify(String(u.password), 'User@123', {
			secret: Buffer.from(secret)
		})
		console.log('verify User@123 with .env HASH_SECRET:', ok)

		// try without secret
		try {
			const ok2 = await argon2.verify(String(u.password), 'User@123')
			console.log('verify without secret:', ok2)
		} catch (e) {
			console.log('verify without secret failed:', (e as Error).message)
		}
	}

	// permissions count
	const perms = await client.execute({
		sql: `SELECT COUNT(*) as c FROM role_permissions rp
		      JOIN user_roles ur ON ur.role_id = rp.role_id
		      WHERE ur.user_id = ?`,
		args: [u.id]
	})
	console.log('permission count via roles:', perms.rows[0])

	client.close()
}

main().catch(console.error)
