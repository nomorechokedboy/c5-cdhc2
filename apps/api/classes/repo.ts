import { and, count, eq, getTableColumns, inArray, SQL } from 'drizzle-orm'
import log from 'encore.dev/log'
import orm, { DrizzleDatabase } from '../database.js'
import {
	Class,
	ClassDB,
	classes,
	ClassParam,
	ClassQuery,
	UpdateClassMap
} from '../schema/classes.js'
import { students } from '../schema/student.js'
import { handleDatabaseErr } from '../utils/index'
import { Repository } from './index.js'
import { units } from '../schema/units.js'

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
				studentCount: count(students.classId),
				unit: {
					id: units.id,
					createdAt: units.createdAt,
					updatedAt: units.updatedAt,

					alias: units.alias,
					name: units.name,
					level: units.level,

					parentId: units.parentId
				}
			})
			.from(classes)
			.leftJoin(students, eq(classes.id, students.classId))
			.leftJoin(units, eq(classes.unitId, units.id))
			.groupBy(classes.id, units.id)
		log.info('ClassRepo.find query: ', { query: q })

		const whereConds: SQL[] = []
		const isIdsExist = q.ids !== undefined
		if (isIdsExist) {
			whereConds.push(inArray(classes.id, q.ids!))
		}

		const isUnitIdsExist = q.unitIds !== undefined
		if (isUnitIdsExist) {
			whereConds.push(inArray(classes.unitId, q.unitIds))
		}

		const isWhereCondEmpty = whereConds.length === 0
		if (!isWhereCondEmpty) {
			baseQuery.where(and(...whereConds))
		}

		return baseQuery.all().catch(handleDatabaseErr)
	}

	findOne(c: ClassDB): Promise<Class | undefined> {
		return this.db.query.classes
			.findFirst({
				where: eq(classes.id, c.id),
				with: { students: true, unit: true }
			})
			.catch(handleDatabaseErr)
	}

	update(params: UpdateClassMap): Promise<ClassDB[]> {
		log.info('ClassRepo.update params', { params })

		return this.db
			.transaction(async (tx) => {
				const updatedRecords = []

				for (const { id, updatePayload } of params) {
					const updated = await tx
						.update(classes)
						.set(updatePayload)
						.where(eq(classes.id, id))
						.returning()

					if (updated.length > 0) {
						updatedRecords.push(updated[0])
					}
				}

				return updatedRecords
			})
			.catch(handleDatabaseErr)
	}
}

const sqliteRepo = new SqliteRepo(orm)

export default sqliteRepo
