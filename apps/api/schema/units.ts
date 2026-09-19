import * as sqlite from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'
import { AppError } from '../errors'
import { InferInsertModel, InferSelectModel, relations } from 'drizzle-orm'
import { users } from './users'
import { students } from './student'

export class UnitLevel {
	static readonly BATTALION = new UnitLevel(0, 'battalion')
	static readonly COMPANY = new UnitLevel(1, 'company')
	static readonly CLASS = new UnitLevel(2, 'class')

	private static readonly values = [
		UnitLevel.BATTALION,
		UnitLevel.COMPANY,
		UnitLevel.CLASS
	]

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

const UnitStatusEnum = sqlite.customType<{
	data: 'ongoing' | 'graduated'
	driverData: string
}>({
	dataType() {
		return 'text'
	},
	toDriver(val) {
		if (!['ongoing', 'graduated'].includes(val)) {
			throw AppError.invalidArgument(
				'status can be only ongoing | graduated'
			)
		}
		return val
	}
})

export type UnitLevelName = 'battalion' | 'company' | 'class'

export const units = sqlite.sqliteTable(
	'units',
	{
		...baseSchema,

		alias: sqlite.text().notNull(),
		name: sqlite.text().notNull(),
		level: UnitLevelEnum('level').$type<UnitLevelName>().notNull(),

		parentId: sqlite.int(),

		// Chỉ dùng cho đơn vị cấp lớp (level = 'class')
		description: sqlite.text(),
		graduatedAt: sqlite.text(),
		status: UnitStatusEnum('status')
	},
	(t) => [
		sqlite.foreignKey({
			columns: [t.parentId],
			foreignColumns: [t.id],
			name: 'parent_id_fk'
		}),
		sqlite.index('units_alias_idx').on(t.alias),
		sqlite.index('units_parent_id_idx').on(t.parentId)
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
	students: many(students),
	commanders: many(users)
}))

export type UnitDB = InferSelectModel<typeof units>

export type UnitParams = InferInsertModel<typeof units>

export type Unit = UnitDB & {
	parent?: Unit | null
	children: Unit[]
	studentCount?: number
}

export type UnitQuery = {
	ids?: number[]
	level?: UnitLevelName
	parentId?: number
	alias?: string
	/** LIKE trên name và alias */
	search?: string
	limit?: number
	offset?: number
	/** Gắn `studentCount` (số học viên trực tiếp) vào từng đơn vị */
	withStudentCount?: boolean
	/** Mặc định: parent + children (kèm children của children) */
	with?: {
		parent?: boolean
		children?: boolean
		grandchildren?: boolean
	}
}
