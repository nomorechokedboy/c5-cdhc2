import type { Client } from '@libsql/client'

const USER_PROFILE_MIGRATION_TIMESTAMP = 1764818984550

const legacyUserColumns: ReadonlyArray<readonly [string, string]> = [
	['rank', 'text'],
	['position', 'text'],
	['alias', 'text']
]

/**
 * Repairs databases whose Drizzle journal says migration 0003 ran while the
 * corresponding user profile columns are absent. Some deployed/local
 * databases were created from an old snapshot with that inconsistent state.
 */
export async function ensureLegacyUserColumns(client: Client): Promise<void> {
	const tables = await client.execute(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'users'"
	)
	if (tables.rows.length === 0) return

	const migrationTable = await client.execute(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'"
	)
	if (migrationTable.rows.length === 0) return

	const migration = await client.execute({
		sql: 'SELECT 1 FROM __drizzle_migrations WHERE created_at >= ? LIMIT 1',
		args: [USER_PROFILE_MIGRATION_TIMESTAMP]
	})
	if (migration.rows.length === 0) return

	const columns = await client.execute('PRAGMA table_info(`users`)')
	const existing = new Set(columns.rows.map((row) => String(row.name)))

	for (const [name, type] of legacyUserColumns) {
		if (!existing.has(name)) {
			await client.execute(`ALTER TABLE \`users\` ADD \`${name}\` ${type}`)
		}
	}
}
