import dayjs from 'dayjs'
import { AppError } from '../errors/index'
import {
	CreateBatchNotificationData,
	CreateNotificationParams,
	Notification,
	NotificationDB,
	NotificationQuery,
	UpdateNotificationMap
} from '../schema/notifications'
import { Repository } from './index'
import { GetNotificationsQuery } from './notifications'
import notificationRepo from './repo'
import { Repository as ClassRepo } from '../classes'
import { Repository as StudentRepo } from '../students'
import studentRepo from '../students/repo'
import classRepo from '../classes/repo'

export class Controller {
	constructor(
		private readonly repo: Repository,
		private readonly classRepo: ClassRepo,
		private readonly studentRepo: StudentRepo
	) {}

	private convertToEntityQuery(
		query: GetNotificationsQuery
	): NotificationQuery {
		let page: number = query.page ?? 0
		let pageSize = query.pageSize ?? 10
		if (query.page !== undefined && query.page <= 0) {
			page = 0
		}
		if (query.pageSize !== undefined && query.pageSize <= 0) {
			pageSize = 10
		}

		if (query.pageSize !== undefined && query.pageSize > 100) {
			pageSize = 100
		}

		return { pageSize, page }
	}

	create(params: CreateNotificationParams[]) {
		return this.repo.create(params).catch(AppError.handleAppErr)
	}

	createBatch(data: CreateBatchNotificationData) {
		return this.repo.createBatch(data).catch(AppError.handleAppErr)
	}

	async find(query: GetNotificationsQuery): Promise<Notification[]> {
		const q: NotificationQuery = this.convertToEntityQuery(query)
		return await this.repo.find(q).catch(AppError.handleAppErr)
		/* const notifications = await this.repo
            .find(q)
            .catch(AppError.handleAppErr)
        if (!notifications || notifications.length === 0) {
            return []
        }

        const allItems = notifications.flatMap((noti) => noti.items || [])

        if (allItems.length === 0) {
            return notifications
        }

        // Load polymorphic data for all items at once (more efficient)
        const enrichedItems = await this.loadPolymorphicData(allItems)

        // Create a lookup map for enriched items by their original item ID
        const enrichedItemsMap = new Map(
            enrichedItems.map((item, index) => [allItems[index].id, item])
        )

        // Map notifications with their enriched items
        const enrichedNotifications: Notification[] = notifications.map(
            (noti) => ({
                ...noti,
                items: (noti.items || []).map((item) => {
                    const enrichedItem = enrichedItemsMap.get(item.id)
                    return enrichedItem || item
                })
            })
        )

        return enrichedNotifications */
	}

	markAsRead(ids: Array<string>): Promise<Array<NotificationDB>> {
		const updateNotiMap: UpdateNotificationMap = ids.map((id) => ({
			id,
			updatePayload: {
				readAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
			}
		}))
		return this.repo.update(updateNotiMap).catch(AppError.handleAppErr)
	}

	private async loadPolymorphicData<
		T extends { notifiableType: string; notifiableId: number; id?: any }
	>(items: T[]): Promise<(T & { relatedData: any })[]> {
		if (items.length === 0) return []

		// Group items by type and collect unique IDs
		const itemsByType = items.reduce(
			(acc, item) => {
				if (!acc[item.notifiableType]) {
					acc[item.notifiableType] = new Set()
				}
				acc[item.notifiableType].add(item.notifiableId)
				return acc
			},
			{} as Record<string, Set<number>>
		)

		// Load data for each type
		const loadPromises = Object.entries(itemsByType).map(
			async ([type, idSet]) => {
				const ids = Array.from(idSet)

				try {
					switch (type) {
						case 'classes': {
							const classData = await this.classRepo.find({ ids })
							return {
								type,
								data: classData || []
							}
						}
						case 'students': {
							const studentData = await this.studentRepo.find({
								ids
							})
							return {
								type,
								data: studentData || []
							}
						}
						default:
							console.warn(`Unknown notifiable type: ${type}`)
							return { type, data: [] }
					}
				} catch (error) {
					console.error(`Error loading ${type} data:`, error)
					return { type, data: [] }
				}
			}
		)

		const loadedData = await Promise.all(loadPromises)

		// Create lookup maps by type and ID
		const dataLookup = loadedData.reduce(
			(acc, { type, data }) => {
				acc[type] = new Map(data.map((item) => [item.id, item]))
				return acc
			},
			{} as Record<string, Map<number, any>>
		)

		// Enrich items with related data
		return items.map((item) => {
			const typeMap = dataLookup[item.notifiableType]
			const relatedData = typeMap?.get(item.notifiableId) || null

			// Debug logging (remove in production)
			if (!relatedData) {
				console.log(
					`No related data found for ${item.notifiableType}:${item.notifiableId}`
				)
			}

			return {
				...item,
				relatedData
			}
		})
	}

	getUnreadCount(): Promise<number> {
		return this.repo.unreadCount()
	}
}

const notificationController = new Controller(
	notificationRepo,
	classRepo,
	studentRepo
)

export default notificationController
