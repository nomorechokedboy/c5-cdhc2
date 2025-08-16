import * as p from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'
import { relations } from 'drizzle-orm'
import { Role, roles } from './roles'

export const users = p.sqliteTable('users', {
	...baseSchema,
	username: p.text().notNull().unique(),
	password: p.text().notNull()
})

export const usersRelations = relations(users, ({ many }) => ({
	roles: many(roles)
}))

export interface UserDB extends Base {
	username: string
	password: string
}

export interface User extends UserDB {
	roles?: Role[]
}

export interface CreateUserRequest {
	username: string
	password: string
	roleIds?: number[]
}

export interface UpdateUserRequest {
	username?: string
	roleIds?: number[]
}

export interface AssignRoleRequest {
	userId: number
	roleIds: number[]
}

export interface BulkAssignRolesRequest {
	userIds: number[]
	roleIds: number[]
}
