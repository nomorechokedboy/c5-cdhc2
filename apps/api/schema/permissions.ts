import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'
import { Resource, resources } from './resources'
import { Action, actions } from './actions'
import { rolePermissions } from './role-permissions'
import { relations } from 'drizzle-orm'

export const permissions = sqliteTable('permissions', {
	...baseSchema,

	name: text('name').notNull().unique(), // auto-generated: resource:action (e.g., 'classes:create')
	displayName: text('display_name').notNull(), // e.g., 'Create Classes'
	description: text('description'),

	resourceId: integer('resource_id')
		.notNull()
		.references(() => resources.id, { onDelete: 'cascade' }),
	actionId: integer('action_id')
		.notNull()
		.references(() => actions.id, { onDelete: 'cascade' })
})

export const permissionsRelations = relations(permissions, ({ one, many }) => ({
	resource: one(resources, {
		fields: [permissions.resourceId],
		references: [resources.id]
	}),
	action: one(actions, {
		fields: [permissions.actionId],
		references: [actions.id]
	}),
	rolePermissions: many(rolePermissions)
}))

export interface Permission extends Base {
	name: string
	displayName: string
	description?: string
	resource: Resource
	action: Action
}

export interface PermissionCheck {
	resource: string
	action: string
	userId: number
}

export interface PermissionResult {
	allowed: boolean
	reason?: string
}

export interface BulkCreatePermissionsRequest {
	resourceId: number
	actionIds: number[]
}
