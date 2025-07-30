import * as p from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'

export const users = p.sqliteTable('users', {
	...baseSchema,
	username: p.text().notNull().unique(),
	password: p.text().notNull()
})
