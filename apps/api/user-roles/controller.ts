import { Repository } from '.'
import { AssignRoleRequest } from '../schema'
import { AppError } from '../errors'
import userRolesRepo from './repo'
import log from 'encore.dev/log'

class Controller {
	constructor(private readonly repo: Repository) {}

	async assignRolesToUser(params: AssignRoleRequest): Promise<void> {
		log.trace('UserRolesController.assignRolesToUser params', { params })

		if (!params.userId) {
			throw AppError.invalidArgument('User ID is required')
		}

		if (!params.roleIds || params.roleIds.length === 0) {
			throw AppError.invalidArgument('At least one role ID is required')
		}

		await this.repo.assignRolesToUser(params).catch(AppError.handleAppErr)
	}
}

const userRolesController = new Controller(userRolesRepo)

export default userRolesController
