import { eq, inArray } from 'drizzle-orm'
import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import {
	CreateRoleRequest,
	RoleDB,
	Role,
	UpdateRoleRequest,
	roles,
	rolePermissions
} from '../schema'
import { handleDatabaseErr } from '../utils'
import log from 'encore.dev/log'

class sqliteRepo implements Repository {
	constructor(private readonly db: DrizzleDatabase) {}

	async create(params: CreateRoleRequest): Promise<RoleDB> {
		log.info('RoleRepo.create params', { params })
		return this.db
			.transaction(async (tx) => {
				const [role] = await tx
					.insert(roles)
					.values({
						name: params.name,
						description: params.description
					})
					.returning()

				if (params.permissionIds && params.permissionIds.length > 0) {
					const rolePermissionData = params.permissionIds.map(
						(permissionId) => ({
							roleId: role.id,
							permissionId
						})
					)
					await tx.insert(rolePermissions).values(rolePermissionData)
				}

				return role
			})
			.catch(handleDatabaseErr)
	}

	delete(ids: number[]): Promise<RoleDB[]> {
		log.info('RoleRepo.delete params', { params: ids })
		return this.db
			.delete(roles)
			.where(inArray(roles.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	find(): Promise<Role[]> {
		return this.db.query.roles
			.findMany({ with: { users: true } })
			.catch(handleDatabaseErr)
	}

	findOne(id: number): Promise<Role | undefined> {
		log.info('RoleRepo.findOne params', { params: id })
		return this.db.query.roles
			.findFirst({ where: eq(roles.id, id), with: { users: true } })
			.catch(handleDatabaseErr)
	}

	async update(params: UpdateRoleRequest): Promise<RoleDB> {
		log.info('RoleRepo.update params', { params })
		return this.db
			.transaction(async (tx) => {
				const [role] = await tx
					.update(roles)
					.set({ name: params.name, description: params.description })
					.where(eq(roles.id, params.id))
					.returning()

				if (params.permissionIds && params.permissionIds?.length > 0) {
					// Remove existing permissions
					await tx
						.delete(rolePermissions)
						.where(eq(rolePermissions.roleId, params.id))

					// Add new permissions
					const rolePermissionData = params.permissionIds.map(
						(permissionId) => ({
							roleId: params.id,
							permissionId
						})
					)
					await tx.insert(rolePermissions).values(rolePermissionData)
				}

				return role
			})
			.catch(handleDatabaseErr)
	}
}

const roleRepo = new sqliteRepo(orm)

export default roleRepo
