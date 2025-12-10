import { Repository } from '.'
import { Repository as ActionRepository } from '../actions'
import actionRepo from '../actions/repo'
import { AppError } from '../errors'
import { Repository as ResourceRepository } from '../resources'
import resourceRepo from '../resources/repo'
import { Permission } from '../schema'
import permissionRepo from './repo'

class controller {
	constructor(
		private readonly repo: Repository,
		private readonly actionRepo: ActionRepository,
		private readonly resourceRepo: ResourceRepository
	) {}

	async create({
		actionId,
		resourceId
	}: {
		resourceId: number
		actionId: number
	}) {
		const action = await this.actionRepo
			.findOne(actionId)
			.catch(AppError.handleAppErr)
		const resource = await this.resourceRepo
			.findOne(resourceId)
			.catch(AppError.handleAppErr)

		if (action === undefined || resource === undefined) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('Invalid action/resource id')
			)
		}

		const permissionName = `${resource.name}:${action.name}`
		const displayName = `${action.displayName} ${resource.displayName}`

		const permissionParams = {
			resourceId,
			actionId,
			name: permissionName,
			displayName,
			description: `Quyền để ${action.name} ${resource.name}`
		}
		return this.repo.create(permissionParams).catch(AppError.handleAppErr)
	}

	find(): Promise<Permission[]> {
		return this.repo.find().catch(AppError.handleAppErr)
	}

	findOne(id: number): Promise<Permission | undefined> {
		return this.repo.findOne(id).catch(AppError.handleAppErr)
	}
}

const permissionController = new controller(
	permissionRepo,
	actionRepo,
	resourceRepo
)

export default permissionController
