import { relations } from 'drizzle-orm'
import { sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { Base, baseSchema } from './base'
import { floors } from './floors'
import type { FloorDB } from './floors'

export const buildings = sqliteTable('buildings', {
	...baseSchema,
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	/** Mã người quản lý */
	managerCode: text('manager_code'),
	/** Khu vực */
	area: text('area'),
	address: text('address'),
	description: text('description')
})

export const buildingsRelations = relations(buildings, ({ many }) => ({
	floors: many(floors)
}))

export interface BuildingDB extends Base {
	code: string
	name: string
	managerCode?: string | null
	area?: string | null
	address?: string | null
	description?: string | null
}

export interface Building extends BuildingDB {
	floors?: FloorDB[]
}

export interface CreateBuildingRequest {
	code: string
	name: string
	managerCode?: string
	area?: string
	address?: string
	description?: string
}

export interface UpdateBuildingRequest {
	id: number
	code?: string
	name?: string
	managerCode?: string
	area?: string
	address?: string
	description?: string
}
