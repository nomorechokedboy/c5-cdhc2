import { api } from 'encore.dev/api'
import { UnitParams } from '../schema'
import unitController from './controller'
import { ClassResponse } from '../classes/classes'

type UnitBody = {
	alias: string
	name: string
	level: 'battalion' | 'company'

	parentId?: number | null
}

type UnitDB = UnitBody & { id: number; createdAt: string; updatedAt: string }

interface CreateUnitRequest {
	data: Array<UnitBody>
}

interface CreateUnitResponse {
	data: Array<UnitDB>
}

export const CreateUnit = api(
	{ expose: true, method: 'POST', path: '/units' },
	async (body: CreateUnitRequest): Promise<CreateUnitResponse> => {
		const unitParams: Array<UnitParams> = body.data.map((u) => ({
			...u
		}))

		const createdUnits = await unitController.create(unitParams)

		const resp = createdUnits.map((u) => ({ ...u }) as UnitDB)

		return { data: resp }
	}
)

type unit = Omit<UnitBody, 'parentId'>

type Unit = unit & {
	parent: unit | null
	children: Unit[]
	classes: ClassResponse[]
}

interface GetUnitsResponse {
	data: Array<Unit>
}

export const GetUnits = api(
	{ expose: true, method: 'GET', path: '/units' },
	async (): Promise<GetUnitsResponse> => {
		const resp = await unitController.find()
		const data = resp.map((u) => ({ ...u }) as Unit)

		return { data }
	}
)
