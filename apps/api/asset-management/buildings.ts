import { api } from 'encore.dev/api'
import log from 'encore.dev/log'
import type { BuildingDB } from '../schema/buildings'
import type { BuildingTree } from './index'
import assetController from './controller'

// ── Response / request types (Encore-serializable) ─────────────

export interface BuildingResponse {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	managerCode: string | null
	area: string | null
	address: string | null
	description: string | null
}

interface BuildingBody {
	code: string
	name: string
	managerCode?: string
	area?: string
	address?: string
	description?: string
}

interface UpdateBuildingBody {
	code?: string
	name?: string
	managerCode?: string
	area?: string
	address?: string
	description?: string
}

interface DeleteBuildingsBody {
	ids: number[]
}

function toBuildingResponse(b: BuildingDB): BuildingResponse {
	return {
		id: b.id,
		createdAt: b.createdAt,
		updatedAt: b.updatedAt,
		code: b.code,
		name: b.name,
		managerCode: b.managerCode ?? null,
		area: b.area ?? null,
		address: b.address ?? null,
		description: b.description ?? null
	}
}

// ── Endpoints ──────────────────────────────────────────────────

export const CreateBuilding = api(
	{ auth: true, expose: true, method: 'POST', path: '/buildings' },
	async (body: BuildingBody): Promise<{ data: BuildingResponse }> => {
		log.trace('CreateBuilding', { body })
		const created = await assetController.createBuilding(body)
		return { data: toBuildingResponse(created) }
	}
)

export const GetBuildings = api(
	{ auth: true, expose: true, method: 'GET', path: '/buildings' },
	async (): Promise<{ data: BuildingResponse[] }> => {
		const list = await assetController.listBuildings()
		return { data: list.map(toBuildingResponse) }
	}
)

export const GetBuildingTree = api(
	{ auth: true, expose: true, method: 'GET', path: '/buildings/tree' },
	async (): Promise<{ data: BuildingTree[] }> => {
		const tree = await assetController.getBuildingTree()
		return { data: tree }
	}
)

export const GetBuilding = api(
	{ auth: true, expose: true, method: 'GET', path: '/buildings/:id' },
	async ({ id }: { id: number }): Promise<{ data: BuildingTree }> => {
		const building = await assetController.getBuilding(id)
		return { data: building as BuildingTree }
	}
)

export const UpdateBuilding = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/buildings/:id' },
	async ({
		id,
		...body
	}: UpdateBuildingBody & { id: number }): Promise<{
		data: BuildingResponse
	}> => {
		log.trace('UpdateBuilding', { id, body })
		const updated = await assetController.updateBuilding({ id, ...body })
		return { data: toBuildingResponse(updated) }
	}
)

export const DeleteBuildings = api(
	{ auth: true, expose: true, method: 'POST', path: '/buildings/delete' },
	async (body: DeleteBuildingsBody): Promise<{ ids: number[] }> => {
		log.trace('DeleteBuildings', { body })
		await assetController.deleteBuildings(body.ids)
		return { ids: body.ids }
	}
)
