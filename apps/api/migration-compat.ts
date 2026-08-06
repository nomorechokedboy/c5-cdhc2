import type { Client } from '@libsql/client'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const USER_PROFILE_MIGRATION_TIMESTAMP = 1764818984550
const FIRST_POST_LEAVE_MIGRATION_TIMESTAMP = 1785552000000
const LEAVE_MIGRATION_START = 1785420000000
const LEAVE_MIGRATION_END = 1785425100000
const LEAVE_REPAIR_NAME = 'restore-skipped-leave-migrations-0042-0049-v1'

const leaveMigrationFiles = [
	'0042_leave_management.sql',
	'0044_restore_roles_and_leave_roles.sql',
	'0045_add_leave_personnel_role.sql',
	'0046_leave_audit_logs.sql',
	'0047_backfill_approved_leave_data.sql',
	'0048_restore_leave_regulations.sql',
	'0049_seed_leave_objects_and_extra_standards.sql'
] as const

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

async function tableExists(client: Client, table: string): Promise<boolean> {
	const result = await client.execute({
		sql: "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
		args: [table]
	})
	return result.rows.length > 0
}

async function addLeaveUserColumns(client: Client): Promise<void> {
	if (!(await tableExists(client, 'users'))) return

	const columns = await client.execute('PRAGMA table_info(`users`)')
	const existing = new Set(columns.rows.map((row) => String(row.name)))

	if (!existing.has('leave_unit_id')) {
		await client.execute('ALTER TABLE `users` ADD `leave_unit_id` text')
	}
	if (!existing.has('management_area')) {
		await client.execute('ALTER TABLE `users` ADD `management_area` text')
	}
}

/**
 * Repairs databases that applied migrations 0050+ before 0042-0049. Those
 * leave migrations were once journaled with timestamps older than 0050, so
 * Drizzle permanently skipped them and later migrations crashed while
 * altering the missing leave_requests table.
 */
export async function ensureSkippedLeaveMigrations(
	client: Client,
	migrationsFolder = './migrations'
): Promise<void> {
	if (!(await tableExists(client, '__drizzle_migrations'))) return

	const postLeaveMigration = await client.execute({
		sql: 'SELECT 1 FROM __drizzle_migrations WHERE created_at >= ? LIMIT 1',
		args: [FIRST_POST_LEAVE_MIGRATION_TIMESTAMP]
	})
	if (postLeaveMigration.rows.length === 0) return

	const originalLeaveMigration = await client.execute({
		sql: 'SELECT 1 FROM __drizzle_migrations WHERE created_at BETWEEN ? AND ? LIMIT 1',
		args: [LEAVE_MIGRATION_START, LEAVE_MIGRATION_END]
	})
	if (originalLeaveMigration.rows.length > 0) return

	await client.execute(`
		CREATE TABLE IF NOT EXISTS app_migration_repairs (
			name text PRIMARY KEY NOT NULL,
			applied_at integer NOT NULL
		)
	`)
	const repaired = await client.execute({
		sql: 'SELECT 1 FROM app_migration_repairs WHERE name = ? LIMIT 1',
		args: [LEAVE_REPAIR_NAME]
	})
	if (repaired.rows.length > 0) return

	for (const file of leaveMigrationFiles) {
		const sql = await readFile(path.join(migrationsFolder, file), 'utf8')
		const statements = sql
			.split('--> statement-breakpoint')
			.map((statement) => statement.trim())
			.filter(Boolean)

		for (const statement of statements) {
			await client.execute(statement)
		}
		if (file === '0042_leave_management.sql') {
			await addLeaveUserColumns(client)
		}
	}

	await client.execute({
		sql: 'INSERT INTO app_migration_repairs (name, applied_at) VALUES (?, ?)',
		args: [LEAVE_REPAIR_NAME, Date.now()]
	})
}
