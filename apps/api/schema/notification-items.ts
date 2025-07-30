import { index } from 'drizzle-orm/sqlite-core'
import * as sqlite from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'
import { notifications, ResourcesEnum } from './notifications'

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
		index('notification_items_notification_idx').on(
			table.notificationId
		),
		index('notification_items_item_idx').on(
			table.notifiableType,
			table.notifiableId
		)
	]
)
