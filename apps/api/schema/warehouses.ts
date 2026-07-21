import { relations } from 'drizzle-orm'
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { warehouseItems } from './warehouse-items'

export const warehouses = sqliteTable('warehouses', {
	...baseSchema,
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	location: text('location'),
	manager: text('manager'),
	phone: text('phone'),
	description: text('description')
})

export const warehousesRelations = relations(warehouses, ({ many }) => ({
	items: many(warehouseItems)
}))

export interface WarehouseDB extends Base {
	code: string
	name: string
	location?: string
	manager?: string
	phone?: string
	description?: string
}

export interface Warehouse extends WarehouseDB {}

export interface CreateWarehouseRequest {
	code: string
	name: string
	location?: string
	manager?: string
	phone?: string
	description?: string
}

export interface UpdateWarehouseRequest {
	id: number
	code?: string
	name?: string
	location?: string
	manager?: string
	phone?: string
	description?: string
}
