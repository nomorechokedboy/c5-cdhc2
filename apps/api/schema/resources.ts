import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'
import { relations } from 'drizzle-orm'
import { permissions } from './permissions'

export const resources = sqliteTable('resources', {
	...baseSchema,

	name: text('name').notNull().unique(), // e.g., 'classes', 'students', 'units'
	displayName: text('display_name').notNull(), // e.g., 'Classes', 'Students', 'Units'
	description: text('description')
})

export const resourcesRelations = relations(resources, ({ many }) => ({
	permissions: many(permissions)
}))

export interface Resource extends Base {
	name: string
	displayName: string
	description?: string
}

export interface CreateResourceRequest {
	name: string
	displayName: string
	description?: string
}
