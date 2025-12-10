import { Repository } from '.'
import resourceRepo from './repo'
import { AppError } from '../errors'

class controller {
	constructor(private readonly repo: Repository) {}

	async find() {
		return this.repo.find().catch(AppError.handleAppErr)
	}

	async findOne(id: number) {
		const resource = await this.repo
			.findOne(id)
			.catch(AppError.handleAppErr)

		if (resource === undefined) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Resource not found')
			)
		}

		return resource
	}
}

const resourceController = new controller(resourceRepo)

export default resourceController
