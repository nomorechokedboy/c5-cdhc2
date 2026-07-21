import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'

/** REPAIR | RECALL | LIQUIDATION */
export type AssetProposalType = 'REPAIR' | 'RECALL' | 'LIQUIDATION'

/** PENDING | APPROVED | REJECTED | COMPLETED */
export type AssetProposalStatus =
	| 'PENDING'
	| 'APPROVED'
	| 'REJECTED'
	| 'COMPLETED'

export const assetProposals = sqliteTable('asset_proposals', {
	...baseSchema,
	proposalType: text('proposal_type').notNull(),
	status: text('status').notNull().default('PENDING'),
	title: text('title').notNull(),
	description: text('description'),
	unitId: int('unit_id'),
	unitName: text('unit_name'),
	nganhCode: text('nganh_code'),
	proposedByUserId: int('proposed_by_user_id'),
	proposedByUsername: text('proposed_by_username'),
	proposedByDisplayName: text('proposed_by_display_name'),
	adminNote: text('admin_note'),
	/** Số quyết định thanh lý */
	decisionNumber: text('decision_number'),
	/** Ngành thanh lý */
	decisionNganhCode: text('decision_nganh_code'),
	/** Cấp ban hành QĐ */
	decisionIssuingLevel: text('decision_issuing_level'),
	/** Người ký QĐ */
	decisionSigner: text('decision_signer'),
	decisionAt: text('decision_at'),
	decidedByUserId: int('decided_by_user_id'),
	decidedByUsername: text('decided_by_username'),
	decidedByDisplayName: text('decided_by_display_name'),
	completedAt: text('completed_at')
})

export const assetProposalItems = sqliteTable('asset_proposal_items', {
	...baseSchema,
	proposalId: int('proposal_id').notNull(),
	materialId: int('material_id'),
	materialCode: text('material_code'),
	materialName: text('material_name').notNull(),
	/** Dòng VT hỏng (status BROKEN / -HONG-, giữ nguyên cấp) sau khi đề xuất SC */
	roomAssetId: int('room_asset_id'),
	/**
	 * Dòng VT gốc trước khi tách hỏng (REPAIR).
	 * null nếu hỏng hết cả dòng (source = roomAssetId).
	 */
	sourceAssetId: int('source_asset_id'),
	/** Phân cấp trước khi đề xuất SC (khôi phục khi từ chối) */
	originalGrade: int('original_grade'),
	/** Mã VT trước khi sinh mã -HONG- */
	originalCode: text('original_code'),
	quantity: int('quantity').notNull().default(1),
	unit: text('unit'),
	category: text('category'),
	nganhCode: text('nganh_code'),
	chuyenNganhCode: text('chuyen_nganh_code'),
	note: text('note'),
	/** Phòng / vị trí hiện tại của VT */
	fromRoomId: int('from_room_id'),
	fromRoomCode: text('from_room_code'),
	fromRoomName: text('from_room_name'),
	/** Ghi chú vị trí (tầng, địa chỉ lắp đặt…) */
	locationNote: text('location_note'),
	/** Kho / phòng đích khi thu hồi */
	targetRoomId: int('target_room_id'),
	targetRoomCode: text('target_room_code'),
	targetRoomName: text('target_room_name')
})

export const assetProposalLogs = sqliteTable('asset_proposal_logs', {
	...baseSchema,
	proposalId: int('proposal_id'),
	action: text('action').notNull(),
	proposalType: text('proposal_type'),
	summary: text('summary').notNull(),
	details: text('details'),
	actorUserId: int('actor_user_id'),
	actorUsername: text('actor_username'),
	actorDisplayName: text('actor_display_name'),
	actorIsAdmin: int('actor_is_admin').notNull().default(0)
})

export interface AssetProposalDB extends Base {
	proposalType: string
	status: string
	title: string
	description?: string | null
	unitId?: number | null
	unitName?: string | null
	nganhCode?: string | null
	proposedByUserId?: number | null
	proposedByUsername?: string | null
	proposedByDisplayName?: string | null
	adminNote?: string | null
	decisionNumber?: string | null
	decisionNganhCode?: string | null
	decisionIssuingLevel?: string | null
	decisionSigner?: string | null
	decisionAt?: string | null
	decidedByUserId?: number | null
	decidedByUsername?: string | null
	decidedByDisplayName?: string | null
	completedAt?: string | null
}
