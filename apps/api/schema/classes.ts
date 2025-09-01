import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm'
import * as sqlite from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'
import { AppError } from '../errors'
import { Unit, units } from './units'
import { students } from './student'

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

export const classes = sqlite.sqliteTable(
	'classes',
	{
		...baseSchema,

		name: sqlite.text().notNull(),
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
	},
	(t) => [sqlite.unique('class_unit_unique_constraint').on(t.name, t.unitId)]
)

export const classesRelations = relations(classes, ({ one, many }) => ({
	unit: one(units, { fields: [classes.unitId], references: [units.id] }),
	students: many(students)
}))

export type ClassDB = InferSelectModel<typeof classes>

export type Class = ClassDB & { studentCount: number; unit: Unit }

export type ClassParam = {
	name: string
	description?: string
	graduatedAt: string
	unitId: number
}

export type ClassQuery = {
	ids?: Array<number>
	unitIds?: number[]
}

export type UpdateClassMap = {
	id: number
	updatePayload: Partial<{
		name: string
		description: string
		unitId: number
		graduatedAt: string
	}>
}[]
