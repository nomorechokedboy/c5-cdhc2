import { createClient } from '@libsql/client'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { drizzle } from 'drizzle-orm/libsql/node'
import {
	ensureLegacyUserColumns,
	ensureSkippedLeaveMigrations
} from '../migration-compat'

const client = createClient({ url: 'file:./local.db' })

try {
	await ensureLegacyUserColumns(client)
	await ensureSkippedLeaveMigrations(client)
	await migrate(drizzle(client), { migrationsFolder: './migrations' })
	console.log('Migrations applied successfully!')
} finally {
	client.close()
}
