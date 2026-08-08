import { drizzle } from 'drizzle-orm/libsql/node'
import { createClient } from '@libsql/client'
import * as schema from './schema'
import { Logger } from 'drizzle-orm'
import log from 'encore.dev/log'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { appConfig } from './configs'
import path from 'path'
import { mkdirSync } from 'fs'

class AppDBLogger implements Logger {
	logQuery(query: string, params: unknown[]): void {
		log.trace(`Query info: ${query}`, { params })
	}
}

const isFileUri = appConfig.DATABASE_URI.startsWith('file:')
const dbPath = isFileUri
	? appConfig.DATABASE_URI.replace(/^file:/, '')
	: path.resolve(appConfig.DATABASE_URI)

mkdirSync(path.dirname(dbPath), { recursive: true })

const client = createClient({
	url: isFileUri ? appConfig.DATABASE_URI : `file:${dbPath}`
})

const orm = drizzle({ schema, client, logger: new AppDBLogger() })

async function repairLegacyUserColumns() {
	const result = await client.execute('PRAGMA table_info(users)')
	const columns = new Set(result.rows.map((row) => String(row.name || '')))
	for (const [name, type] of [
		['rank', 'text'],
		['position', 'text'],
		['alias', 'text']
	] as const) {
		if (!columns.has(name)) {
			await client.execute(`ALTER TABLE users ADD COLUMN ${name} ${type}`)
		}
	}
}

async function autoMigrate() {
	try {
		await repairLegacyUserColumns()
		await migrate(orm, { migrationsFolder: './migrations' }) // Specify your migrations folder
		console.log('Migrations applied successfully!')
	} catch (error) {
		console.error('Error applying migrations:', error)
		process.exit(1)
	}
}

autoMigrate()

export type DrizzleDatabase = typeof orm

export default orm
