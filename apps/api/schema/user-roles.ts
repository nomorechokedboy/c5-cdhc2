import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { roles } from './roles'
import { users } from './users'
import { relations, sql } from 'drizzle-orm'

export const userRoles = sqliteTable(
	'user_roles',
	{
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		roleId: integer('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
	},
	(table) => [primaryKey({ columns: [table.userId, table.roleId] })]
)

export const userRolesRelations = relations(userRoles, ({ one }) => ({
	role: one(roles, {
		fields: [userRoles.roleId],
		references: [roles.id]
	}),
	user: one(users, {
		fields: [userRoles.userId],
		references: [users.id]
	})
}))
