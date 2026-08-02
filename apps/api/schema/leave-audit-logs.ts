import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'

export const leaveAuditLogs = sqliteTable('leave_audit_logs', {
	...baseSchema,
	userId: int('user_id'),
	action: text('action').notNull(),
	entityType: text('entity_type').notNull(),
	entityId: int('entity_id'),
	details: text('details')
})
