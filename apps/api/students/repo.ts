import { inArray, eq, sql, and, ne, between } from 'drizzle-orm'
import log from 'encore.dev/log'
import orm, { DrizzleDatabase } from '../database'
import { AppError } from '../errors/index'
import {
	Month,
	Quarter,
	Student,
	StudentDB,
	StudentParam,
	StudentQuery,
	students,
	UpdateStudentMap
} from '../schema/student'
import { handleDatabaseErr } from '../utils/index'
import { Repository } from './index'
import dayjs from 'dayjs'

type DateField = 'dob' | 'cpvOfficialAt'

type DateFieldInMonthParams = { month?: Month; field: DateField }

type DateFieldInQuarterParams = { quarter: Quarter; field: DateField }

class StudentSqliteRepo implements Repository {
	constructor(private db: DrizzleDatabase) {}

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

	private getDateField(field: DateField) {
		switch (field) {
			case 'cpvOfficialAt':
				return students.cpvOfficialAt
			case 'dob':
			default:
				return students.dob
		}
	}

	private dayFieldThisMonth({ field, month }: DateFieldInMonthParams) {
		const dateField = this.getDateField(field)
		const thisYear = dayjs().year()

		if (field === 'cpvOfficialAt') {
			if (month === undefined) {
				return sql`strftime('%Y-%m', ${dateField}) = strftime('%Y-%m', 'now')`
			}

			const value = `${thisYear}-${month}`
			return sql`strftime('%Y-%m', ${dateField}) = ${value}`
		}

		if (month === undefined) {
			return sql`strftime('%m', ${dateField}) = strftime('%m', 'now')`
		}

		return sql`strftime('%m', ${dateField}) = ${month}`
	}

	private dateFieldThisWeek(field: DateField) {
		const dateField = this.getDateField(field)
		return sql`date(strftime('%Y', 'now') || '-' || strftime('%m-%d', ${dateField})) 
        BETWEEN date('now', 'weekday 1', '-6 days') AND date('now', 'weekday 0')`
	}

	private dateFieldInQuarter({ quarter, field }: DateFieldInQuarterParams) {
		const dateField = this.getDateField(field)
		const thisYear = dayjs().year()
		let start = '01'
		let end = '03'

		switch (quarter) {
			case 'Q2':
				start = '04'
				end = '06'
				break
			case 'Q3':
				start = '07'
				end = '09'
				break
			case 'Q4':
				start = '10'
				end = '12'
				break
			case 'Q1':
			default:
				break
		}

		if (field === 'cpvOfficialAt') {
			return between(
				sql`strftime('%Y-%m', ${dateField})`,
				`${thisYear}-${start}`,
				`${thisYear}-${end}`
			)
		}

		return between(sql`strftime('%m', ${dateField})`, start, end)
	}

	async find(q: StudentQuery): Promise<Student[]> {
		log.info('StudentSqliteRepo.find params: ', { params: q })

		const whereConds = []

		const isClassIdExist = q.classIds !== undefined
		if (isClassIdExist) {
			whereConds.push(inArray(students.classId, q.classIds!))
		}

		const isPolicicalOrgExist = q.politicalOrg !== undefined
		if (isPolicicalOrgExist) {
			whereConds.push(eq(students.politicalOrg, q.politicalOrg!))
		}

		const isBirthdayInMonthExist = q.birthdayInMonth !== undefined
		const isBirthdayInWeekExist =
			q.birthdayInWeek !== undefined && q.birthdayInWeek === true
		const isBirthdayInQuarterExist = q.birthdayInQuarter !== undefined

		if (
			isBirthdayInMonthExist &&
			isBirthdayInWeekExist &&
			isBirthdayInQuarterExist
		) {
			throw AppError.invalidArgument(
				"birthdayInMonth, birthdayInQuarter and birthdayInWeek can't be sent together"
			)
		}

		if (isBirthdayInMonthExist) {
			whereConds.push(
				this.dayFieldThisMonth({
					month: q.birthdayInMonth,
					field: 'dob'
				})
			)
		}

		if (isBirthdayInQuarterExist) {
			whereConds.push(
				this.dateFieldInQuarter({
					quarter: q.birthdayInQuarter!,
					field: 'dob'
				})
			)
		}

		if (isBirthdayInWeekExist) {
			whereConds.push(this.dateFieldThisWeek('dob'))
		}

		const isCpvOfficialThisWeek =
			q.isCpvOfficialThisWeek !== undefined &&
			q.isCpvOfficialThisWeek === true
		const isCpvOfficialInMonthExist = q.cpvOfficialInMonth !== undefined
		const isCpvOfficialInQuarterExist = q.cpvOfficialInQuarter !== undefined

		if (isCpvOfficialThisWeek) {
			whereConds.push(this.dateFieldThisWeek('cpvOfficialAt'))
		}

		if (isCpvOfficialInMonthExist) {
			whereConds.push(
				this.dayFieldThisMonth({
					field: 'cpvOfficialAt',
					month: q.cpvOfficialInMonth
				})
			)
		}

		if (isCpvOfficialInQuarterExist) {
			whereConds.push(
				this.dateFieldInQuarter({
					field: 'cpvOfficialAt',
					quarter: q.cpvOfficialInQuarter!
				})
			)
		}

		const isIdsExist = q.ids !== undefined
		if (isIdsExist) {
			// Note: This condition now applies to student IDs since we're querying students directly
			// If you meant class IDs, you might want to use classIds instead
			whereConds.push(inArray(students.id, q.ids!))
		}

		const isEthnicMinority = q.isEthnicMinority !== undefined
		if (isEthnicMinority && q.isEthnicMinority === true) {
			whereConds.push(ne(students.ethnic, 'Kinh'))
		}

		const hasReligionExist = q.hasReligion !== undefined
		if (hasReligionExist && q.hasReligion) {
			whereConds.push(ne(students.religion, 'Không'))
		}

		const whereCondition =
			whereConds.length === 0 ? undefined : and(...whereConds)

		return this.db.query.students
			.findMany({
				where: whereCondition,
				with: {
					class: {
						with: { unit: true }
					}
				}
			})
			.catch(handleDatabaseErr) as unknown as Array<Student>
	}

	findOne(s: StudentDB): Promise<Student> {
		throw AppError.umimplemented('Method not implemented')
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
