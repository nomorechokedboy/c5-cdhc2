import { drizzle } from 'drizzle-orm/libsql/node'
import { createClient } from '@libsql/client'
import * as schema from './schema'
import { Logger } from 'drizzle-orm'
import log from 'encore.dev/log'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { appConfig } from './configs'
import path from 'path'

class AppDBLogger implements Logger {
	logQuery(query: string, params: unknown[]): void {
		log.trace(`Query info: ${query}`, { params })
	}
}

const dbPwd = appConfig.DATABASE_URI.startsWith('file:')
	? appConfig.DATABASE_URI
	: `file:${path.resolve(appConfig.DATABASE_URI)}`

const client = createClient({
	url: `file:${dbPwd}`
})

const orm = drizzle({ schema, client, logger: new AppDBLogger() })

async function autoMigrate() {
	try {
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
