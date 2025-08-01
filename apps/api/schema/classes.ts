import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm'
import * as sqlite from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'
import { AppError } from '../errors'
import { units } from './units'

const StatusEnum = sqlite.customType<{ data: string; driverData: string }>({
	dataType() {
		return 'text'
	},
	toDriver(val: string) {
		if (!['ongoing', 'graduated'].includes(val)) {
			throw AppError.invalidArgument(
				'status can be only ongoing | graduated'
			)
		}
		return val
	}
})

export const classes = sqlite.sqliteTable('classes', {
	...baseSchema,

	name: sqlite.text().unique().notNull(),
	description: sqlite.text().default(''),

	graduatedAt: sqlite.text(),
	status: StatusEnum('status')
		.$type<'ongoing' | 'graduated'>()
		.default('ongoing'),

	unitId: sqlite
		.int()
		.notNull()
		.default(7)
		.references(() => units.id)
})

export const classesRelations = relations(classes, ({ one }) => ({
	unit: one(units, { fields: [classes.unitId], references: [units.id] })
}))

export type ClassDB = InferSelectModel<typeof classes>

export type Class = ClassDB & { studentCount: number }

export type ClassParam = InferInsertModel<typeof classes>
