import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { floors } from './floors'
import type { FloorDB } from './floors'
import { classes } from './classes'

import { roomAssets } from './room-assets'
import { roomImages } from './room-images'

export const rooms = sqliteTable('rooms', {
	...baseSchema,

	floorId: int('floor_id')
		.notNull()
		.references(() => floors.id, {
			onDelete: 'cascade'
		}),

	roomCode: text('room_code').notNull().unique(),

	roomName: text('room_name').notNull(),

	roomType: text('room_type'),

	manager: text('manager'),

	/** Mã / username tài khoản phòng (không đổi khi sửa mật khẩu) */
	managerCode: text('manager_code'),

	/**
	 * Mật khẩu tài khoản phòng (argon2 hash).
	 * Không trả về client — chỉ trả hasAccountPassword.
	 */
	accountPassword: text('account_password'),

	capacity: int('capacity').notNull().default(0),

	// ACTIVE | INACTIVE | MAINTENANCE
	status: text('status').notNull().default('ACTIVE'),

	description: text('description'),

	/** Lớp học gắn với phòng dạy (tuỳ chọn) — user chọn phòng → xem HV + thiết bị */
	classId: int('class_id').references(() => classes.id, {
		onDelete: 'set null'
	})
})

export const roomsRelations = relations(rooms, ({ one, many }) => ({
	floor: one(floors, {
		fields: [rooms.floorId],
		references: [floors.id]
	}),

	class: one(classes, {
		fields: [rooms.classId],
		references: [classes.id]
	}),

	assets: many(roomAssets),

	images: many(roomImages)
}))

export interface RoomDB extends Base {
	floorId: number
	roomCode: string
	roomName: string
	roomType?: string | null
	manager?: string | null
	managerCode?: string | null
	/** Hash — không expose ra API */
	accountPassword?: string | null
	capacity?: number | null
	status?: string | null
	description?: string | null
	classId?: number | null
	/** Client-only flag sau khi strip hash */
	hasAccountPassword?: boolean
}

export interface Room extends RoomDB {
	floor?: FloorDB & {
		building?: import('./buildings').BuildingDB
	}
}

export interface CreateRoomRequest {
	floorId: number
	roomCode: string
	roomName: string
	roomType?: string
	manager?: string
	managerCode?: string
	/** Plain password — hash trước khi lưu */
	accountPassword?: string
	capacity?: number
	status?: string
	description?: string
	classId?: number | null
}

export interface UpdateRoomRequest {
	id: number
	floorId?: number
	roomCode?: string
	roomName?: string
	roomType?: string
	manager?: string
	managerCode?: string
	/** Plain password mới — hash trước khi lưu; bỏ trống = giữ cũ */
	accountPassword?: string
	capacity?: number
	status?: string
	description?: string
	classId?: number | null
}
