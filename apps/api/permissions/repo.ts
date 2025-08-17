import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import { CreatePermissionRequest, Permission, permissions } from '../schema'
import { handleDatabaseErr } from '../utils'

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
		return this.db.query.permissions.findMany({
			with: { action: true, resource: true }
		})
	}
}

const permissionRepo = new sqliteRepo(orm)

export default permissionRepo
