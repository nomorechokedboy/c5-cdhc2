import { createClient } from '@libsql/client'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
config({ path: path.join(__dirname, '../.env') })
const client = createClient({
	url: process.env.DATABASE_URI?.startsWith('file:')
		? process.env.DATABASE_URI
		: `file:${process.env.DATABASE_URI || 'local.db'}`
})

async function main() {
	await client.execute({
		sql: 'DELETE FROM room_assets WHERE name = ?',
		args: ['Switch 24 port']
	})
	const room = (
		await client.execute(
			`SELECT id FROM rooms WHERE room_type NOT LIKE '%Kho%' LIMIT 1`
		)
	).rows[0].id as number
	const units = (
		await client.execute(
			`SELECT id FROM units WHERE level = 1 ORDER BY id LIMIT 3`
		)
	).rows
	// Cấp 2 = 3
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, code, name, category, quantity, unit, grade, status, holding_unit_id, install_address)
          VALUES (?, 'SW-G2', 'Switch 24 port', 'IT', 3, 'cái', 2, 'NORMAL', ?, 'Phòng máy')`,
		args: [room, units[0].id]
	})
	// Cấp 3 = 1
	await client.execute({
		sql: `INSERT INTO room_assets (room_id, code, name, category, quantity, unit, grade, status, holding_unit_id, install_address)
          VALUES (?, 'SW-G3', 'Switch 24 port', 'IT', 1, 'cái', 3, 'NORMAL', ?, 'Phòng máy')`,
		args: [room, units[1].id]
	})
	const r = await client.execute({
		sql: `SELECT grade, sum(quantity) as q FROM room_assets WHERE name = ? GROUP BY grade ORDER BY grade`,
		args: ['Switch 24 port']
	})
	console.log('Switch 24 port theo phân cấp:', r.rows)
	console.log(
		'assets qty>0',
		(
			await client.execute(
				`SELECT count(*) c FROM room_assets WHERE quantity > 0`
			)
		).rows
	)
}
main().catch((e) => {
	console.error(e)
	process.exit(1)
})
