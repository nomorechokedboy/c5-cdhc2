import { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import * as sqlite from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'

export const classes = sqlite.sqliteTable('classes', {
	...baseSchema,
	name: sqlite.text().unique().notNull(),
	description: sqlite.text().default('')
})

export type ClassDB = InferSelectModel<typeof classes>

export type Class = ClassDB & { studentCount: number }

export type ClassParam = InferInsertModel<typeof classes>
