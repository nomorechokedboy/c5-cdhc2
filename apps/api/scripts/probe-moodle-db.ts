import { createConnection } from 'mysql2/promise'

const tries = [
	{ user: 'moodleuser', password: 'Huyentho@7682', database: 'moodle' },
	{
		user: 'moodleuser',
		password: 'Huyentho@7682',
		database: undefined as string | undefined
	},
	{ user: 'moodle', password: 'moodle', database: 'moodle' },
	{ user: 'root', password: 'root', database: 'moodle' },
	{ user: 'root', password: '', database: 'moodle' }
]

async function main() {
	for (const t of tries) {
		try {
			const c = await createConnection({
				host: 'localhost',
				port: 3306,
				user: t.user,
				password: t.password,
				database: t.database,
				connectTimeout: 3000
			})
			const [v] = await c.query('SELECT VERSION() as v, DATABASE() as d')
			console.log('OK', t.user, t.database, v)
			const [dbs] = await c.query('SHOW DATABASES')
			console.log(
				'DBs',
				(dbs as { Database: string }[]).map((r) => r.Database)
			)
			try {
				const [cnt] = await c.query(
					'SELECT COUNT(*) as c FROM mdl_course'
				)
				console.log('mdl_course count', cnt)
				const [sample] = await c.query(
					'SELECT id, fullname, shortname FROM mdl_course WHERE id > 1 LIMIT 5'
				)
				console.log('sample courses', sample)
			} catch (e: unknown) {
				console.log(
					'mdl_course err',
					e instanceof Error ? e.message : e
				)
			}
			await c.end()
			return
		} catch (e: unknown) {
			const err = e as { code?: string; message?: string }
			console.log('FAIL', t.user, err.code || err.message)
		}
	}
	console.log('No working credentials found')
	process.exit(1)
}

main()
