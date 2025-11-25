import log from 'encore.dev/log'
import { Repository } from '.'
import { AppError } from '../errors'
import {
	Unit,
	UnitLevel,
	UnitParams,
	UnitQuery,
	UnitDB as InteralUnitDB
} from '../schema'
import unitRepo from './repo'
import { GetUnitsQuery, UnitDB } from './units'

type findOneRequest = {
	id?: number
	alias: string
	name?: string
	level?: 'battalion' | 'company'

	parentId?: number | null
	validUnitIds: number[]
}
class controller {
	constructor(private readonly repo: Repository) {}

	async create(params: UnitParams[]): Promise<UnitParams[]> {
		log.trace('UnitController.create params', { params })

		const validParams: UnitParams[] = []
		for (const param of params) {
			const parent = await this.repo.getOne({ id: param.parentId! })
			const parentLevel = UnitLevel.fromName(parent!.level)
			const paramLevel = UnitLevel.fromName(param.level)
			if (UnitLevel.isEqual(parentLevel, paramLevel)) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						`parent level and unit level can't be the same. Parent level:${parent?.level} - Unit level: ${param.level}`
					)
				)
			}

			if (UnitLevel.isLargerThan(paramLevel, parentLevel)) {
				throw AppError.handleAppErr(
					AppError.invalidArgument(
						`unit level can't be higher than parent. Parent level: ${parent?.level} - Unit level: ${param.level}`
					)
				)
			}

			validParams.push(param)
		}

		const isValidParamsEmpty = validParams.length === 0
		if (isValidParamsEmpty) {
			throw AppError.handleAppErr(
				AppError.invalidArgument(`Empty request data`)
			)
		}

		return this.repo.create(validParams).catch(AppError.handleAppErr)
	}

	find(q: GetUnitsQuery, unitIds: number[]): Promise<Unit[]> {
		log.trace('UnitController.find params', { params: q })

		if (unitIds === undefined || unitIds.length === 0) {
			AppError.handleAppErr(AppError.invalidArgument('Validate unitIds'))
		}
		const unitId = unitIds[unitIds.length - 1]
		const unitQuery: UnitQuery = {
			ids: [unitId]
		}

		if (q.level !== undefined) {
			unitQuery.level = q.level
		}

		return this.repo.find(unitQuery)
	}
	findAll(): Promise<Unit[]> {
		return this.repo.findAll()
	}

	findById(id: number): Promise<Unit | undefined> {
		log.trace('UnitController.findById params', { params: { id } })

		return this.repo
			.findById(id, {
				with: { parent: true, children: true, classes: true }
			})
			.catch(AppError.handleAppErr)
	}

	async findOne({
		validUnitIds,
		...p
	}: findOneRequest): Promise<Unit | undefined> {
		const params = { ...p } as InteralUnitDB
		log.trace('UnitController.findOne params', {
			params,
			id: params.id,
			validUnitIds
		})

		const unit = await this.repo.getOne(params).catch(AppError.handleAppErr)
		if (unit === undefined) {
			AppError.handleAppErr(AppError.invalidArgument('Invalid unit'))
		}

		const isValidUnitId = validUnitIds.includes(unit.id)
		if (isValidUnitId === false) {
			AppError.handleAppErr(
				AppError.unauthorized(
					"You don't have permission to read those units"
				)
			)
		}
		return unit
	}
}

const unitController = new controller(unitRepo)

export default unitController
