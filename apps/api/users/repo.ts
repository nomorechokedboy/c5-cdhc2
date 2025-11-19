import log from 'encore.dev/log'
import { Repository } from '.'
import {
	CreateUserRequest,
	UserDB,
	User,
	UpdateUserRequest,
	users,
	permissions,
	resources,
	actions,
	userRoles,
	roles,
	rolePermissions,
	UserPermissions
} from '../schema'
import orm, { DrizzleDatabase } from '../database'
import { handleDatabaseErr } from '../utils'
import { eq, inArray } from 'drizzle-orm'

class sqliteRepo implements Repository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: Omit<CreateUserRequest, 'roleIds'>): Promise<UserDB> {
		log.info('UserRepo.create params', { params })
		return this.db
			.insert(users)
			.values(params)
			.returning()
			.then((resp) => resp[0])
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<UserDB[]> {
		log.info('UserRepo.delete params', { params: ids })

		return this.db
			.delete(users)
			.where(inArray(users.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	find(): Promise<User[]> {
		return this.db.query.users
			.findMany({
				with: {
					unit: true
				}
			})
			.catch(handleDatabaseErr)
	}

	findOne(user: Partial<UserDB>): Promise<User> {
		log.info('UserRepo.findOne params', { params: user })
		if (user.username !== undefined) {
			return this.db.query.users
				.findFirst({
					where: eq(users.username, user.username),
					with: { roles: true }
				})
				.catch(handleDatabaseErr)
		}

		return this.db.query.users
			.findFirst({
				where: eq(users.id, user.id),
				with: { roles: true }
			})
			.catch(handleDatabaseErr)
	}

	update({ id, ...params }: UpdateUserRequest): Promise<UserDB> {
		log.info('UserRepo.update params', { params, id })
		return this.db
			.transaction(async (tx) => {
				const [user] = await tx
					.update(users)
					.set(params)
					.where(eq(users.id, id))
					.returning()

				if (params.roleIds !== undefined && params.roleIds.length > 0) {
					await tx.delete(userRoles).where(eq(userRoles.userId, id))

					const userRoleData = params.roleIds.map((roleId) => ({
						roleId,
						userId: id
					}))
					await tx.insert(userRoles).values(userRoleData)
				}

				return user
			})
			.catch(handleDatabaseErr)
	}

	findUserPermissions(id: number): Promise<UserPermissions[]> {
		return this.db
			.select({
				permissionName: permissions.name,
				resourceName: resources.name,
				actionName: actions.name
			})
			.from(users)
			.innerJoin(userRoles, eq(users.id, userRoles.userId))
			.innerJoin(roles, eq(userRoles.roleId, roles.id))
			.innerJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
			.innerJoin(
				permissions,
				eq(rolePermissions.permissionId, permissions.id)
			)
			.innerJoin(resources, eq(permissions.resourceId, resources.id))
			.innerJoin(actions, eq(permissions.actionId, actions.id))
			.where(eq(users.id, id))
			.catch(handleDatabaseErr)
	}
}

const userRepo = new sqliteRepo(orm)

export default userRepo
