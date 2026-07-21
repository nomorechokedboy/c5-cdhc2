import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { rooms } from './rooms'
import { roomAssets } from './room-assets'
import { users } from './users'

/**
 * Phiếu báo hỏng theo cấp phòng → admin phân công người sửa.
 * status: PENDING | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED
 */
export const repairRequests = sqliteTable('repair_requests', {
	...baseSchema,

	roomId: int('room_id')
		.notNull()
		.references(() => rooms.id, { onDelete: 'cascade' }),

	roomAssetId: int('room_asset_id').references(() => roomAssets.id, {
		onDelete: 'set null'
	}),

	/**
	 * Dòng vật tư gốc trước khi tách SL hỏng (null nếu báo hết cả dòng / báo tên tự do).
	 * Dùng khi hủy phiếu / hoàn thành để cộng SL về kho đang dùng.
	 */
	sourceAssetId: int('source_asset_id').references(() => roomAssets.id, {
		onDelete: 'set null'
	}),

	/** Số lượng hỏng (không đánh hỏng cả dòng khi SL < tổng) */
	quantity: int('quantity').notNull().default(1),

	/** Phân cấp trước khi báo hỏng (để khôi phục sau sửa, không tạo mã VT mới) */
	originalGrade: int('original_grade'),

	/** Tên thiết bị (snapshot; dùng khi asset bị xóa hoặc báo tên tự do) */
	assetName: text('asset_name').notNull(),

	category: text('category'),

	description: text('description'),

	/** PENDING | ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED */
	status: text('status').notNull().default('PENDING'),

	/** Ngày phát hiện / báo hỏng */
	brokenAt: text('broken_at').notNull(),

	/** Người báo cáo (tên hiển thị hoặc username) */
	reportedByName: text('reported_by_name').notNull(),

	reportedByUserId: int('reported_by_user_id').references(() => users.id, {
		onDelete: 'set null'
	}),

	/** Người được phân công sửa */
	assignedToName: text('assigned_to_name'),

	assignedAt: text('assigned_at'),

	assignedByName: text('assigned_by_name'),

	/** Ngày bắt đầu sửa */
	repairStartedAt: text('repair_started_at'),

	/** Ngày hoàn thành */
	completedAt: text('completed_at'),

	adminNote: text('admin_note')
})

export const repairRequestsRelations = relations(repairRequests, ({ one }) => ({
	room: one(rooms, {
		fields: [repairRequests.roomId],
		references: [rooms.id]
	}),
	roomAsset: one(roomAssets, {
		fields: [repairRequests.roomAssetId],
		references: [roomAssets.id]
	}),
	reportedByUser: one(users, {
		fields: [repairRequests.reportedByUserId],
		references: [users.id]
	})
}))

export type RepairRequestStatus =
	| 'PENDING'
	| 'ASSIGNED'
	| 'IN_PROGRESS'
	| 'COMPLETED'
	| 'CANCELLED'

export interface RepairRequestDB extends Base {
	roomId: number
	roomAssetId?: number | null
	sourceAssetId?: number | null
	quantity: number
	originalGrade?: number | null
	assetName: string
	category?: string | null
	description?: string | null
	status: string
	brokenAt: string
	reportedByName: string
	reportedByUserId?: number | null
	assignedToName?: string | null
	assignedAt?: string | null
	assignedByName?: string | null
	repairStartedAt?: string | null
	completedAt?: string | null
	adminNote?: string | null
}

export interface CreateRepairRequestBody {
	roomId: number
	roomAssetId?: number
	/** Số lượng hỏng (mặc định 1; ≤ SL đang dùng của dòng VT) */
	quantity?: number
	assetName: string
	category?: string
	description?: string
	brokenAt: string
	reportedByName: string
}

export interface AssignRepairRequestBody {
	id: number
	assignedToName: string
	repairStartedAt?: string
	adminNote?: string
	/** set asset status to REPAIRING and sync performer */
	startRepair?: boolean
}

export interface CompleteRepairRequestBody {
	id: number
	completedAt?: string
	adminNote?: string
}
