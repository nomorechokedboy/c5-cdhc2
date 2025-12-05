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

	async create(
		classParams: ClassParam[],
		validUnitIds: number[]
	): Promise<ClassDB[]> {
		log.trace('classController.create params', { classParam: classParams })

		const unitIds = classParams.map((p) => p.unitId)
		const checkUnitIds = unitIds.every((a) => validUnitIds.includes(a))
		if (checkUnitIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission create class in this unit"
				)
			)
		}

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

	delete(classes: ClassDB[], validClassIds: number[]) {
		log.trace('classController.delete params', {
			params: classes,
			validClassIds
		})
		const checkClassIds = classes.every((c) => validClassIds.includes(c.id))
		if (checkClassIds === false) {
			throw AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission delete class with this classId"
				)
			)
		}

		return this.repo.delete(classes).catch(AppError.handleAppErr)
	}

	findByIds(ids: number[]): Promise<ClassDB[]> {
		log.trace('classController.findByIds ids', { ids })

		return this.repo.findByIds(ids).catch(AppError.handleAppErr)
	}

	find(params: ClassQuery, validClassIds: number[]): Promise<ClassDB[]> {
		log.trace('classController.find params', { params, validClassIds })
		const isValidRequest = params.ids?.every((id) =>
			validClassIds.includes(id)
		)
		if (isValidRequest === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission to read one of those classes"
				)
			)
		}

		return this.repo.find(params).catch(AppError.handleAppErr)
	}

	async update(
		params: ClassDB[],
		{
			validClassIds,
			validUnitIds
		}: { validUnitIds: number[]; validClassIds: number[] }
	): Promise<ClassDB[]> {
		log.trace('classController.update params', {
			params,
			validClassIds,
			validUnitIds
		})

		const ids = params.map((s) => s.id),
			isIdsEmpty = ids.length === 0,
			isValidClassIds = ids.every((id) => validClassIds.includes(id)),
			isValidParams = params.every((param) =>
				validUnitIds.includes(param.unitId)
			)
		const isValidRequest = isValidClassIds && isValidParams
		if (isValidRequest === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					'You are not authorized update this unitid'
				)
			)
		}

		const isInvalidIds = isIdsEmpty === true
		if (isInvalidIds) {
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
		const isClassId = classIds.includes(id)
		if (isClassId === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission to read those class"
				)
			)
		}

		const classData = await this.repo
			.findOne({ id } as ClassDB)
			.catch(AppError.handleAppErr)
		if (classData === undefined) {
			AppError.handleAppErr(AppError.invalidArgument('Validate classId'))
		}
		return classData
	}
}

const classController = new Controller(sqliteRepo, unitRepo)

export default classController
