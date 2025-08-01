import * as sqlite from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'
import { AppError } from '../errors'
import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm'

const UnitLevelEnum = sqlite.customType<{ data: string; driverData: string }>({
	dataType() {
		return 'text'
	},
	toDriver(val: string) {
		if (!['battalion', 'company'].includes(val)) {
			throw AppError.invalidArgument(
				'resourceType can only be classes | students'
			)
		}
		return val
	}
})

export const units = sqlite.sqliteTable(
	'units',
	{
		...baseSchema,

		alias: sqlite.text().unique().notNull(),
		name: sqlite.text().unique().notNull(),
		level: UnitLevelEnum('level')
			.$type<'battalion' | 'company'>()
			.notNull(),

		parentId: sqlite.int()
	},
	(t) => [
		sqlite.foreignKey({
			columns: [t.parentId],
			foreignColumns: [t.id],
			name: 'parent_id_fk'
		})
	]
)

export const unitsRelations = relations(units, ({ one, many }) => ({
	parent: one(units, {
		fields: [units.parentId],
		references: [units.id],
		relationName: 'parentChild'
	}),
	children: many(units, {
		relationName: 'parentChild'
	})
}))

export type UnitDB = InferSelectModel<typeof units>

export type UnitParams = InferInsertModel<typeof units>

type unit = Omit<UnitDB, 'parentId'>

export type Unit = unit & { parent?: Unit; children: Unit[] }
