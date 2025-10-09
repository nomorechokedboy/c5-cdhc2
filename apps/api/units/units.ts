import { api, Query } from 'encore.dev/api'
import { UnitParams } from '../schema'
import unitController from './controller'
import { ClassResponse } from '../classes/classes'
import { getAuthData } from '~encore/auth'
import { AppError } from '../errors'
import { validate } from 'uuid'

type UnitBody = {
	alias: string
	name: string
	level: 'battalion' | 'company'

	parentId?: number | null
}

export type UnitDB = UnitBody & {
	id: number
	createdAt: string
	updatedAt: string
}

interface CreateUnitRequest {
	data: Array<UnitBody>
}

interface CreateUnitResponse {
	data: Array<UnitDB>
}

export const CreateUnit = api(
	{ expose: false, method: 'POST', path: '/units' },
	async (body: CreateUnitRequest): Promise<CreateUnitResponse> => {
		const unitParams: Array<UnitParams> = body.data.map((u) => ({
			...u
		}))

		const createdUnits = await unitController.create(unitParams)

		const resp = createdUnits.map((u) => ({ ...u }) as UnitDB)

		return { data: resp }
	}
)

type unit = Omit<UnitDB, 'parentId'>

export type Unit = unit & {
	parent: unit | null
	children: Unit[]
	classes: ClassResponse[]
}

export interface GetUnitsQuery {
	level?: 'battalion' | 'company'
}

interface GetUnitsResponse {
	data: Array<Unit>
}

export const GetUnits = api(
	{ auth: true, expose: true, method: 'GET', path: '/units' },
	async (q: GetUnitsQuery): Promise<GetUnitsResponse> => {
		const unitIds = getAuthData()!.validUnitIds
		const resp = await unitController.find(q, unitIds)
		const data = resp.map((u) => ({ ...u }) as Unit)

		return { data }
	}
)

interface GetUnitRequest {
	id?: Query<number>

	alias: string
	name?: Query<string>
	level?: Query<'battalion' | 'company'>

	parentId?: Query<number> | null
}

interface GetUnitResponse {
	data: Unit | undefined
}

export const GetUnit = api(
	{ auth: true, expose: true, method: 'GET', path: '/units/:alias' },
	async ({ level, ...params }: GetUnitRequest): Promise<GetUnitResponse> => {
		const validUnitIds = getAuthData()!.validUnitIds!
		const data = await unitController
			.findOne({
				...params,
				level: level as 'battalion' | 'company' | undefined,
				validUnitIds
			})
			.then((resp) => (resp === undefined ? resp : ({ ...resp } as Unit)))
		return { data }
	}
)
