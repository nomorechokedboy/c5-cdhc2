import log from 'encore.dev/log'
import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import { UnitParams, UnitDB, Unit, units, UnitQuery } from '../schema/units'
import { handleDatabaseErr } from '../utils'
import { and, eq, inArray } from 'drizzle-orm'

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

	async find(query: UnitQuery): Promise<Unit[]> {
		const baseQuery = this.db.query.units
		switch (query.level) {
			case 'battalion':
				return baseQuery
					.findMany({
						where: eq(units.level, 'battalion'),
						with: {
							children: { with: { classes: true } }
						}
					})
					.catch(handleDatabaseErr) as unknown as Array<Unit>
			case 'company':
				return baseQuery
					.findMany({
						where: eq(units.level, 'company'),
						with: {
							classes: true
						}
					})
					.catch(handleDatabaseErr) as unknown as Array<Unit>
			default:
				return []
		}
	}

	async findOne(params: {
		alias: string
		level: 'battalion' | 'company'
	}): Promise<Unit | undefined> {
		const baseQuery = this.db.query.units

		switch (params.level) {
			case 'battalion':
				return baseQuery
					.findFirst({
						where: and(
							eq(units.alias, params.alias),
							eq(units.level, params.level)
						),
						with: {
							children: { with: { classes: true } }
						}
					})
					.catch(handleDatabaseErr) as unknown as Unit

			case 'company':
				return baseQuery
					.findFirst({
						where: and(
							eq(units.alias, params.alias),
							eq(units.level, params.level)
						),
						with: {
							classes: true
						}
					})
					.catch(handleDatabaseErr) as unknown as Unit

			default:
				return undefined
		}
	}

	findByIds(ids: number[]): Promise<UnitDB[]> {
		return this.db.query.units
			.findMany({ where: inArray(units.id, ids) })
			.catch(handleDatabaseErr)
	}

	findById(
		id: number,
		opts?: {
			with: { children?: boolean; classes?: boolean; parent?: boolean }
		}
	): Promise<UnitDB | undefined> {
		const withClause: Record<string, boolean> = {}

		if (opts?.with?.children) {
			withClause.children = true
		}

		if (opts?.with?.classes) {
			withClause.classes = true
		}

		if (opts?.with?.parent) {
			withClause.parent = true
		}

		return this.db.query.units
			.findFirst({
				where: eq(units.id, id),
				with: withClause
			})
			.catch(handleDatabaseErr)
	}

	getOne(params: Partial<Unit>): Promise<Unit | undefined> {
		// Check if params is empty or has no valid fields
		if (!params || Object.keys(params).length === 0) {
			throw new Error(
				'Invalid parameters: at least one field must be provided'
			)
		}

		// Dynamically build where conditions based on provided fields
		const conditions = Object.entries(params)
			.filter(([_, value]) => value !== undefined && value !== null)
			.map(([key, value]) => eq(units[key as keyof typeof units], value))

		// If no valid conditions were built, throw error
		if (conditions.length === 0) {
			throw new Error('Invalid parameters: no valid fields provided')
		}

		const baseQuery = this.db.query.units

		return baseQuery
			.findFirst({
				where:
					conditions.length === 1 ? conditions[0] : and(...conditions)
			})
			.catch(handleDatabaseErr)
	}
}

const unitRepo = new repo(orm)

export default unitRepo
