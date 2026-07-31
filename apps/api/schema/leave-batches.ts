import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { Base } from './base'
import type { LeaveObjectType, LeaveType } from './leave-management'

export const leaveBatches = sqliteTable('leave_batches', {
	id: int('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`CURRENT_TIMESTAMP`),
	requestId: int('request_id').notNull(),
	personnelId: int('personnel_id'),
	personnelCode: text('personnel_code'),
	personnelName: text('personnel_name'),
	objectType: text('object_type').notNull().$type<LeaveObjectType>(),
	leaveType: text('leave_type').notNull().$type<LeaveType>(),
	batchIndex: int('batch_index').notNull().default(1),
	batchLabel: text('batch_label').notNull().default(''),
	startDate: text('start_date'),
	endDate: text('end_date'),
	totalDays: int('total_days').notNull().default(0),
	note: text('note'),
	createdByUserId: int('created_by_user_id')
})

export interface LeaveBatchDB extends Base {
	requestId: number
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: LeaveObjectType
	leaveType: LeaveType
	batchIndex: number
	batchLabel: string
	startDate: string | null
	endDate: string | null
	totalDays: number
	note: string | null
	createdByUserId: number | null
}

export interface LeaveBatchResponse {
	id: number
	createdAt: string
	updatedAt: string
	requestId: number
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: LeaveObjectType
	leaveType: LeaveType
	batchIndex: number
	batchLabel: string
	startDate: string | null
	endDate: string | null
	totalDays: number
	note: string | null
	createdByUserId: number | null
}
