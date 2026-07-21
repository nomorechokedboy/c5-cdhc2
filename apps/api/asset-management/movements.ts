import { api, Query } from 'encore.dev/api'
import log from 'encore.dev/log'
import type {
	AssetMovementLogDB,
	AssetMovementReportRow,
	AssetMovementType
} from '../schema/asset-movement-logs'
import assetController from './controller'

export interface AssetMovementResponse {
	id: number
	createdAt: string
	updatedAt: string
	roomAssetId: number
	movementType: string
	executedAt: string
	executingUnit: string | null
	installAddress: string | null
	assetCode: string | null
	assetName: string
	quantity: number
	quantityBefore: number
	quantityAfter: number
	grade: number
	manufactureYear: number | null
	usageYear: number | null
	reasonCode: string | null
	reasonOther: string | null
	decisionDate: string | null
	decisionNumber: string | null
	signer: string | null
	performer: string | null
	explanation: string | null
	note: string | null
}

export interface AssetMovementReportResponse extends AssetMovementResponse {
	roomId: number
	roomCode: string
	roomName: string
	floorId: number
	floorName: string
	buildingId: number
	buildingCode: string
	buildingName: string
	/** Đơn vị sử dụng (holding) của VT lúc ghi log / hiện tại */
	holdingUnitId: number | null
}

function toResponse(r: AssetMovementLogDB): AssetMovementResponse {
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		roomAssetId: r.roomAssetId,
		movementType: r.movementType,
		executedAt: r.executedAt,
		executingUnit: r.executingUnit ?? null,
		installAddress: r.installAddress ?? null,
		assetCode: r.assetCode ?? null,
		assetName: r.assetName,
		quantity: r.quantity,
		quantityBefore: r.quantityBefore,
		quantityAfter: r.quantityAfter,
		grade: r.grade,
		manufactureYear: r.manufactureYear ?? null,
		usageYear: r.usageYear ?? null,
		reasonCode: r.reasonCode ?? null,
		reasonOther: r.reasonOther ?? null,
		decisionDate: r.decisionDate ?? null,
		decisionNumber: r.decisionNumber ?? null,
		signer: r.signer ?? null,
		performer: r.performer ?? null,
		explanation: r.explanation ?? null,
		note: r.note ?? null
	}
}

function toReport(r: AssetMovementReportRow): AssetMovementReportResponse {
	return {
		...toResponse(r),
		roomId: r.roomId,
		roomCode: r.roomCode,
		roomName: r.roomName,
		floorId: r.floorId,
		floorName: r.floorName,
		buildingId: r.buildingId,
		buildingCode: r.buildingCode,
		buildingName: r.buildingName,
		holdingUnitId:
			(r as AssetMovementReportRow & { holdingUnitId?: number | null })
				.holdingUnitId ?? null
	}
}

interface CreateMovementBody {
	movementType: AssetMovementType
	executedAt: string
	executingUnit?: string
	installAddress?: string
	assetName?: string
	quantity: number
	grade?: number
	manufactureYear?: number
	usageYear?: number
	reasonCode?: string
	reasonOther?: string
	decisionDate?: string
	decisionNumber?: string
	signer?: string
	performer?: string
	explanation?: string
	note?: string
	/** Đơn vị quản lý — cập nhật room_assets.holding_unit_id */
	holdingUnitId?: number | null
}

interface ListQuery {
	roomAssetId?: Query<number>
	roomId?: Query<number>
	buildingId?: Query<number>
	movementType?: Query<string>
	fromDate?: Query<string>
	toDate?: Query<string>
}

/** Nhập tăng/giảm hoặc điều chỉnh số liệu vật tư */
export const CreateAssetMovement = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/room-assets/:id/movements'
	},
	async ({
		id,
		...body
	}: CreateMovementBody & { id: number }): Promise<{
		data: AssetMovementResponse
	}> => {
		log.trace('CreateAssetMovement', { id, body })
		const created = await assetController.createAssetMovement({
			roomAssetId: id,
			...body
		})
		return { data: toResponse(created) }
	}
)

export const GetAssetMovementLogs = api(
	{ auth: true, expose: true, method: 'GET', path: '/asset-movement-logs' },
	async (q: ListQuery): Promise<{ data: AssetMovementResponse[] }> => {
		const list = await assetController.listAssetMovements({
			roomAssetId: q.roomAssetId,
			roomId: q.roomId,
			buildingId: q.buildingId,
			movementType: q.movementType,
			fromDate: q.fromDate,
			toDate: q.toDate
		})
		return { data: list.map(toResponse) }
	}
)

export const GetAssetMovementLog = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-movement-logs/:id'
	},
	async ({
		id
	}: {
		id: number
	}): Promise<{ data: AssetMovementResponse }> => {
		const row = await assetController.getAssetMovement(id)
		return { data: toResponse(row) }
	}
)

/** Báo cáo biến động kèm vị trí (tòa/tầng/phòng) */
export const GetAssetMovementReport = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/asset-reports/movements'
	},
	async (q: ListQuery): Promise<{ data: AssetMovementReportResponse[] }> => {
		const list = await assetController.listAssetMovementReport({
			roomAssetId: q.roomAssetId,
			roomId: q.roomId,
			buildingId: q.buildingId,
			movementType: q.movementType,
			fromDate: q.fromDate,
			toDate: q.toDate
		})
		return { data: list.map(toReport) }
	}
)

interface TransferRecallBody {
	movementType: 'TRANSFER' | 'RECALL'
	/** RECALL: optional → kho KHO-VT */
	targetRoomId?: number
	quantity: number
	executedAt: string
	holdingUnitId?: number | null
	executingUnit?: string
	installAddress?: string
	decisionDate?: string
	decisionNumber?: string
	signer?: string
	performer?: string
	reasonOther?: string
	note?: string
}

/**
 * Điều động (TRANSFER) hoặc thu hồi (RECALL) vật tư sang phòng đích.
 * Ghi nhật ký movementType = TRANSFER | RECALL.
 */
export const CreateTransferRecall = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/room-assets/:id/transfer-recall'
	},
	async ({
		id,
		...body
	}: TransferRecallBody & { id: number }): Promise<{
		data: AssetMovementResponse
	}> => {
		log.trace('CreateTransferRecall', { id, body })
		const created = await assetController.createTransferRecall({
			roomAssetId: id,
			...body
		})
		return { data: toResponse(created) }
	}
)
