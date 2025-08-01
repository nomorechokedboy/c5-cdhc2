import { Repository } from '.'
import { AppError } from '../errors'
import { Unit, UnitParams } from '../schema'
import unitRepo from './repo'

class controller {
	constructor(private readonly repo: Repository) {}

	create(params: UnitParams[]): Promise<UnitParams[]> {
		return this.repo.create(params).catch(AppError.handleAppErr)
	}

	find(): Promise<Unit[]> {
		return this.repo.find()
	}
}

const unitController = new controller(unitRepo)

export default unitController
