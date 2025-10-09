import { AppError } from '../errors/index'
import {
	Class,
	ClassDB,
	ClassParam,
	ClassQuery,
	UpdateClassMap
} from '../schema/classes'
import { Repository } from './index'
import { Repository as UnitRepository } from '../units'
import sqliteRepo from './repo'
import log from 'encore.dev/log'
import unitRepo from '../units/repo'

class Controller {
	constructor(
		private readonly repo: Repository,
		private readonly unitRepo: UnitRepository
	) {}

	async create(classParams: ClassParam[]): Promise<ClassDB[]> {
		log.trace('classController.create params', { classParam: classParams })

		const unitIds = classParams.map((p) => p.unitId)
		const units = await this.unitRepo.findByIds(unitIds)
		const isNotfoundUnit = units.length !== unitIds.length
		if (isNotfoundUnit) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('There are invalid unit ids')
			)
		}

		const isBattalionUnitExist = units.some(
			(unit) => unit.level === 'battalion'
		)
		if (isBattalionUnitExist) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(
					'There are invalid unit. Class unit must be company'
				)
			)
		}

		return this.repo.create(classParams).catch(AppError.handleAppErr)
	}

	delete(classes: ClassDB[]) {
		log.trace('classController.delete params', { params: classes })

		return this.repo.delete(classes).catch(AppError.handleAppErr)
	}

	find(params: ClassQuery): Promise<ClassDB[]> {
		log.trace('classController.find params', { params })

		return this.repo.find(params).catch(AppError.handleAppErr)
	}

	async update(params: ClassDB[]): Promise<ClassDB[]> {
		log.trace('classController.update params', { params })

		const ids = params.map((s) => s.id)
		const isIdsEmpty = ids.length === 0
		const isIdsValid = !ids || isIdsEmpty
		if (isIdsValid) {
			throw AppError.handleAppErr(
				AppError.invalidArgument('No record IDs provided')
			)
		}

		const updateMap: UpdateClassMap = params.map(
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

	async findOne(id: number, classIds: number[]): Promise<Class | undefined> {
		log.trace('classController.findOne params', { params: { id } })
		const classData = await this.repo
			.findOne({ id } as ClassDB)
			.catch(AppError.handleAppErr)
		if (classData === undefined) {
			AppError.handleAppErr(AppError.invalidArgument('Validate classId'))
		}
		const isClassId = classIds.includes(id)
		if (isClassId === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission to read those class"
				)
			)
		}
		return classData
	}
}

const classController = new Controller(sqliteRepo, unitRepo)

export default classController
