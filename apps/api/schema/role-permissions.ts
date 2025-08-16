import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { roles } from './roles'
import { permissions } from './permissions'
import { relations, sql } from 'drizzle-orm'

export const rolePermissions = sqliteTable(
	'role_permissions',
	{
		roleId: integer('role_id')
			.notNull()
			.references(() => roles.id, { onDelete: 'cascade' }),
		permissionId: integer('permission_id')
			.notNull()
			.references(() => permissions.id, { onDelete: 'cascade' }),
		createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`)
	},
	(table) => [primaryKey({ columns: [table.roleId, table.permissionId] })]
)

export const rolePermissionsRelations = relations(
	rolePermissions,
	({ one }) => ({
		role: one(roles, {
			fields: [rolePermissions.roleId],
			references: [roles.id]
		}),
		permission: one(permissions, {
			fields: [rolePermissions.permissionId],
			references: [permissions.id]
		})
	})
)
