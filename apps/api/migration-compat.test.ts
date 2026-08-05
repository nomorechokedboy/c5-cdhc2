import type { Client } from '@libsql/client'
import { describe, expect, it, vi } from 'vitest'
import { ensureLegacyUserColumns } from './migration-compat'

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
