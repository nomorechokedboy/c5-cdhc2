import { relations } from 'drizzle-orm'
import { int, sqliteTable } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { warehouses } from './warehouses'
import { materials } from './materials'

import type { WarehouseDB } from './warehouses'
import type { MaterialDB } from './materials'

export const warehouseItems = sqliteTable('warehouse_items', {
	...baseSchema,
	warehouseId: int('warehouse_id')
		.notNull()
		.references(() => warehouses.id, {
			onDelete: 'cascade'
		}),
	materialId: int('material_id')
		.notNull()
		.references(() => materials.id, {
			onDelete: 'cascade'
		}),
	quantity: int('quantity').notNull().default(0),
	minQuantity: int('min_quantity').notNull().default(0)
})

export const warehouseItemsRelations = relations(warehouseItems, ({ one }) => ({
	warehouse: one(warehouses, {
		fields: [warehouseItems.warehouseId],
		references: [warehouses.id]
	}),
	material: one(materials, {
		fields: [warehouseItems.materialId],
		references: [materials.id]
	})
}))

export interface WarehouseItemDB extends Base {
	warehouseId: number
	materialId: number
	quantity: number
	minQuantity: number
}

export interface WarehouseItem extends WarehouseItemDB {
	warehouse?: WarehouseDB
	material?: MaterialDB
}

export interface CreateWarehouseItemRequest {
	warehouseId: number
	materialId: number
	quantity?: number
	minQuantity?: number
}

export interface UpdateWarehouseItemRequest {
	id: number
	warehouseId?: number
	materialId?: number
	quantity?: number
	minQuantity?: number
}
