import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { rooms } from './rooms'

export const roomImages = sqliteTable('room_images', {
	...baseSchema,

	roomId: int('room_id')
		.notNull()
		.references(() => rooms.id, {
			onDelete: 'cascade'
		}),

	imageUrl: text('image_url').notNull(),

	title: text('title'),

	description: text('description')
})

export const roomImagesRelations = relations(roomImages, ({ one }) => ({
	room: one(rooms, {
		fields: [roomImages.roomId],
		references: [rooms.id]
	})
}))

export interface RoomImageDB extends Base {
	roomId: number
	imageUrl: string
	title?: string | null
	description?: string | null
}

export interface CreateRoomImageRequest {
	roomId: number
	imageUrl: string
	title?: string
	description?: string
}

export interface UpdateRoomImageRequest {
	id: number
	roomId?: number
	imageUrl?: string
	title?: string
	description?: string
}
