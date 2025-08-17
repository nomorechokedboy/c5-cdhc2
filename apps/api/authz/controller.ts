import log from 'encore.dev/log'
import { PermissionCheck, PermissionResult } from '../schema'
import { Repository as UserRepository } from '../users'
import { AppError } from '../errors'
import userRepo from '../users/repo'

class controller {
	constructor(private readonly userRepo: UserRepository) {}

	async checkPermissions(params: PermissionCheck): Promise<PermissionResult> {
		log.trace('AuthzController.checkPermissions params', { params })
		const { userId, action, resource } = params

		try {
			const userPermissions = await this.userRepo
				.findUserPermissions(userId)
				.catch(AppError.handleAppErr)
			const requiredPermission = `${resource}:${action}`
			const hasPermission = userPermissions.some(
				(p) => p.permissionName === requiredPermission
			)

			return {
				allowed: hasPermission,
				reason: hasPermission
					? undefined
					: `Missing permission: ${requiredPermission}`
			}
		} catch (err) {
			log.error('AuthzController.checkPermissions error', { err })
			return {
				allowed: false,
				reason: `Error checking permission: ${err instanceof Error ? err.message : 'Unknown error'}`
			}
		}
	}

	async getUserPermissions(userId: number): Promise<string[]> {
		const userPermissions = await this.userRepo
			.findUserPermissions(userId)
			.catch(AppError.handleAppErr)

		return userPermissions.map((p) => p.permissionName)
	}
}

const authzController = new controller(userRepo)

export default authzController
