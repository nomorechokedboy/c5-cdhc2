import { AppError } from '../errors/index'
import orm, { DrizzleDatabase } from '../database'
import {
	CreateBatchNotificationData,
	CreateNotificationParams,
	Notification,
	NotificationBody,
	NotificationDB,
	NotificationQuery,
	notifications,
	UpdateNotificationMap
} from '../schema/notifications'
import { handleDatabaseErr } from '../utils/index'
import { Repository } from './index'
import { eq, inArray } from 'drizzle-orm'
import log from 'encore.dev/log'
import { v4 as uuidv4 } from 'uuid'
import { notificationItems } from '../schema/notification-items'

class NotificationSqliteRepo implements Repository {
	constructor(private db: DrizzleDatabase) {}

	create(params: CreateNotificationParams[]): Promise<NotificationDB[]> {
		const notificationBodies = params.map(
			(p) => ({ ...p, id: uuidv4() }) as NotificationBody
		)
		log.info('notifications.create params: ', {
			params: notificationBodies
		})

		return this.db
			.insert(notifications)
			.values(notificationBodies)
			.returning()
			.catch(handleDatabaseErr)
	}

	createBatch({
		items,
		...data
	}: CreateBatchNotificationData): Promise<NotificationDB> {
		log.info('notifications.createBatch params: ', {
			params: { items, ...data }
		})

		return this.db
			.transaction(async (tx) => {
				const body: NotificationBody = {
					...data,
					id: uuidv4(),
					isBatch: true,
					totalCount: items.length
				}

				const [notification] = await tx
					.insert(notifications)
					.values(body)
					.returning()

				// Create notification items
				if (items.length > 0) {
					await tx
						.insert(notificationItems)
						.values(
							items.map((item) => ({
								notificationId:
									notification.id,
								notifiableType:
									item.notifiableType,
								notifiableId:
									item.notifiableId
							}))
						)
				}

				return notification
			})
			.catch(handleDatabaseErr)
	}

	delete(params: NotificationDB[]): Promise<NotificationDB[]> {
		throw AppError.umimplemented('Unimplemented method')
	}

	async find(q: NotificationQuery): Promise<Notification[]> {
		log.info('notifications.find query: ', { q })

		const rows = await this.db
			.select()
			.from(notifications)
			.limit(q.pageSize)
			.offset(q.page * q.pageSize)
			.catch(handleDatabaseErr)

		const notificationMap: Record<string, Notification> = {}
		const notificationIds = rows.map((n) => {
			notificationMap[n.id] = { ...n, items: [] }
			return n.id
		})

		const items = await this.db
			.select()
			.from(notificationItems)
			.where(
				inArray(
					notificationItems.notificationId,
					notificationIds
				)
			)

		for (const item of items) {
			const notification =
				notificationMap[item.notificationId]
			if (notification !== undefined) {
				notificationMap[item.notificationId].items.push(
					item
				)
			}
		}

		return Object.values(notificationMap)
	}

	update(params: UpdateNotificationMap): Promise<NotificationDB[]> {
		log.info('notifications.update params: ', { params })

		return this.db
			.transaction(async (tx) => {
				const updatedRows = []

				for (const { id, updatePayload } of params) {
					const updated = await tx
						.update(notifications)
						.set(updatePayload)
						.where(eq(notifications.id, id))
						.returning()

					if (updated.length > 0) {
						updatedRows.push(updated[0])
					}
				}

				return updatedRows
			})
			.catch(handleDatabaseErr)
	}
}

const notificationRepo = new NotificationSqliteRepo(orm)

export default notificationRepo
