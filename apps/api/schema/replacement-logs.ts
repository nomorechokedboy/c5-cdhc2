import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { roomAssets } from './room-assets'

export const replacementLogs = sqliteTable('replacement_logs', {
	...baseSchema,
	roomAssetId: int('room_asset_id')
		.notNull()
		.references(() => roomAssets.id, {
			onDelete: 'cascade'
		}),
	replacementDate: text('replacement_date').notNull(),
	oldAsset: text('old_asset').notNull(),
	newAsset: text('new_asset').notNull(),
	reason: text('reason'),
	performer: text('performer'),
	note: text('note')
})

export const replacementLogsRelations = relations(
	replacementLogs,
	({ one }) => ({
		roomAsset: one(roomAssets, {
			fields: [replacementLogs.roomAssetId],
			references: [roomAssets.id]
		})
	})
)

export interface ReplacementLogDB extends Base {
	roomAssetId: number
	replacementDate: string
	oldAsset: string
	newAsset: string
	reason?: string | null
	performer?: string | null
	note?: string | null
}

export interface CreateReplacementLogRequest {
	roomAssetId: number
	replacementDate: string
	oldAsset: string
	newAsset: string
	reason?: string
	performer?: string
	note?: string
}

export interface UpdateReplacementLogRequest {
	id: number
	roomAssetId?: number
	replacementDate?: string
	oldAsset?: string
	newAsset?: string
	reason?: string
	performer?: string
	note?: string
}
