/**
 * MariaDB / Moodle — kết nối tùy chọn.
 * Cấu hình qua .env: MARIADB_HOST, MARIADB_PORT, MARIADB_USER, MARIADB_PASSWORD, MARIADB_DATABASE
 * MARIADB_SYNC_ENABLED=false để tắt.
 */
import dotenv from 'dotenv'
import { createPool, type Pool, type RowDataPacket } from 'mysql2/promise'
import log from 'encore.dev/log'
import path from 'path'
import { fileURLToPath } from 'url'

// Encore có thể không load .env vào process.env cho mọi worker — nạp tường minh
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '.env') })
dotenv.config() // cwd fallback

export type MariaUserRow = {
	id: number
	firstname?: string
	lastname?: string
}

export type MariaCourseRow = {
	id: number
	fullname?: string
	shortname?: string
}

export type MariaConnectStatus = {
	ok: boolean
	host: string
	port: number
	user: string
	database: string
	version?: string
	courseCount?: number
	error?: string
	syncEnabled: boolean
}

function poolConfig() {
	return {
		host: process.env.MARIADB_HOST || 'localhost',
		port: Number(process.env.MARIADB_PORT || 3306),
		user: process.env.MARIADB_USER || 'moodleuser',
		password: process.env.MARIADB_PASSWORD || '',
		database: process.env.MARIADB_DATABASE || 'moodle',
		connectTimeout: Number(process.env.MARIADB_CONNECT_TIMEOUT || 10000)
	}
}

/** Tắt hẳn đọc Moodle: MARIADB_SYNC_ENABLED=false */
export function isMariaSyncEnabled(): boolean {
	const v = (process.env.MARIADB_SYNC_ENABLED || 'true').toLowerCase()
	return v !== '0' && v !== 'false' && v !== 'no' && v !== 'off'
}

export function getMariaConfigPublic() {
	const c = poolConfig()
	return {
		host: c.host,
		port: c.port,
		user: c.user,
		database: c.database,
		syncEnabled: isMariaSyncEnabled(),
		// không lộ password
		passwordSet: Boolean(c.password)
	}
}

async function withPool<T>(fn: (pool: Pool) => Promise<T>): Promise<T | null> {
	if (!isMariaSyncEnabled()) {
		log.info('MariaDB sync disabled (MARIADB_SYNC_ENABLED=false)')
		return null
	}
	const cfg = poolConfig()
	const pool = createPool({
		host: cfg.host,
		port: cfg.port,
		user: cfg.user,
		password: cfg.password,
		database: cfg.database,
		connectTimeout: cfg.connectTimeout
	})
	try {
		return await fn(pool)
	} catch (err) {
		log.warn('MariaDB/Moodle unavailable — skip remote data', {
			host: cfg.host,
			port: cfg.port,
			user: cfg.user,
			database: cfg.database,
			err: err instanceof Error ? err.message : String(err)
		})
		return null
	} finally {
		await pool.end().catch(() => undefined)
	}
}

/** Kiểm tra kết nối + đếm course (dùng cho UI / debug) */
export async function testMariaMoodleConnection(): Promise<MariaConnectStatus> {
	const cfg = poolConfig()
	const base = {
		host: cfg.host,
		port: cfg.port,
		user: cfg.user,
		database: cfg.database,
		syncEnabled: isMariaSyncEnabled()
	}
	if (!isMariaSyncEnabled()) {
		return {
			...base,
			ok: false,
			error: 'MARIADB_SYNC_ENABLED=false'
		}
	}
	try {
		const pool = createPool({
			host: cfg.host,
			port: cfg.port,
			user: cfg.user,
			password: cfg.password,
			database: cfg.database,
			connectTimeout: cfg.connectTimeout
		})
		try {
			const [verRows] = await pool.query<RowDataPacket[]>(
				'SELECT VERSION() as v'
			)
			const version = String(verRows?.[0]?.v || '')
			let courseCount = 0
			try {
				const [cnt] = await pool.query<RowDataPacket[]>(
					'SELECT COUNT(*) as c FROM mdl_course WHERE id > 1'
				)
				courseCount = Number(cnt?.[0]?.c || 0)
			} catch (e: unknown) {
				const code = (e as { code?: string })?.code
				return {
					...base,
					ok: true,
					version,
					error:
						code === 'ER_NO_SUCH_TABLE'
							? 'Kết nối OK nhưng không có bảng mdl_course (DB không phải Moodle?)'
							: e instanceof Error
								? e.message
								: String(e)
				}
			}
			return { ...base, ok: true, version, courseCount }
		} finally {
			await pool.end().catch(() => undefined)
		}
	} catch (err) {
		return {
			...base,
			ok: false,
			error: err instanceof Error ? err.message : String(err)
		}
	}
}

/**
 * Lấy user Moodle. [] nếu không có / lỗi kết nối.
 */
export async function getMariaUserData(limit = 10): Promise<MariaUserRow[]> {
	const result = await withPool(async (pool) => {
		try {
			const [rows] = await pool.query<RowDataPacket[]>(
				'SELECT id, firstname, lastname FROM mdl_user WHERE deleted = 0 ORDER BY id LIMIT ?',
				[limit]
			)
			return (rows || []) as MariaUserRow[]
		} catch (error: unknown) {
			const code = (error as { code?: string })?.code
			if (code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_TABLE_ERROR') {
				log.info('Moodle mdl_user not found — no student remote data')
				return [] as MariaUserRow[]
			}
			throw error
		}
	})
	return result ?? []
}

/**
 * Lấy course Moodle. [] khi không có dữ liệu / lỗi.
 */
export async function getMariaCourseData(
	limit = 500
): Promise<MariaCourseRow[]> {
	const result = await withPool(async (pool) => {
		try {
			const [rows] = await pool.query<RowDataPacket[]>(
				`SELECT id, fullname, shortname
         FROM mdl_course
         WHERE id > 1 AND (visible IS NULL OR visible = 1)
         ORDER BY fullname ASC
         LIMIT ?`,
				[limit]
			)
			return (rows || []) as MariaCourseRow[]
		} catch (error: unknown) {
			const code = (error as { code?: string })?.code
			if (code === 'ER_BAD_FIELD_ERROR') {
				const [rows] = await pool.query<RowDataPacket[]>(
					`SELECT id, fullname, shortname FROM mdl_course WHERE id > 1 ORDER BY fullname ASC LIMIT ?`,
					[limit]
				)
				return (rows || []) as MariaCourseRow[]
			}
			if (code === 'ER_NO_SUCH_TABLE' || code === 'ER_BAD_TABLE_ERROR') {
				log.info('Moodle mdl_course not found — no class remote data')
				return [] as MariaCourseRow[]
			}
			throw error
		}
	})
	if (result === null) {
		log.warn('getMariaCourseData: connection failed or sync disabled', {
			config: getMariaConfigPublic()
		})
		return []
	}
	log.info('getMariaCourseData ok', { count: result.length })
	return result
}
