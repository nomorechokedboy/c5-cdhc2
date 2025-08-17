import { eq } from 'drizzle-orm'
import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import { AssignRoleRequest, userRoles } from '../schema'
import log from 'encore.dev/log'

class sqliteRepo implements Repository {
	constructor(private readonly db: DrizzleDatabase) {}

	assignRolesToUser(params: AssignRoleRequest): Promise<void> {
		log.info('UserRolesRepo.assignRolesToUser params', { params })

		return this.db.transaction(async (tx) => {
			// Remove existing roles
			await tx
				.delete(userRoles)
				.where(eq(userRoles.userId, params.userId))

			// Assign new roles
			if (params.roleIds.length > 0) {
				const userRoleData = params.roleIds.map((roleId) => ({
					userId: params.userId,
					roleId
				}))
				await tx.insert(userRoles).values(userRoleData)
			}
		})
	}
}

const userRolesRepo = new sqliteRepo(orm)

export default userRolesRepo
