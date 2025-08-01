import { Repository } from '.'
import { AppError } from '../errors'
import { Unit, UnitParams, UnitQuery } from '../schema'
import unitRepo from './repo'
import { GetUnitsQuery } from './units'

class controller {
	constructor(private readonly repo: Repository) {}

	create(params: UnitParams[]): Promise<UnitParams[]> {
		return this.repo.create(params).catch(AppError.handleAppErr)
	}

	find(q: GetUnitsQuery): Promise<Unit[]> {
		const unitQuery: UnitQuery = { level: q.level }

		return this.repo.find(unitQuery)
	}
}

const unitController = new controller(unitRepo)

export default unitController
