import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'

/** CREATE | UPDATE | DELETE */
export type CatalogAuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

/** NGANH | LOAI_VAT | VAT_TU */
export type CatalogAuditEntity = 'NGANH' | 'LOAI_VAT' | 'VAT_TU'

/**
 * Nhật ký thao tác danh mục ngành / loại vật / vật tư.
 */
export const catalogAuditLogs = sqliteTable('catalog_audit_logs', {
	...baseSchema,

	action: text('action').notNull(),
	entityType: text('entity_type').notNull(),

	actorUserId: int('actor_user_id'),
	actorUsername: text('actor_username'),
	actorDisplayName: text('actor_display_name'),
	actorIsAdmin: int('actor_is_admin').notNull().default(0),

	entityId: int('entity_id'),
	entityCode: text('entity_code'),
	entityName: text('entity_name'),
	parentCode: text('parent_code'),
	parentName: text('parent_name'),

	summary: text('summary').notNull(),
	details: text('details')
})

export interface CatalogAuditLogDB extends Base {
	action: CatalogAuditAction | string
	entityType: CatalogAuditEntity | string
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
	actorIsAdmin: number
	entityId?: number | null
	entityCode?: string | null
	entityName?: string | null
	parentCode?: string | null
	parentName?: string | null
	summary: string
	details?: string | null
}

export interface CreateCatalogAuditLogRequest {
	action: CatalogAuditAction
	entityType: CatalogAuditEntity
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
	actorIsAdmin?: boolean
	entityId?: number | null
	entityCode?: string | null
	entityName?: string | null
	parentCode?: string | null
	parentName?: string | null
	summary: string
	details?: string | null
}
