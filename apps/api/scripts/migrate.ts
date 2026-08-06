import { createClient } from '@libsql/client'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { drizzle } from 'drizzle-orm/libsql/node'

const client = createClient({ url: 'file:./local.db' })

try {
	await migrate(drizzle(client), { migrationsFolder: './migrations' })
	console.log('Migrations applied successfully!')
} finally {
	client.close()
}
