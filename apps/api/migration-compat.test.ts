import { createClient, type Client } from '@libsql/client'
import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
	ensureLegacyUserColumns,
	ensureSkippedLeaveMigrations
} from './migration-compat'

function mockClient(rows: Array<Array<Record<string, unknown>>>) {
	const execute = vi.fn(async () => ({ rows: rows.shift() ?? [] }))
	return { client: { execute } as unknown as Client, execute }
}

describe('ensureLegacyUserColumns', () => {
	it('does nothing before the users table exists', async () => {
		const { client, execute } = mockClient([[]])

		await ensureLegacyUserColumns(client)

		expect(execute).toHaveBeenCalledTimes(1)
	})

	it('repairs profile columns missing from a migrated legacy database', async () => {
		const { client, execute } = mockClient([
			[{ name: 'users' }],
			[{ name: '__drizzle_migrations' }],
			[{ 1: 1 }],
			[{ name: 'id' }, { name: 'username' }],
			[],
			[],
			[]
		])

		await ensureLegacyUserColumns(client)

		expect(execute).toHaveBeenCalledWith(
			'ALTER TABLE `users` ADD `rank` text'
		)
		expect(execute).toHaveBeenCalledWith(
			'ALTER TABLE `users` ADD `position` text'
		)
		expect(execute).toHaveBeenCalledWith(
			'ALTER TABLE `users` ADD `alias` text'
		)
	})

	it('keeps an already-correct schema unchanged', async () => {
		const { client, execute } = mockClient([
			[{ name: 'users' }],
			[{ name: '__drizzle_migrations' }],
			[{ 1: 1 }],
			[
				{ name: 'rank' },
				{ name: 'position' },
				{ name: 'alias' }
			]
		])

		await ensureLegacyUserColumns(client)

		expect(execute).toHaveBeenCalledTimes(4)
	})
})

describe('ensureSkippedLeaveMigrations', () => {
	it('restores the leave foundation skipped by a production-shaped journal', async () => {
		const directory = await mkdtemp(path.join(os.tmpdir(), 'leave-repair-'))
		const client = createClient({ url: `file:${path.join(directory, 'db.sqlite')}` })
		try {
			for (const statement of [
				'CREATE TABLE __drizzle_migrations (id integer, hash text, created_at numeric)',
				'INSERT INTO __drizzle_migrations (hash, created_at) VALUES (\'post-leave\', 1785552000000)',
				'CREATE TABLE users (id integer PRIMARY KEY, username text)',
				'CREATE TABLE actions (id integer PRIMARY KEY AUTOINCREMENT, name text UNIQUE, display_name text, description text)',
				'CREATE TABLE resources (id integer PRIMARY KEY AUTOINCREMENT, name text UNIQUE, display_name text, description text)',
				'CREATE TABLE roles (id integer PRIMARY KEY AUTOINCREMENT, name text UNIQUE, description text)',
				'CREATE TABLE permissions (id integer PRIMARY KEY AUTOINCREMENT, resource_id integer, action_id integer, name text UNIQUE, display_name text, description text)',
				'CREATE TABLE role_permissions (role_id integer, permission_id integer, UNIQUE(role_id, permission_id))'
			]) {
				await client.execute(statement)
			}

			await ensureSkippedLeaveMigrations(client, './migrations')
			// A second startup must be harmless and must not duplicate seed data.
			await ensureSkippedLeaveMigrations(client, './migrations')

			const tables = await client.execute(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('leave_requests', 'leave_batches', 'leave_audit_logs')"
			)
			expect(tables.rows.map((row) => row.name).sort()).toEqual([
				'leave_audit_logs',
				'leave_batches',
				'leave_requests'
			])

			const userColumns = await client.execute('PRAGMA table_info(`users`)')
			expect(userColumns.rows.map((row) => row.name)).toEqual(
				expect.arrayContaining(['leave_unit_id', 'management_area'])
			)

			const roles = await client.execute(
				"SELECT name FROM roles WHERE name IN ('leave_admin', 'leave_personnel') ORDER BY name"
			)
			expect(roles.rows.map((row) => row.name)).toEqual([
				'leave_admin',
				'leave_personnel'
			])

			const repair = await client.execute(
				'SELECT name FROM app_migration_repairs'
			)
			expect(repair.rows).toHaveLength(1)
		} finally {
			client.close()
			await rm(directory, { recursive: true, force: true })
		}
	})
})
