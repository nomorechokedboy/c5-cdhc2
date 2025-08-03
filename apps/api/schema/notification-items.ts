import { index } from 'drizzle-orm/sqlite-core'
import * as sqlite from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'
import { notifications } from './notifications'
import { InferSelectModel, relations } from 'drizzle-orm'
import { AppError } from '../errors'

const ResourcesEnum = sqlite.customType<{ data: string; driverData: string }>({
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

export const notificationItems = sqlite.sqliteTable(
	'notification_items',
	{
		...baseSchema,

		notifiableType: ResourcesEnum('notifiableType')
			.$type<'classes' | 'students'>()
			.notNull(),
		notifiableId: sqlite.int().notNull(),

		notificationId: sqlite
			.text()
			.references(() => notifications.id)
			.notNull()
	},
	(table) => [
		index('notification_items_notification_idx').on(table.notificationId),
		index('notification_items_item_idx').on(
			table.notifiableType,
			table.notifiableId
		)
	]
)

export const notificationItemsRelations = relations(
	notificationItems,
	({ one }) => ({
		notification: one(notifications, {
			fields: [notificationItems.notificationId],
			references: [notifications.id]
		})
	})
)

export type NotificationItem = InferSelectModel<typeof notificationItems>
