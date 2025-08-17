import log from 'encore.dev/log'
import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import {
	CreateResourceRequest,
	Resource,
	ResourceDB,
	resources
} from '../schema'
import { handleDatabaseErr } from '../utils'
import { eq } from 'drizzle-orm'

class sqliteRepo implements Repository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateResourceRequest): Promise<ResourceDB> {
		log.info('ResourceRepo.create params', { params })
		return this.db
			.insert(resources)
			.values(params)
			.returning()
			.then(([resp]) => resp)
			.catch(handleDatabaseErr)
	}

	find(): Promise<Resource[]> {
		return this.db.query.resources
			.findMany({ with: { permissions: true } })
			.catch(handleDatabaseErr)
	}

	findOne(id: number): Promise<Resource | undefined> {
		return this.db.query.resources
			.findFirst({
				where: eq(resources.id, id)
			})
			.catch(handleDatabaseErr)
	}
}

const resourceRepo = new sqliteRepo(orm)

export default resourceRepo
