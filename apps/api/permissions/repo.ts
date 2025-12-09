import log from 'encore.dev/log'
import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import { CreatePermissionRequest, Permission, permissions } from '../schema'
import { handleDatabaseErr } from '../utils'
import { eq } from 'drizzle-orm'

class sqliteRepo implements Repository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreatePermissionRequest): Promise<Permission> {
		return this.db
			.insert(permissions)
			.values(params)
			.returning()
			.then((resp) => resp[0])
			.catch(handleDatabaseErr)
	}

	find(): Promise<Permission[]> {
		log.trace('PermissionRepo.find processing')
		return this.db.query.permissions
			.findMany({
				with: {
					action: true,
					resource: true,
					roles: { with: { role: true } }
				}
			})
			.then((resp) =>
				resp.map(({ roles, ...perm }) => ({
					...perm,
					roles: roles.map((role) => role.role)
				}))
			)
			.catch(handleDatabaseErr)
	}

	findOne(id: number): Promise<Permission | undefined> {
		log.trace('PermissionRepo.findOne params', { id })
		return this.db.query.permissions
			.findFirst({
				where: eq(permissions.id, id),
				with: {
					action: true,
					resource: true,
					roles: { with: { role: true } }
				}
			})
			.then((resp) => {
				if (resp === undefined) {
					return resp
				}

				const { roles, ...perm } = resp
				return { ...perm, roles: roles.map((role) => role.role) }
			})
			.catch(handleDatabaseErr)
	}
}

const permissionRepo = new sqliteRepo(orm)

export default permissionRepo
