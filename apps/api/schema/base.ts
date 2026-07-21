import { sql } from 'drizzle-orm'
import * as sqlite from 'drizzle-orm/sqlite-core'

export const baseSchema = {
	id: sqlite.int().primaryKey({
		autoIncrement: true
	}),

	createdAt: sqlite
		.text()
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),

	updatedAt: sqlite
		.text()
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`)
		.$onUpdate(() => sql`CURRENT_TIMESTAMP`)
}

export interface Base {
	id: number
	createdAt: string
	updatedAt: string
}
