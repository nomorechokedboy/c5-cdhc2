import { relations } from 'drizzle-orm'
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { materials } from './materials'

export const suppliers = sqliteTable('suppliers', {
	...baseSchema,
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	phone: text('phone'),
	email: text('email'),
	address: text('address'),
	contactPerson: text('contact_person'),
	description: text('description')
})

export const suppliersRelations = relations(suppliers, ({ many }) => ({
	materials: many(materials)
}))

export interface SupplierDB extends Base {
	code: string
	name: string
	phone?: string
	email?: string
	address?: string
	contactPerson?: string
	description?: string
}

export interface Supplier extends SupplierDB {}

export interface CreateSupplierRequest {
	code: string
	name: string
	phone?: string
	email?: string
	address?: string
	contactPerson?: string
	description?: string
}

export interface UpdateSupplierRequest {
	id: number
	code?: string
	name?: string
	phone?: string
	email?: string
	address?: string
	contactPerson?: string
	description?: string
}
