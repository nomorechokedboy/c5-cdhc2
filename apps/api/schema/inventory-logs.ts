import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { roomAssets } from './room-assets'

export const inventoryLogs = sqliteTable('inventory_logs', {
	...baseSchema,
	roomAssetId: int('room_asset_id')
		.notNull()
		.references(() => roomAssets.id, {
			onDelete: 'cascade'
		}),
	inventoryDate: text('inventory_date').notNull(),
	actualQuantity: int('actual_quantity').notNull().default(0),
	expectedQuantity: int('expected_quantity').notNull().default(0),
	result: text('result'),
	note: text('note')
})

export const inventoryLogsRelations = relations(inventoryLogs, ({ one }) => ({
	roomAsset: one(roomAssets, {
		fields: [inventoryLogs.roomAssetId],
		references: [roomAssets.id]
	})
}))

export interface InventoryLogDB extends Base {
	roomAssetId: number
	inventoryDate: string
	actualQuantity: number
	expectedQuantity: number
	result?: string | null
	note?: string | null
}

export interface CreateInventoryLogRequest {
	roomAssetId: number
	inventoryDate: string
	actualQuantity: number
	expectedQuantity?: number
	result?: string
	note?: string
}

export interface UpdateInventoryLogRequest {
	id: number
	roomAssetId?: number
	inventoryDate?: string
	actualQuantity?: number
	expectedQuantity?: number
	result?: string
	note?: string
}
