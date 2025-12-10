import { Repository } from '.'
import actionRepo from './repo'
import { AppError } from '../errors'

class controller {
	constructor(private readonly repo: Repository) {}

	async find() {
		return this.repo.find().catch(AppError.handleAppErr)
	}

	async findOne(id: number) {
		const action = await this.repo.findOne(id).catch(AppError.handleAppErr)

		if (action === undefined) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Action not found')
			)
		}

		return action
	}
}

const actionController = new controller(actionRepo)

export default actionController
