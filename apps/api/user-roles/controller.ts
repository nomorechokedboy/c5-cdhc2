import { Repository } from '.'
import { AssignRoleRequest } from '../schema'
import { AppError } from '../errors'
import userRolesRepo from './repo'
import log from 'encore.dev/log'
import orm from '../database'
import { users } from '../schema/users'
import { eq } from 'drizzle-orm'

class Controller {
	constructor(private readonly repo: Repository) {}

	async assignRolesToUser(params: AssignRoleRequest): Promise<void> {
		log.trace('UserRolesController.assignRolesToUser params', { params })

		if (!params.userId) {
			throw AppError.invalidArgument('User ID is required')
		}

		// if (!params.roleIds || params.roleIds.length === 0) {
		// 	throw AppError.invalidArgument('At least one role ID is required')
		// }

		await this.repo.assignRolesToUser(params).catch(AppError.handleAppErr)

		// Có ít nhất một vai trò nghĩa là tài khoản đã được cấp quyền sử dụng.
		if (params.roleIds?.length) {
			await orm
				.update(users)
				.set({ status: 'approved' })
				.where(eq(users.id, params.userId))
				.catch(AppError.handleAppErr)
		}
	}

	async getRolesByUserId(userId: number): Promise<number[]> {
		if (!userId) {
			throw AppError.invalidArgument('User ID is required')
		}
		return this.repo.getRolesByUserId(userId)
	}
}

const userRolesController = new Controller(userRolesRepo)

export default userRolesController
