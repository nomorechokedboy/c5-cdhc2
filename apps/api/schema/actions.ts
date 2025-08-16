import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'
import { relations } from 'drizzle-orm'
import { permissions } from './permissions'

export const actions = sqliteTable('actions', {
	...baseSchema,

	name: text('name').notNull().unique(), // e.g., 'create', 'read', 'update', 'delete'
	displayName: text('display_name').notNull(), // e.g., 'Create', 'Read', 'Update', 'Delete'
	description: text('description')
})

export const actionsRelations = relations(actions, ({ many }) => ({
	permissions: many(permissions)
}))

export interface Action extends Base {
	name: string
	displayName: string
	description?: string
}

export interface CreateActionRequest {
	name: string
	displayName: string
	description?: string
}
