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
import { desc, eq, inArray, isNull } from 'drizzle-orm'
import log from 'encore.dev/log'
import { v4 as uuidv4 } from 'uuid'
import { notificationItems } from '../schema/notification-items'
import { classes, students } from '../schema'

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
					await tx.insert(notificationItems).values(
						items.map((item) => ({
							notificationId: notification.id,
							notifiableType: item.notifiableType,
							notifiableId: item.notifiableId
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

		/* return this.db.query.notifications
            .findMany({
                with: {
                    items: true
                },
                limit: q.pageSize,
                offset: q.page * q.pageSize,
                orderBy: (notifications, { desc }) => [
                    desc(notifications.createdAt)
                ]
            })
            .catch(handleDatabaseErr) */

		const notis = await this.db.query.notifications
			.findMany({
				with: {
					items: true
				},
				limit: q.pageSize,
				offset: q.page * q.pageSize,
				orderBy: (notifications, { desc }) => [
					desc(notifications.createdAt)
				]
			})
			.catch(handleDatabaseErr)

		if (!notis || notis.length === 0) {
			return []
		}

		const allItems = notis.flatMap((noti) => noti.items || [])

		// Load polymorphic data for all items at once (more efficient)
		const enrichedItems = await this.loadPolymorphicData(allItems)

		// Create a lookup map for enriched items by their ID
		const enrichedItemsMap = new Map(
			enrichedItems.map((item) => [item.id, item])
		)

		// Map notifications with their enriched items
		const enrichedNotifications: Notification[] = notis.map((noti) => ({
			...noti,
			items: (noti.items || []).map(
				(item) => enrichedItemsMap.get(item.id) || item
			)
		}))

		return enrichedNotifications
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

	private async loadPolymorphicData<
		T extends { notifiableType: string; notifiableId: number }
	>(items: T[]): Promise<(T & { relatedData: any })[]> {
		if (items.length === 0) return []

		// Group items by type
		const itemsByType = items.reduce(
			(acc, item) => {
				if (!acc[item.notifiableType]) {
					acc[item.notifiableType] = []
				}
				acc[item.notifiableType].push(item)
				return acc
			},
			{} as Record<string, T[]>
		)

		// Load data for each type
		const loadPromises = Object.entries(itemsByType).map(
			async ([type, typeItems]) => {
				const ids = typeItems.map((item) => item.notifiableId)

				switch (type) {
					case 'classes':
						return {
							type,
							data: await this.db
								.select()
								.from(classes)
								.where(inArray(classes.id, ids))
						}
					case 'students':
						return {
							type,
							data: await this.db
								.select()
								.from(students)
								.where(inArray(students.id, ids))
						}
					default:
						return { type, data: [] }
				}
			}
		)

		const loadedData = await Promise.all(loadPromises)

		// Create lookup maps
		const dataLookup = loadedData.reduce(
			(acc, { type, data }) => {
				acc[type] = new Map(data.map((item) => [item.id, item]))
				return acc
			},
			{} as Record<string, Map<number, any>>
		)

		// Enrich items with related data
		return items.map((item) => ({
			...item,
			relatedData:
				dataLookup[item.notifiableType]?.get(item.notifiableId) || null
		}))
	}

	unreadCount(): Promise<number> {
		return this.db.$count(notifications, isNull(notifications.readAt))
	}
}

const notificationRepo = new NotificationSqliteRepo(orm)

export default notificationRepo
