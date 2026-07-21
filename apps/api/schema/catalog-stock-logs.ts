import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'

/** INCREASE | DECREASE — biến động số lượng danh mục ngành */
export type CatalogStockMovementType = 'INCREASE' | 'DECREASE'

/**
 * Nhật ký tăng/giảm vật tư danh mục (user ngành khai báo mua/giảm).
 * Admin xem trong danh mục ngành.
 */
export const catalogStockLogs = sqliteTable('catalog_stock_logs', {
	...baseSchema,

	movementType: text('movement_type').notNull(),
	executedAt: text('executed_at').notNull(),

	materialId: int('material_id'),
	materialCode: text('material_code'),
	materialName: text('material_name').notNull(),

	nganhCode: text('nganh_code').notNull(),
	chuyenNganhCode: text('chuyen_nganh_code'),
	chuyenNganhName: text('chuyen_nganh_name'),

	quantity: int('quantity').notNull().default(0),
	quantityBefore: int('quantity_before').notNull().default(0),
	quantityAfter: int('quantity_after').notNull().default(0),
	unit: text('unit'),

	/** 1 = vừa sinh mã VT mới trong danh mục */
	isNewMaterial: int('is_new_material').notNull().default(0),
	reason: text('reason'),
	note: text('note'),

	actorUserId: int('actor_user_id'),
	actorUsername: text('actor_username'),
	actorDisplayName: text('actor_display_name'),
	actorIsAdmin: int('actor_is_admin').notNull().default(0)
})

export interface CatalogStockLogDB extends Base {
	movementType: CatalogStockMovementType | string
	executedAt: string
	materialId?: number | null
	materialCode?: string | null
	materialName: string
	nganhCode: string
	chuyenNganhCode?: string | null
	chuyenNganhName?: string | null
	quantity: number
	quantityBefore: number
	quantityAfter: number
	unit?: string | null
	isNewMaterial: number
	reason?: string | null
	note?: string | null
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
	actorIsAdmin: number
}
