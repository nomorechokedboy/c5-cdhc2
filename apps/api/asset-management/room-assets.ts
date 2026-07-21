import { api, Query } from 'encore.dev/api'
import log from 'encore.dev/log'
import type { RoomAssetDB } from '../schema/room-assets'
import assetController from './controller'

export interface RoomAssetResponse {
	id: number
	createdAt: string
	updatedAt: string
	roomId: number
	code: string | null
	name: string
	category: string
	/** SL đang dùng được */
	quantity: number
	/** SL đang hỏng / chờ-đang sửa (cùng mã VT) */
	brokenQuantity: number
	unit: string | null
	/** Đơn vị giữ / sử dụng; null = có thể tính vào kho (chưa sử dụng) */
	holdingUnitId: number | null
	grade: number
	manufactureYear: number | null
	usageYear: number | null
	installAddress: string | null
	status: string
	purchaseDate: string | null
	expiryDate: string | null
	brokenAt: string | null
	repairStartedAt: string | null
	repairCompletedAt: string | null
	repairPerformer: string | null
	description: string | null
}

interface RoomAssetBody {
	roomId: number
	code: string
	name: string
	category: string
	quantity?: number
	unit?: string
	holdingUnitId?: number
	grade?: number
	manufactureYear?: number
	usageYear?: number
	installAddress?: string
	status?: string
	purchaseDate?: string
	expiryDate?: string
	brokenAt?: string
	repairStartedAt?: string
	repairCompletedAt?: string
	repairPerformer?: string
	description?: string
}

interface UpdateRoomAssetBody {
	roomId?: number
	code?: string
	name?: string
	category?: string
	quantity?: number
	unit?: string
	holdingUnitId?: number | null
	grade?: number
	manufactureYear?: number
	usageYear?: number
	installAddress?: string
	status?: string
	purchaseDate?: string
	expiryDate?: string
	brokenAt?: string
	repairStartedAt?: string
	repairCompletedAt?: string
	repairPerformer?: string
	description?: string
}

interface GetRoomAssetsQuery {
	roomId?: Query<number>
	status?: Query<string>
	category?: Query<string>
	code?: Query<string>
	codePrefix?: Query<string>
	grade?: Query<number>
}

function toResponse(a: RoomAssetDB): RoomAssetResponse {
	return {
		id: a.id,
		createdAt: a.createdAt,
		updatedAt: a.updatedAt,
		roomId: a.roomId,
		code: a.code ?? null,
		name: a.name,
		category: a.category,
		quantity: a.quantity,
		brokenQuantity: Number(a.brokenQuantity) || 0,
		unit: a.unit ?? null,
		holdingUnitId: a.holdingUnitId ?? null,
		grade: a.grade ?? 1,
		manufactureYear: a.manufactureYear ?? null,
		usageYear: a.usageYear ?? null,
		installAddress: a.installAddress ?? null,
		status: a.status ?? 'NORMAL',
		purchaseDate: a.purchaseDate ?? null,
		expiryDate: a.expiryDate ?? null,
		brokenAt: a.brokenAt ?? null,
		repairStartedAt: a.repairStartedAt ?? null,
		repairCompletedAt: a.repairCompletedAt ?? null,
		repairPerformer: a.repairPerformer ?? null,
		description: a.description ?? null
	}
}

export const CreateRoomAsset = api(
	{ auth: true, expose: true, method: 'POST', path: '/room-assets' },
	async (body: RoomAssetBody): Promise<{ data: RoomAssetResponse }> => {
		log.trace('CreateRoomAsset', { body })
		const created = await assetController.createRoomAsset({
			...body,
			quantity: body.quantity ?? 1,
			grade: body.grade ?? 1
		})
		return { data: toResponse(created) }
	}
)

export const GetRoomAssets = api(
	{ auth: true, expose: true, method: 'GET', path: '/room-assets' },
	async (q: GetRoomAssetsQuery): Promise<{ data: RoomAssetResponse[] }> => {
		const list = await assetController.listRoomAssets({
			roomId: q.roomId,
			status: q.status,
			category: q.category,
			code: q.code,
			codePrefix: q.codePrefix,
			grade: q.grade
		})
		return { data: list.map(toResponse) }
	}
)

export const GetRoomAsset = api(
	{ auth: true, expose: true, method: 'GET', path: '/room-assets/:id' },
	async ({ id }: { id: number }): Promise<{ data: RoomAssetResponse }> => {
		const asset = await assetController.getRoomAsset(id)
		return { data: toResponse(asset) }
	}
)

export const UpdateRoomAsset = api(
	{ auth: true, expose: true, method: 'PATCH', path: '/room-assets/:id' },
	async ({
		id,
		...body
	}: UpdateRoomAssetBody & { id: number }): Promise<{
		data: RoomAssetResponse
	}> => {
		log.trace('UpdateRoomAsset', { id, body })
		const updated = await assetController.updateRoomAsset({ id, ...body })
		return { data: toResponse(updated) }
	}
)

export const DeleteRoomAssets = api(
	{ auth: true, expose: true, method: 'POST', path: '/room-assets/delete' },
	async ({ ids }: { ids: number[] }): Promise<{ ids: number[] }> => {
		await assetController.deleteRoomAssets(ids)
		return { ids }
	}
)
