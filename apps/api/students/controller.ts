import { AppError } from '../errors'
import {
	StudentDB,
	StudentParam,
	Student,
	UpdateStudentMap,
	Month,
	Quarter,
	StudentCronJobEvent,
	BirthdayThisWeek,
	BirthdayThisMonth,
	CpvOfficialThisMonth,
	CpvOfficialThisQuarter,
	CpvOfficialThisWeek,
	BirthdayThisQuarter,
	StudentCronEvent
} from '../schema/student'
import { Repository } from './index'
import { Repository as UnitRepository } from '../units'
import studentRepo from './repo'
import { GetStudentsQuery } from './students'
import unitRepo from '../units/repo'
import log from 'encore.dev/log'
import dayjs from 'dayjs'
import quarterOfYear from 'dayjs/plugin/quarterOfYear.js'

dayjs.extend(quarterOfYear)

export class Controller {
	constructor(
		private readonly repo: Repository,
		private readonly unitRepo: UnitRepository
	) {}

	create(params: StudentParam[]): Promise<StudentDB[]> {
		return this.repo.create(params).catch(AppError.handleAppErr)
	}

	delete(students: StudentDB[]) {
		return this.repo.delete(students).catch(AppError.handleAppErr)
	}

	async find({
		unitAlias,
		unitLevel,
		classId,
		...q
	}: GetStudentsQuery): Promise<Student[]> {
		const isUnitAliasExist = unitAlias !== undefined
		const isUnitLevelExist = unitLevel !== undefined
		const isUnitQueryParamsValid = isUnitAliasExist && isUnitLevelExist

		if (
			(isUnitAliasExist && !isUnitLevelExist) ||
			(!isUnitAliasExist && isUnitLevelExist)
		) {
			throw AppError.invalidArgument('missing unitAlias or unitLevel')
		}

		if (isUnitQueryParamsValid) {
			const u = await this.unitRepo
				.findOne({ alias: unitAlias, level: unitLevel })
				.catch(AppError.handleAppErr)
			if (u === undefined) {
				throw AppError.handleAppErr(
					AppError.notFound(
						`unit with alias: ${unitAlias} and level: ${unitLevel} not found`
					)
				)
			}

			if (u.level === 'battalion') {
				const classIds = u.children
					.map((c) => c.classes.map((cl) => cl.id))
					.flat()
				log.trace('studentRepo.find battalion case classIds', {
					classIds,
					query: q
				})
				return this.repo
					.find({ ...q, classIds })
					.catch(AppError.handleAppErr)
			}

			if (u.level === 'company') {
				const classIds = u.classes.map((c) => c.id)
				log.trace('studentRepo.find company case classIds', {
					classIds,
					query: q
				})
				return this.repo
					.find({ ...q, classIds })
					.catch(AppError.handleAppErr)
			}
		}

		const classIds = classId ? [classId] : undefined
		return this.repo.find({ ...q, classIds }).catch(AppError.handleAppErr)
	}

	async update(params: StudentDB[]): Promise<StudentDB[]> {
		const ids = params.map((s) => s.id)
		const isIdsEmpty = ids.length === 0
		const isIdsValid = !ids || isIdsEmpty
		if (isIdsValid) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('No record IDs provided')
			)
		}

		const updateMap: UpdateStudentMap = params.map(
			({ id, ...updatePayload }) => {
				const cleanupPayload = Object.fromEntries(
					Object.entries(updatePayload).filter(
						([_, value]) => value !== undefined
					)
				)

				const isUpdatePayloadEmpty =
					Object.keys(cleanupPayload).length === 0
				if (isUpdatePayloadEmpty) {
					throw AppError.handleAppErr(
						AppError.invalidArgument(
							`No update data provided At least one field must be provided to update record with id: ${id}`
						)
					)
				}

				return { id, updatePayload: cleanupPayload }
			}
		)

		return this.repo.update(updateMap).catch(AppError.handleAppErr)
	}

	getStudentsByCronEvent(params: {
		event: StudentCronEvent
	}): Promise<Array<Student>> {
		let cronEvent: StudentCronJobEvent
		const thisMonth = dayjs().format('MM') as Month
		const thisQuarter = `Q${dayjs().quarter()}` as Quarter

		switch (params.event) {
			case 'birthdayThisWeek':
				cronEvent = new BirthdayThisWeek()
				break
			case 'birthdayThisMonth':
				cronEvent = new BirthdayThisMonth(thisMonth)
				break
			case 'birthdayThisQuarter':
				cronEvent = new BirthdayThisQuarter(thisQuarter)
				break
			case 'cpvOfficialThisWeek':
				cronEvent = new CpvOfficialThisWeek()
				break
			case 'cpvOfficialThisMonth':
				cronEvent = new CpvOfficialThisMonth(thisMonth)
				break
			case 'cpvOfficialThisQuarter':
				cronEvent = new CpvOfficialThisQuarter(thisQuarter)
				break
			default:
				throw AppError.handleAppErr(
					AppError.invalidArgument(`Invalid event: ${params.event}`)
				)
		}

		return this.repo.find(cronEvent.getQueryParams())
	}
}

const studentController = new Controller(studentRepo, unitRepo)

export default studentController
