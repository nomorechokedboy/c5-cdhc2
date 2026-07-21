import { createConnection } from 'mysql2/promise'

async function main() {
	const connection = await createConnection({
		host: process.env.MARIADB_HOST || 'localhost',
		port: Number(process.env.MARIADB_PORT || 3306),
		user: process.env.MARIADB_USER || 'root',
		password: process.env.MARIADB_PASSWORD || '',
		database: process.env.MARIADB_DATABASE || 'mysql'
	})

	const [rows] = await connection.query('SELECT VERSION() as version')
	console.log('MariaDB connected successfully:', rows)
	await connection.end()
}

main().catch((err) => {
	console.error('MariaDB connection failed:', err)
	process.exit(1)
})
