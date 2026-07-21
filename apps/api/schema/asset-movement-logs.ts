import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { roomAssets } from './room-assets'

/** INCREASE | DECREASE | ADJUST | TRANSFER (điều động) | RECALL (thu hồi) */
export type AssetMovementType =
	| 'INCREASE'
	| 'DECREASE'
	| 'ADJUST'
	| 'TRANSFER'
	| 'RECALL'

/** Lý do tăng */
export type IncreaseReasonCode =
	| 'FROM_SUPERIOR'
	| 'PURCHASE'
	| 'GRADE_UP'
	| 'INVENTORY'
	| 'OTHER'

/** Lý do giảm */
export type DecreaseReasonCode =
	| 'RETURN_SUPERIOR'
	| 'LOSS'
	| 'LIQUIDATION' // Thanh lý (không dùng DAMAGED — hư hỏng qua «Báo hỏng»)
	| 'DAMAGED' // legacy log cũ
	| 'INVENTORY'
	| 'OTHER'

export const assetMovementLogs = sqliteTable('asset_movement_logs', {
	...baseSchema,

	/**
	 * Nullable + ON DELETE SET NULL: nhật ký là audit trail.
	 * Khi xóa VT (SL→0) vẫn giữ log; không cascade xóa nhật ký.
	 */
	roomAssetId: int('room_asset_id').references(() => roomAssets.id, {
		onDelete: 'set null'
	}),

	/** INCREASE | DECREASE | ADJUST | TRANSFER | RECALL */
	movementType: text('movement_type').notNull(),

	/** Ngày thực hiện */
	executedAt: text('executed_at').notNull(),

	/** Đơn vị thực hiện */
	executingUnit: text('executing_unit'),

	/** Địa chỉ lắp đặt sử dụng */
	installAddress: text('install_address'),

	/** Snapshot mã vật tư */
	assetCode: text('asset_code'),

	/** Snapshot tên thiết bị */
	assetName: text('asset_name').notNull(),

	/**
	 * INCREASE/DECREASE: số lượng thay đổi (delta)
	 * ADJUST: số lượng mới (giá trị tuyệt đối)
	 */
	quantity: int('quantity').notNull().default(0),

	quantityBefore: int('quantity_before').notNull().default(0),

	quantityAfter: int('quantity_after').notNull().default(0),

	/** Phân cấp 1–5 tại thời điểm ghi */
	grade: int('grade').notNull().default(1),

	manufactureYear: int('manufacture_year'),

	usageYear: int('usage_year'),

	/** Mã lý do (tăng/giảm) */
	reasonCode: text('reason_code'),

	/** Lý do khác (khi reason = OTHER) */
	reasonOther: text('reason_other'),

	/** Ngày quyết định (chỉ tăng/giảm) */
	decisionDate: text('decision_date'),

	/** Số quyết định */
	decisionNumber: text('decision_number'),

	/** Người ký */
	signer: text('signer'),

	/** Người thực hiện */
	performer: text('performer'),

	/** Diễn giải lý do cụ thể (chỉ ADJUST) */
	explanation: text('explanation'),

	note: text('note'),

	/** Snapshot vị trí — giữ sau khi xóa VT / mất join */
	buildingCode: text('building_code'),
	buildingName: text('building_name'),
	roomCode: text('room_code'),
	roomName: text('room_name'),
	floorName: text('floor_name')
})

export const assetMovementLogsRelations = relations(
	assetMovementLogs,
	({ one }) => ({
		roomAsset: one(roomAssets, {
			fields: [assetMovementLogs.roomAssetId],
			references: [roomAssets.id]
		})
	})
)

export interface AssetMovementLogDB extends Base {
	roomAssetId?: number | null
	movementType: string
	executedAt: string
	executingUnit?: string | null
	installAddress?: string | null
	assetCode?: string | null
	assetName: string
	quantity: number
	quantityBefore: number
	quantityAfter: number
	grade: number
	manufactureYear?: number | null
	usageYear?: number | null
	reasonCode?: string | null
	reasonOther?: string | null
	decisionDate?: string | null
	decisionNumber?: string | null
	signer?: string | null
	performer?: string | null
	explanation?: string | null
	note?: string | null
	buildingCode?: string | null
	buildingName?: string | null
	roomCode?: string | null
	roomName?: string | null
	floorName?: string | null
}

export interface CreateAssetMovementRequest {
	roomAssetId: number
	movementType: AssetMovementType
	executedAt: string
	executingUnit?: string
	installAddress?: string
	assetName?: string
	/** Delta (INC/DEC) hoặc số mới (ADJUST) */
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
	/** Đơn vị quản lý / giữ — cập nhật lên room_assets khi truyền */
	holdingUnitId?: number | null
}

/** Điều động (TRANSFER) / thu hồi (RECALL) giữa các phòng */
export interface CreateTransferRecallRequest {
	roomAssetId: number
	movementType: 'TRANSFER' | 'RECALL'
	/**
	 * Phòng đích.
	 * RECALL: bị bỏ qua — luôn ép về kho KHO-VT.
	 * TRANSFER: bắt buộc.
	 */
	targetRoomId?: number
	/** Số lượng điều động / thu hồi */
	quantity: number
	executedAt: string
	/** Đơn vị giữ tại đích (null = bỏ gán; RECALL luôn null) */
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

export interface AssetMovementQuery {
	ids?: number[]
	roomAssetId?: number
	roomId?: number
	buildingId?: number
	movementType?: string
	fromDate?: string
	toDate?: string
}

/** Dòng báo cáo có kèm vị trí */
export interface AssetMovementReportRow extends AssetMovementLogDB {
	roomId: number
	roomCode: string
	roomName: string
	floorId: number
	floorName: string
	buildingId: number
	buildingCode: string
	buildingName: string
	holdingUnitId?: number | null
}

/** Snapshot vị trí ghi kèm nhật ký */
export interface MovementLocationSnapshot {
	buildingCode?: string | null
	buildingName?: string | null
	roomCode?: string | null
	roomName?: string | null
	floorName?: string | null
}
