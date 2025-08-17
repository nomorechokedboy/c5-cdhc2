import log from 'encore.dev/log'
import { Repository } from '.'
import orm, { DrizzleDatabase } from '../database'
import { CreateActionRequest, Action, actions } from '../schema/actions'
import { handleDatabaseErr } from '../utils'
import { eq } from 'drizzle-orm'

class sqliteRepo implements Repository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: CreateActionRequest): Promise<Action> {
		log.info('ActionRepo.create params', { params })
		return this.db
			.insert(actions)
			.values(params)
			.returning()
			.then((resp) => resp[0])
			.catch(handleDatabaseErr)
	}

	find(): Promise<Array<Action>> {
		return this.db.query.actions.findMany().catch(handleDatabaseErr)
	}

	findOne(id: number): Promise<Action> {
		return this.db.query.actions
			.findFirst({ where: eq(actions.id, id) })
			.catch(handleDatabaseErr)
	}
}

const actionRepo = new sqliteRepo(orm)

export default actionRepo
