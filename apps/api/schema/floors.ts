import { relations } from 'drizzle-orm'
import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { BuildingDB, buildings } from './buildings'
import { rooms } from './rooms'

export const floors = sqliteTable('floors', {
	...baseSchema,

	buildingId: int('building_id')
		.notNull()
		.references(() => buildings.id, {
			onDelete: 'cascade'
		}),

	/** Mã tầng — vd. H1 */
	code: text('code'),

	floorNumber: int('floor_number').notNull(),

	name: text('name').notNull(),

	description: text('description')
})

export const floorsRelations = relations(floors, ({ one, many }) => ({
	building: one(buildings, {
		fields: [floors.buildingId],
		references: [buildings.id]
	}),

	rooms: many(rooms)
}))

export interface FloorDB extends Base {
	buildingId: number
	code?: string | null
	floorNumber: number
	name: string
	description?: string | null
}

export interface Floor extends FloorDB {
	building?: BuildingDB
	rooms?: import('./rooms').RoomDB[]
}

export interface CreateFloorRequest {
	buildingId: number
	code?: string | null
	floorNumber: number
	name: string
	description?: string | null
}

export interface UpdateFloorRequest {
	id: number
	buildingId?: number
	code?: string | null
	floorNumber?: number
	name?: string
	description?: string | null
}
