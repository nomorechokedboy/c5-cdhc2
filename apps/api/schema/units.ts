import * as sqlite from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'
import { AppError } from '../errors'
import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm'
import { Class, classes } from './classes'

export class UnitLevel {
	static readonly BATTALION = new UnitLevel(0, 'battalion')
	static readonly COMPANY = new UnitLevel(1, 'company')

	private static readonly values = [UnitLevel.BATTALION, UnitLevel.COMPANY]

	private constructor(
		public readonly value: number,
		public readonly name: string
	) {}

	static fromValue(value: number): UnitLevel {
		const level = this.values.find((l) => l.value === value)
		if (!level) {
			throw AppError.invalidArgument(`Invalid unit level value: ${value}`)
		}
		return level
	}

	static fromName(name: string): UnitLevel {
		const level = this.values.find((l) => l.name === name)
		if (!level) {
			throw AppError.invalidArgument(`Invalid unit level name: ${name}`)
		}
		return level
	}

	static isLargerThan(a: UnitLevel, b: UnitLevel): boolean {
		return a.value < b.value
	}

	static isEqual(a: UnitLevel, b: UnitLevel): boolean {
		return a.value === b.value
	}

	toString(): string {
		return this.name
	}
}

const UnitLevelEnum = sqlite.customType<{
	data: string
	driverData: number
}>({
	dataType() {
		return 'integer'
	},
	toDriver(val: string): number {
		return UnitLevel.fromName(val).value
	},
	fromDriver(val: number): string {
		return UnitLevel.fromValue(val).name
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
	}),
	classes: many(classes)
}))

export type UnitDB = InferSelectModel<typeof units>

export type UnitParams = InferInsertModel<typeof units>

type unit = Omit<UnitDB, 'parentId'>

export type Unit = unit & { parent?: Unit; children: Unit[]; classes: Class[] }

export type UnitQuery = {
	level?: 'battalion' | 'company'
	ids?: number[]
}
