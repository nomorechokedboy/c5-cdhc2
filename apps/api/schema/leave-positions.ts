import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'

export const leavePositions = sqliteTable('leave_positions', {
	...baseSchema,
	name: text('name').notNull().unique(),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: int('is_active', { mode: 'boolean' }).notNull().default(true)
})
