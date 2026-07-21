import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { roomAssets } from './room-assets'

export const repairLogs = sqliteTable('repair_logs', {
	...baseSchema,
	roomAssetId: int('room_asset_id')
		.notNull()
		.references(() => roomAssets.id, {
			onDelete: 'cascade'
		}),
	repairDate: text('repair_date').notNull(),
	content: text('content').notNull(),
	cost: int('cost').notNull().default(0),
	performer: text('performer'),
	note: text('note')
})

export const repairLogsRelations = relations(repairLogs, ({ one }) => ({
	roomAsset: one(roomAssets, {
		fields: [repairLogs.roomAssetId],
		references: [roomAssets.id]
	})
}))

export interface RepairLogDB extends Base {
	roomAssetId: number
	repairDate: string
	content: string
	cost: number
	performer?: string | null
	note?: string | null
}

export interface CreateRepairLogRequest {
	roomAssetId: number
	repairDate: string
	content: string
	cost?: number
	performer?: string
	note?: string
}

export interface UpdateRepairLogRequest {
	id: number
	roomAssetId?: number
	repairDate?: string
	content?: string
	cost?: number
	performer?: string
	note?: string
}
