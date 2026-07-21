import { api, Query } from 'encore.dev/api'
import log from 'encore.dev/log'
import type { RoomImageDB } from '../schema/room-images'
import assetController from './controller'

export interface RoomImageResponse {
	id: number
	createdAt: string
	updatedAt: string
	roomId: number
	imageUrl: string
	title: string | null
	description: string | null
}

interface RoomImageBody {
	roomId: number
	imageUrl: string
	title?: string
	description?: string
}

interface UpdateRoomImageBody {
	roomId?: number
	imageUrl?: string
	title?: string
	description?: string
}

interface GetRoomImagesQuery {
	roomId?: Query<number>
}

function toResponse(img: RoomImageDB): RoomImageResponse {
	return {
		id: img.id,
		createdAt: img.createdAt,
		updatedAt: img.updatedAt,
		roomId: img.roomId,
		imageUrl: img.imageUrl,
		title: img.title ?? null,
		description: img.description ?? null
	}
}

export const CreateRoomImage = api(
	{ auth: true, expose: true, method: 'POST', path: '/room-images' },
	async (body: RoomImageBody): Promise<{ data: RoomImageResponse }> => {
		log.trace('CreateRoomImage', { body })
		const created = await assetController.createRoomImage(body)
		return { data: toResponse(created) }
	}
)

export const GetRoomImages = api(
	{ auth: true, expose: true, method: 'GET', path: '/room-images' },
	async (q: GetRoomImagesQuery): Promise<{ data: RoomImageResponse[] }> => {
		const list = await assetController.listRoomImages({ roomId: q.roomId })
		return { data: list.map(toResponse) }
	}
)

export const GetRoomImage = api(
	{ auth: true, expose: true, method: 'GET', path: '/room-images/:id' },
	async ({ id }: { id: number }): Promise<{ data: RoomImageResponse }> => {
		const image = await assetController.getRoomImage(id)
		return { data: toResponse(image) }
	}
)

export const UpdateRoomImage = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/room-images/:id' },
	async ({
		id,
		...body
	}: UpdateRoomImageBody & { id: number }): Promise<{
		data: RoomImageResponse
	}> => {
		const updated = await assetController.updateRoomImage({ id, ...body })
		return { data: toResponse(updated) }
	}
)

export const DeleteRoomImages = api(
	{ auth: true, expose: true, method: 'POST', path: '/room-images/delete' },
	async ({ ids }: { ids: number[] }): Promise<{ ids: number[] }> => {
		await assetController.deleteRoomImages(ids)
		return { ids }
	}
)
