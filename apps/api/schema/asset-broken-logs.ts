import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'

/**
 * Nhật ký VT hỏng / cần sửa chữa — lưu vĩnh viễn để xuất file.
 * Snapshot tại thời điểm sự kiện (không phụ thuộc room_assets sau gộp/xóa).
 *
 * eventType:
 * - BROKEN: đưa vào bảng hư hỏng (cấp 5, mã -HONG-)
 * - COMPLETED: sửa xong (đề xuất SC: giữ cấp; báo hỏng: cấp 2)
 * - CANCELLED / REJECTED: hủy phiếu / từ chối đề xuất → trả cấp cũ
 *
 * sourceType: PROPOSAL | REPAIR_REQUEST | OTHER
 */
export const assetBrokenLogs = sqliteTable('asset_broken_logs', {
	...baseSchema,

	/** BROKEN | COMPLETED | CANCELLED | REJECTED */
	eventType: text('event_type').notNull(),

	/** PROPOSAL | REPAIR_REQUEST | OTHER */
	sourceType: text('source_type').notNull().default('OTHER'),

	/** id đề xuất / phiếu báo hỏng */
	sourceId: int('source_id'),

	proposalId: int('proposal_id'),
	repairRequestId: int('repair_request_id'),

	roomAssetId: int('room_asset_id'),
	sourceAssetId: int('source_asset_id'),

	/** Mã tại thời điểm (thường -HONG- khi BROKEN, mã gốc khi COMPLETED) */
	assetCode: text('asset_code'),
	/** Mã gốc trước khi hỏng */
	originalCode: text('original_code'),
	assetName: text('asset_name').notNull(),
	category: text('category'),
	quantity: int('quantity').notNull().default(1),

	originalGrade: int('original_grade'),
	/** Cấp sau sự kiện (5 khi BROKEN, 2 khi COMPLETED, …) */
	gradeAfter: int('grade_after'),
	statusAfter: text('status_after'),

	roomId: int('room_id'),
	roomCode: text('room_code'),
	roomName: text('room_name'),
	floorName: text('floor_name'),
	buildingCode: text('building_code'),
	buildingName: text('building_name'),

	unitName: text('unit_name'),
	nganhCode: text('nganh_code'),

	/** Lý do hỏng / kết quả sửa / ghi chú */
	reason: text('reason'),
	resultNote: text('result_note'),
	performer: text('performer'),

	eventAt: text('event_at').notNull(),

	actorUserId: int('actor_user_id'),
	actorUsername: text('actor_username'),
	actorDisplayName: text('actor_display_name')
})

export interface AssetBrokenLogDB extends Base {
	eventType: string
	sourceType: string
	sourceId?: number | null
	proposalId?: number | null
	repairRequestId?: number | null
	roomAssetId?: number | null
	sourceAssetId?: number | null
	assetCode?: string | null
	originalCode?: string | null
	assetName: string
	category?: string | null
	quantity: number
	originalGrade?: number | null
	gradeAfter?: number | null
	statusAfter?: string | null
	roomId?: number | null
	roomCode?: string | null
	roomName?: string | null
	floorName?: string | null
	buildingCode?: string | null
	buildingName?: string | null
	unitName?: string | null
	nganhCode?: string | null
	reason?: string | null
	resultNote?: string | null
	performer?: string | null
	eventAt: string
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
}
