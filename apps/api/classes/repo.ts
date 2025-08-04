import { and, count, eq, getTableColumns, inArray } from 'drizzle-orm'
import log from 'encore.dev/log'
import orm, { DrizzleDatabase } from '../database.js'
import {
	Class,
	ClassDB,
	classes,
	ClassParam,
	ClassQuery
} from '../schema/classes.js'
import { students } from '../schema/student.js'
import { handleDatabaseErr } from '../utils/index'
import { Repository } from './index.js'
import { AppError } from '../errors/index.js'

class SqliteRepo implements Repository {
	constructor(private readonly db: DrizzleDatabase) {}

	create(params: ClassParam[]): Promise<ClassDB[]> {
		log.info('ClassSqliteRepo.create params: ', { params })
		return this.db
			.insert(classes)
			.values(params)
			.returning()
			.catch(handleDatabaseErr)
	}

	delete(c: ClassDB[]): Promise<ClassDB[]> {
		const ids = c.map((cl) => cl.id)
		log.info('ClassSqliteRepo.delete params: ', { params: ids })

		return this.db
			.delete(classes)
			.where(inArray(classes.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	find(q: ClassQuery): Promise<Class[]> {
		const baseQuery = this.db
			.select({
				...getTableColumns(classes),
				studentCount: count(students.classId)
			})
			.from(classes)
			.leftJoin(students, eq(classes.id, students.classId))
			.groupBy(classes.id)
		log.info('ClassRepo.find query: ', { query: q })

		const whereConds = []
		const isIdsExist = q.ids !== undefined
		if (isIdsExist) {
			whereConds.push(inArray(classes.id, q.ids!))
		}

		const isWhereCondEmpty = whereConds.length === 0
		if (!isWhereCondEmpty) {
			baseQuery.where(and(...whereConds))
		}

		return baseQuery.all().catch(handleDatabaseErr)
	}

	findOne(_c: ClassDB): Promise<Class> {
		// return this.db.select().from(classes).where()
		throw AppError.umimplemented('Method not implemented.')
	}

	update(_params: ClassDB[]): Promise<ClassDB[]> {
		throw AppError.umimplemented('Method not implemented.')
	}
}

const sqliteRepo = new SqliteRepo(orm)

export default sqliteRepo
