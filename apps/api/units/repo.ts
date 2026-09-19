import log from 'encore.dev/log'
import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import { UnitParams, UnitDB, Unit, units, UnitQuery } from '../schema/units'
import { students } from '../schema/student'
import { handleDatabaseErr } from '../utils'
import {
	and,
	asc,
	count,
	eq,
	inArray,
	isNull,
	like,
	or,
	SQL,
	sql
} from 'drizzle-orm'

class repo implements Repository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: UnitParams[]): Promise<UnitDB[]> {
		log.info('UnitRepo.create params: ', { params })
		return this.db
			.insert(units)
			.values(params)
			.returning()
			.catch(handleDatabaseErr)
	}

	delete(u: UnitDB[]): Promise<UnitDB[]> {
		const ids = u.map((unit) => unit.id)
		log.trace('UnitRepo.delete params: ', { params: ids })

		return this.db
			.delete(units)
			.where(inArray(units.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	update(id: number, params: Partial<UnitParams>): Promise<UnitDB[]> {
		return this.db
			.update(units)
			.set(params)
			.where(eq(units.id, id))
			.returning()
			.catch(handleDatabaseErr)
	}

	async find(query: UnitQuery = {}): Promise<Unit[]> {
		const conditions: SQL[] = []

		if (query.level !== undefined) {
			conditions.push(eq(units.level, query.level))
		}

		if (query.ids !== undefined) {
			// ids rỗng => không khớp đơn vị nào
			conditions.push(
				query.ids.length > 0 ? inArray(units.id, query.ids) : sql`1 = 0`
			)
		}

		if (query.parentId !== undefined) {
			conditions.push(eq(units.parentId, query.parentId))
		}

		if (query.alias !== undefined) {
			conditions.push(eq(units.alias, query.alias))
		}

		const search = query.search?.trim()
		if (search) {
			const pattern = `%${search}%`
			conditions.push(
				or(like(units.name, pattern), like(units.alias, pattern))!
			)
		}

		const rows = (await this.db.query.units
			.findMany({
				where: conditions.length > 0 ? and(...conditions) : undefined,
				with: this.buildWith(query.with),
				orderBy: asc(units.id),
				// SQLite không cho OFFSET nếu thiếu LIMIT
				limit:
					query.limit ??
					(query.offset !== undefined ? -1 : undefined),
				offset: query.offset
			})
			.catch(handleDatabaseErr)) as unknown as Unit[]

		if (!query.withStudentCount || rows.length === 0) return rows

		const counts = await this.db
			.select({ unitId: students.unitId, total: count() })
			.from(students)
			.where(
				inArray(
					students.unitId,
					rows.map((u) => u.id)
				)
			)
			.groupBy(students.unitId)
			.catch(handleDatabaseErr)
		const byUnit = new Map(counts.map((c) => [c.unitId, c.total]))

		return rows.map((u) => ({ ...u, studentCount: byUnit.get(u.id) ?? 0 }))
	}

	findOne(params: Partial<UnitDB>): Promise<Unit | undefined> {
		const conditions = Object.entries(params)
			.filter(([, value]) => value !== undefined)
			.map(([key, value]) => {
				const column = units[key as keyof UnitDB]
				return value === null ? isNull(column) : eq(column, value)
			})

		if (conditions.length === 0) {
			throw new Error(
				'Invalid parameters: at least one field must be provided'
			)
		}

		return this.db.query.units
			.findFirst({
				where: and(...conditions),
				with: this.buildWith()
			})
			.catch(handleDatabaseErr) as unknown as Promise<Unit | undefined>
	}

	private buildWith(opts: UnitQuery['with'] = {}) {
		const { parent = true, children = true, grandchildren = true } = opts

		return {
			...(parent && { parent: true as const }),
			...(children && {
				children: grandchildren
					? { with: { children: true as const } }
					: (true as const)
			})
		}
	}
}

const unitRepo = new repo(orm)

export default unitRepo
