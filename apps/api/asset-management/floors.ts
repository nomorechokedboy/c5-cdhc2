import { api, Query } from 'encore.dev/api'
import log from 'encore.dev/log'
import type { FloorDB } from '../schema/floors'
import assetController from './controller'

export interface FloorResponse {
	id: number
	createdAt: string
	updatedAt: string
	buildingId: number
	code: string | null
	floorNumber: number
	name: string
	description: string | null
}

interface FloorBody {
	buildingId: number
	code?: string | null
	floorNumber: number
	name: string
	description?: string | null
}

interface UpdateFloorBody {
	buildingId?: number
	code?: string | null
	floorNumber?: number
	name?: string
	description?: string | null
}

interface DeleteFloorsBody {
	ids: number[]
}

interface GetFloorsQuery {
	buildingId?: Query<number>
}

function toFloorResponse(f: FloorDB): FloorResponse {
	return {
		id: f.id,
		createdAt: f.createdAt,
		updatedAt: f.updatedAt,
		buildingId: f.buildingId,
		code: f.code ?? null,
		floorNumber: f.floorNumber,
		name: f.name,
		description: f.description ?? null
	}
}

export const CreateFloor = api(
	{ auth: true, expose: true, method: 'POST', path: '/floors' },
	async (body: FloorBody): Promise<{ data: FloorResponse }> => {
		log.trace('CreateFloor', { body })
		const created = await assetController.createFloor(body)
		return { data: toFloorResponse(created) }
	}
)

export const GetFloors = api(
	{ auth: true, expose: true, method: 'GET', path: '/floors' },
	async (q: GetFloorsQuery): Promise<{ data: FloorResponse[] }> => {
		const list = await assetController.listFloors({
			buildingId: q.buildingId
		})
		return { data: list.map(toFloorResponse) }
	}
)

export const GetFloor = api(
	{ auth: true, expose: true, method: 'GET', path: '/floors/:id' },
	async ({ id }: { id: number }): Promise<{ data: FloorResponse }> => {
		const floor = await assetController.getFloor(id)
		return { data: toFloorResponse(floor) }
	}
)

export const UpdateFloor = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/floors/:id' },
	async ({
		id,
		...body
	}: UpdateFloorBody & { id: number }): Promise<{ data: FloorResponse }> => {
		log.trace('UpdateFloor', { id, body })
		const updated = await assetController.updateFloor({ id, ...body })
		return { data: toFloorResponse(updated) }
	}
)

export const DeleteFloors = api(
	{ auth: true, expose: true, method: 'POST', path: '/floors/delete' },
	async (body: DeleteFloorsBody): Promise<{ ids: number[] }> => {
		log.trace('DeleteFloors', { body })
		await assetController.deleteFloors(body.ids)
		return { ids: body.ids }
	}
)
