import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'

import { rooms } from './rooms'
import { units } from './units'
import { repairLogs } from './repair-logs'
import { inventoryLogs } from './inventory-logs'
import { replacementLogs } from './replacement-logs'
import { assetMovementLogs } from './asset-movement-logs'

export const roomAssets = sqliteTable('room_assets', {
	...baseSchema,

	roomId: int('room_id')
		.notNull()
		.references(() => rooms.id, {
			onDelete: 'cascade'
		}),

	/** Mã vật tư — vd. H1.101-PC */
	code: text('code').unique(),

	name: text('name').notNull(),

	category: text('category').notNull(),

	/**
	 * Số lượng đang dùng được (ổn định).
	 * SL hỏng tách riêng ở brokenQuantity — không tạo mã VT mới khi báo hỏng một phần.
	 */
	quantity: int('quantity').notNull().default(1),

	/**
	 * Số lượng đang hỏng / chờ-đang sửa (cùng mã VT, cùng dòng).
	 * Tổng thực tế ≈ quantity + brokenQuantity.
	 */
	brokenQuantity: int('broken_quantity').notNull().default(0),

	/** Đơn vị tính (cái, bộ, bình…) */
	unit: text('unit'),

	/**
	 * Đơn vị giữ / sử dụng (đại đội, khoa…).
	 * null + nằm kho = chưa sử dụng (cột Kho trên báo cáo thực lực).
	 */
	holdingUnitId: int('holding_unit_id').references(() => units.id, {
		onDelete: 'set null'
	}),

	/** Phân cấp 1–5 (1 tốt → 5 cần sửa) */
	grade: int('grade').notNull().default(1),

	/** Năm sản xuất */
	manufactureYear: int('manufacture_year'),

	/** Năm đưa vào sử dụng */
	usageYear: int('usage_year'),

	/** Địa chỉ lắp đặt / sử dụng */
	installAddress: text('install_address'),

	// NORMAL | BROKEN | REPAIRING | DISPOSED
	status: text('status').notNull().default('NORMAL'),

	purchaseDate: text('purchase_date'),

	/** Ngày hết hạn / bảo hành — dùng cho báo cáo "vật tư sắp hết hạn" */
	expiryDate: text('expiry_date'),

	/** Ngày phát hiện hư hỏng */
	brokenAt: text('broken_at'),

	/** Ngày bắt đầu sửa chữa */
	repairStartedAt: text('repair_started_at'),

	/** Ngày hoàn thành sửa chữa (null = chưa xong) */
	repairCompletedAt: text('repair_completed_at'),

	/** Người phụ trách / đang sửa chữa */
	repairPerformer: text('repair_performer'),

	description: text('description')
})

export const roomAssetsRelations = relations(roomAssets, ({ one, many }) => ({
	room: one(rooms, {
		fields: [roomAssets.roomId],
		references: [rooms.id]
	}),

	holdingUnit: one(units, {
		fields: [roomAssets.holdingUnitId],
		references: [units.id]
	}),

	repairs: many(repairLogs),

	inventories: many(inventoryLogs),

	replacements: many(replacementLogs),

	movements: many(assetMovementLogs)
}))

export type RoomAssetStatus = 'NORMAL' | 'BROKEN' | 'REPAIRING' | 'DISPOSED'

export interface RoomAssetDB extends Base {
	roomId: number
	code?: string | null
	name: string
	category: string
	quantity: number
	brokenQuantity?: number | null
	unit?: string | null
	holdingUnitId?: number | null
	grade?: number | null
	manufactureYear?: number | null
	usageYear?: number | null
	installAddress?: string | null
	status?: string | null
	purchaseDate?: string | null
	expiryDate?: string | null
	brokenAt?: string | null
	repairStartedAt?: string | null
	repairCompletedAt?: string | null
	repairPerformer?: string | null
	description?: string | null
}

export interface CreateRoomAssetRequest {
	roomId: number
	code: string
	name: string
	category: string
	quantity?: number
	unit?: string
	holdingUnitId?: number
	grade?: number
	manufactureYear?: number
	usageYear?: number
	installAddress?: string
	status?: string
	purchaseDate?: string
	expiryDate?: string
	brokenAt?: string
	repairStartedAt?: string
	repairCompletedAt?: string
	repairPerformer?: string
	description?: string
}

export interface UpdateRoomAssetRequest {
	id: number
	roomId?: number
	code?: string
	name?: string
	category?: string
	quantity?: number
	unit?: string
	holdingUnitId?: number | null
	grade?: number
	manufactureYear?: number
	usageYear?: number
	installAddress?: string
	status?: string
	purchaseDate?: string
	expiryDate?: string
	brokenAt?: string
	repairStartedAt?: string
	repairCompletedAt?: string
	repairPerformer?: string
	description?: string
}
