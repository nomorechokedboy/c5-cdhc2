import log from 'encore.dev/log'
import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import { UnitParams, UnitDB, Unit, units, UnitQuery } from '../schema/units'
import { handleDatabaseErr } from '../utils'
import { eq, inArray } from 'drizzle-orm'

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
}

const unitRepo = new repo(orm)

export default unitRepo
