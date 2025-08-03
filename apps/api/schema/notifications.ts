import { customType, index } from 'drizzle-orm/sqlite-core'
import * as sqlite from 'drizzle-orm/sqlite-core'
import { AppError } from '../errors/index'
import { InferInsertModel, InferSelectModel, sql } from 'drizzle-orm'
import { users } from './users'
import { NotificationItem } from './notification-items'

export const ResourcesEnum = customType<{ data: string; driverData: string }>({
	dataType() {
		return 'text'
	},
	toDriver(val: string) {
		if (!['classes', 'students'].includes(val)) {
			throw AppError.invalidArgument(
				'resourceType can only be classes | students'
			)
		}
		return val
	}
})

export const NotificationTypeEnum = customType<{
	data: string
	driverData: string
}>({
	dataType() {
		return 'text'
	},
	toDriver(val: string) {
		if (!['birthday', 'officialCpv'].includes(val)) {
			throw AppError.invalidArgument(
				'notification type can only be birthday or officialCpv'
			)
		}
		return val
	}
})

export const notifications = sqlite.sqliteTable(
	'notifications',
	{
		id: sqlite.text().primaryKey().notNull(),
		createdAt: sqlite.text().default(sql`CURRENT_TIMESTAMP`),
		readAt: sqlite.text(),

		notificationType: NotificationTypeEnum('notificationType')
			.$type<'birthday' | 'officialCpv'>()
			.default('birthday')
			.notNull(),
		title: sqlite.text().notNull(),
		message: sqlite.text().notNull(),

		isBatch: sqlite.int({ mode: 'boolean' }).default(false),
		batchKey: sqlite.text(),
		totalCount: sqlite.int().default(1),

		recipientId: sqlite.int().references(() => users.id),
		actorId: sqlite.int().references(() => users.id)
	},
	(table) => [
		index('recipient_idx').on(table.recipientId),
		index('batch_idx').on(table.batchKey)
	]
)

export type NotifiableType = 'students' | 'classes'

export type NotificationBody = InferInsertModel<typeof notifications>

export type NotificationDB = InferSelectModel<typeof notifications>

export type NotificationQuery = {
	page: number
	pageSize: number
}

export type Notification = NotificationDB & { items: NotificationItem[] }

export type CreateNotificationParams = {
	notificationType: string
	title: string
	message?: string
	recipientId: number
	actorId?: number
	isBatch?: boolean
	batchKey?: string
	totalCount?: number
}

export type CreateBatchNotificationItemData = Array<{
	notifiableType: NotifiableType
	notifiableId: number
}>

export type CreateBatchNotificationData = {
	notificationType: 'birthday' | 'officialCpv'
	title: string
	message: string
	recipientId?: number
	actorId?: number
	batchKey: string
	items: CreateBatchNotificationItemData
}

export type UpdateNotificationMap = {
	id: string
	updatePayload: { readAt: string }
}[]
