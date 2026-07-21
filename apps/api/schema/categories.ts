import { relations } from 'drizzle-orm'
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { materials } from './materials'

export const categories = sqliteTable('categories', {
	...baseSchema,

	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	description: text('description')
})

export const categoriesRelations = relations(categories, ({ many }) => ({
	materials: many(materials)
}))

export interface CategoryDB extends Base {
	code: string
	name: string
	description?: string | null
}

export interface Category extends CategoryDB {}

export interface CreateCategoryRequest {
	code: string
	name: string
	description?: string | null
}

export interface UpdateCategoryRequest {
	id: number
	code?: string
	name?: string
	description?: string | null
}
