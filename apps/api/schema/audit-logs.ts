import {
	index,
	int,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core'
import { baseSchema, type Base } from './base'

export type AuditModule = 'ASSET' | 'LEAVE' | 'EXAM' | 'SYSTEM' | string

/**
 * Nhật ký dùng chung toàn hệ thống.
 * Khi thêm tài nguyên mới chỉ cần thêm resourceType/action, không tạo bảng audit mới.
 */
export const auditLogs = sqliteTable(
	'audit_logs',
	{
		...baseSchema,
		module: text('module').notNull(),
		resourceType: text('resource_type').notNull(),
		resourceId: int('resource_id'),
		action: text('action').notNull(),
		actorUserId: int('actor_user_id'),
		actorUsername: text('actor_username'),
		actorDisplayName: text('actor_display_name'),
		actorIsAdmin: int('actor_is_admin').notNull().default(0),
		entityCode: text('entity_code'),
		entityName: text('entity_name'),
		parentCode: text('parent_code'),
		parentName: text('parent_name'),
		summary: text('summary').notNull(),
		details: text('details'),
		metadata: text('metadata'),
		legacySource: text('legacy_source'),
		legacyId: int('legacy_id')
	},
	(t) => ({
		moduleIdx: index('audit_logs_module_idx').on(t.module),
		resourceIdx: index('audit_logs_resource_idx').on(
			t.resourceType,
			t.resourceId
		),
		actorIdx: index('audit_logs_actor_idx').on(t.actorUserId),
		createdIdx: index('audit_logs_created_at_idx').on(t.createdAt),
		legacyUq: uniqueIndex('audit_logs_legacy_uq').on(
			t.legacySource,
			t.legacyId
		)
	})
)

export interface AuditLogDB extends Base {
	module: AuditModule
	resourceType: string
	resourceId?: number | null
	action: string
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
	actorIsAdmin: number
	entityCode?: string | null
	entityName?: string | null
	parentCode?: string | null
	parentName?: string | null
	summary: string
	details?: string | null
	metadata?: string | null
	legacySource?: string | null
	legacyId?: number | null
}

export interface CreateAuditLogRequest {
	module: AuditModule
	resourceType: string
	resourceId?: number | null
	action: string
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
	actorIsAdmin?: boolean
	entityCode?: string | null
	entityName?: string | null
	parentCode?: string | null
	parentName?: string | null
	summary: string
	details?: string | null
	metadata?: unknown
}
