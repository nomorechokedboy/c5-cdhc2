import { Client } from '@libsql/client'
import { inArray, eq, sql, and } from 'drizzle-orm'
import { LibSQLDatabase } from 'drizzle-orm/libsql'
import log from 'encore.dev/log'
import orm from '../database'
import { AppError } from '../errors/index'
import { classes } from '../schema/classes'
import {
	Month,
	Student,
	StudentDB,
	StudentParam,
	StudentQuery,
	students,
	UpdateStudentMap
} from '../schema/student'
import { handleDatabaseErr } from '../utils/index'
import { Repository } from './index'

class StudentSqliteRepo implements Repository {
	constructor(
		private db: LibSQLDatabase<Record<string, never>> & {
			$client: Client
		}
	) {}

	create(params: StudentParam[]): Promise<StudentDB[]> {
		log.info('StudentSqliteRepo.create params: ', { params })
		return this.db
			.insert(students)
			.values(params)
			.returning()
			.catch(handleDatabaseErr)
	}

	delete(s: StudentDB[]): Promise<StudentDB[]> {
		const ids = s.map((student) => student.id)
		log.info('StudentSqliteRepo.delete params: ', { params: ids })

		return this.db
			.delete(students)
			.where(inArray(students.id, ids))
			.returning()
			.catch(handleDatabaseErr)
	}

	private birthdayThisMonth(month?: Month) {
		if (month === undefined) {
			return sql`strftime('%m', ${students.dob}) = strftime('%m', 'now')`
		}

		return sql`strftime('%m', ${students.dob}) = ${month}`
	}

	private birthdayThisWeek() {
		return sql`date(strftime('%Y', 'now') || '-' || strftime('%m-%d', ${students.dob})) 
        BETWEEN date('now', 'weekday 1', '-6 days') AND date('now', 'weekday 0')`
	}

	find(q: StudentQuery): Promise<Student[]> {
		const baseQuery = this.db
			.select()
			.from(students)
			.leftJoin(classes, eq(classes.id, students.classId))
		log.info('StudentSqliteRepo.find params: ', { params: q })

		const whereConds = []
		const isClassIdExist = q.classId !== undefined
		if (isClassIdExist) {
			whereConds.push(eq(students.classId, q.classId!))
		}

		const isPolicicalOrgExist = q.politicalOrg !== undefined
		if (isPolicicalOrgExist) {
			whereConds.push(
				eq(students.politicalOrg, q.politicalOrg!)
			)
		}

		const isBirthdayInMonthExist = q.birthdayInMonth !== undefined
		const isBirthdayInWeekExist = q.birthdayInWeek !== undefined
		if (isBirthdayInMonthExist && isBirthdayInWeekExist) {
			throw AppError.invalidArgument(
				"birthdayInMonth and birthdayInWeek can't be sent together"
			)
		}

		if (isBirthdayInMonthExist) {
			whereConds.push(
				this.birthdayThisMonth(q.birthdayInMonth)
			)
		}

		if (isBirthdayInWeekExist && q.birthdayInWeek === true) {
			whereConds.push(this.birthdayThisWeek())
		}

		const isWhereCondEmpty = whereConds.length === 0
		if (!isWhereCondEmpty) {
			baseQuery.where(and(...whereConds))
		}

		return baseQuery
			.all()
			.then((resp) =>
				resp.map(
					({
						classes,
						students: {
							classId,
							...students
						}
					}) =>
						({
							...students,
							class: {
								description:
									classes?.description,
								id: classes?.id,
								name: classes?.name
							}
						}) as Student
				)
			)
			.catch(handleDatabaseErr)
	}

	findOne(s: StudentDB): Promise<Student> {
		throw new Error('Method not implemented')
	}

	update(params: UpdateStudentMap): Promise<StudentDB[]> {
		log.info('StudentSqliteRepo.update params: ', { params })

		return this.db
			.transaction(async (tx) => {
				const updatedRecords = []

				for (const { id, updatePayload } of params) {
					const updated = await tx
						.update(students)
						.set(updatePayload)
						.where(eq(students.id, id))
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

const studentRepo = new StudentSqliteRepo(orm)

export default studentRepo
