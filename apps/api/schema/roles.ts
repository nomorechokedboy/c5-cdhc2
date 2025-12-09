import { sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'
import { relations } from 'drizzle-orm'
import { Permission } from './permissions'
import { userRoles } from './user-roles'
import { rolePermissions } from './role-permissions'
import { User } from './users'

export const roles = sqliteTable('roles', {
	...baseSchema,

	name: text('name').notNull().unique(),
	description: text('description')
})

export const rolesRelations = relations(roles, ({ many }) => ({
	users: many(userRoles),
	permissions: many(rolePermissions)
}))

export interface RoleDB extends Base {
	name: string
	description?: string
}

export interface Role extends RoleDB {
	permissions?: Permission[]
	users?: User[]
}

export interface CreateRoleRequest {
	name: string
	description?: string
	permissionIds?: number[]
}

export interface UpdateRoleRequest {
	id: number
	name?: string
	description?: string
	permissionIds?: number[]
}
