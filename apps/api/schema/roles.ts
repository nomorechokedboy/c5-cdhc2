import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'
import { relations } from 'drizzle-orm'
import { users } from './users'
import { Permission } from './permissions'

export const roles = sqliteTable('roles', {
	...baseSchema,

	name: text('name').notNull().unique(),
	description: text('description')
})

export const rolesRelations = relations(roles, ({ many }) => ({
	users: many(users)
}))

export interface Role extends Base {
	name: string
	description?: string
	permissions?: Permission[]
}

export interface CreateRoleRequest {
	name: string
	description?: string
	permissionIds?: number[]
}

export interface UpdateRoleRequest {
	name?: string
	description?: string
	permissionIds?: number[]
}
