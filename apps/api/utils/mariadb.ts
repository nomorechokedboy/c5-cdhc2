import { createPool, type Pool } from 'mysql2/promise'

export type MariaDbConfig = {
	host: string
	port: number
	user: string
	password: string
	database?: string
	connectTimeout: number
}

export function getMariaDbConfig(
	env: NodeJS.ProcessEnv = process.env
): MariaDbConfig {
	return {
		host: env.MARIADB_HOST || 'localhost',
		port: Number(env.MARIADB_PORT || 3306),
		user: env.MARIADB_USER || 'root',
		password: env.MARIADB_PASSWORD || '',
		database: env.MARIADB_DATABASE?.trim() || undefined,
		connectTimeout: Number(env.MARIADB_CONNECT_TIMEOUT || 10000)
	}
}

export async function withMariaDb<T>(
	fn: (pool: Pool) => Promise<T>,
	env: NodeJS.ProcessEnv = process.env
): Promise<T> {
	const config = getMariaDbConfig(env)
	const pool = createPool({
		host: config.host,
		port: config.port,
		user: config.user,
		password: config.password,
		...(config.database ? { database: config.database } : {}),
		connectTimeout: config.connectTimeout
	})

	try {
		return await fn(pool)
	} finally {
		await pool.end()
	}
}

export async function testMariaDbConnection(
	env: NodeJS.ProcessEnv = process.env
) {
	return withMariaDb(async (pool) => {
		const [rows] = await pool.query('SELECT VERSION() as version')
		return rows
	}, env)
}
