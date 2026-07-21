import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'

/** CREATE | UPDATE | DELETE — nhật ký thao tác tài khoản (phòng) */
export type AccountAuditAction = 'CREATE' | 'UPDATE' | 'DELETE'

/**
 * Nhật ký thêm / sửa / xóa tài khoản phòng.
 * Ghi mọi thao tác từ user hoặc admin.
 */
export const accountAuditLogs = sqliteTable('account_audit_logs', {
	...baseSchema,

	/** CREATE | UPDATE | DELETE */
	action: text('action').notNull(),

	actorUserId: int('actor_user_id'),
	actorUsername: text('actor_username'),
	actorDisplayName: text('actor_display_name'),
	/** 1 = admin / super user */
	actorIsAdmin: int('actor_is_admin').notNull().default(0),

	/** Phòng liên quan (null nếu đã xóa) */
	roomId: int('room_id'),

	/** Snapshot tại thời điểm ghi */
	roomCode: text('room_code'),
	roomName: text('room_name'),
	address: text('address'),
	floorName: text('floor_name'),
	buildingCode: text('building_code'),
	buildingName: text('building_name'),
	/** Giá trị cột «Tài khoản» (manager / mã QL) */
	accountLabel: text('account_label'),

	/** Mô tả ngắn (vd. «Admin CDHC2 thêm tài khoản H1.101») */
	summary: text('summary').notNull(),

	/** Chi tiết thay đổi (JSON text, tuỳ chọn) */
	details: text('details')
})

export interface AccountAuditLogDB extends Base {
	action: AccountAuditAction | string
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
	actorIsAdmin: number
	roomId?: number | null
	roomCode?: string | null
	roomName?: string | null
	address?: string | null
	floorName?: string | null
	buildingCode?: string | null
	buildingName?: string | null
	accountLabel?: string | null
	summary: string
	details?: string | null
}

export interface CreateAccountAuditLogRequest {
	action: AccountAuditAction
	actorUserId?: number | null
	actorUsername?: string | null
	actorDisplayName?: string | null
	actorIsAdmin?: boolean
	roomId?: number | null
	roomCode?: string | null
	roomName?: string | null
	address?: string | null
	floorName?: string | null
	buildingCode?: string | null
	buildingName?: string | null
	accountLabel?: string | null
	summary: string
	details?: string | null
}
