import { relations } from 'drizzle-orm'
import { int, sqliteTable, text, real } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { categories } from './categories'
import type { CategoryDB } from './categories'

import { suppliers } from './suppliers'
import type { SupplierDB } from './suppliers'

export const materials = sqliteTable('materials', {
	...baseSchema,
	categoryId: int('category_id')
		.notNull()
		.references(() => categories.id, {
			onDelete: 'cascade'
		}),
	supplierId: int('supplier_id').references(() => suppliers.id, {
		onDelete: 'set null'
	}),
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	unit: text('unit').notNull(),
	quantity: int('quantity').notNull().default(0),
	minQuantity: int('min_quantity').notNull().default(0),
	price: real('price').default(0),
	status: text('status').notNull().default('ACTIVE'),
	description: text('description')
})

export const materialsRelations = relations(materials, ({ one }) => ({
	category: one(categories, {
		fields: [materials.categoryId],
		references: [categories.id]
	}),
	supplier: one(suppliers, {
		fields: [materials.supplierId],
		references: [suppliers.id]
	})
}))

export interface MaterialDB extends Base {
	categoryId: number
	supplierId?: number
	code: string
	name: string
	unit: string
	quantity: number
	minQuantity: number
	price?: number
	status?: string
	description?: string
}

export interface Material extends MaterialDB {
	category?: CategoryDB
	supplier?: SupplierDB
}

export interface CreateMaterialRequest {
	categoryId: number
	supplierId?: number
	code: string
	name: string
	unit: string
	quantity?: number
	minQuantity?: number
	price?: number
	status?: string
	description?: string
}

export interface UpdateMaterialRequest {
	id: number
	categoryId?: number
	supplierId?: number
	code?: string
	name?: string
	unit?: string
	quantity?: number
	minQuantity?: number
	price?: number
	status?: string
	description?: string
}
