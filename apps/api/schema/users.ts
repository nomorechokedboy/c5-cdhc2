import * as p from 'drizzle-orm/sqlite-core'
import * as sqlite from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'
import { relations, sql } from 'drizzle-orm'
import { Role } from './roles'
import { userRoles } from './user-roles'
import { units } from './units'
import { classes } from './classes'

export const users = p.sqliteTable('users', {
	...baseSchema,

	username: p.text().notNull().unique(),
	password: p.text().notNull(),
	displayName: p.text().notNull().default(''),
	isSuperUser: sqlite.int({ mode: 'boolean' }).default(false).notNull(),
	unitId: p.int().references(() => units.id)
})

export const usersRelations = relations(users, ({ many, one }) => ({
	roles: many(userRoles),
	unit: one(units, {
		fields: [users.unitId],
		references: [units.id]
	})
}))

export interface UserDB extends Base {
	username: string
	password: string
	displayName: string
	unitId: number
	isSuperUser: boolean
}

export interface User extends UserDB {
	roles?: Role[]
}

export interface CreateUserRequest {
	username: string
	password: string
	roleIds?: number[]
	displayName: string
	unitId: number
}

export interface UpdateUserRequest {
	id: number
	password?: string
	roleIds?: number[]
	displayName: string
	unitId?: number
	isSuperUser?: boolean
}

export interface AssignRoleRequest {
	userId: number
	roleIds: number[]
}

export interface BulkAssignRolesRequest {
	userIds: number[]
	roleIds: number[]
}

export interface UserPermissions {
	permissionName: string
	resourceName: string
	actionName: string
}
