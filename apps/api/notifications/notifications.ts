import { api } from 'encore.dev/api'
import notificationController from './controller'
import log from 'encore.dev/log'

export interface GetNotificationsQuery {
	page?: number
	pageSize?: number
}

interface NotificationItemResponse {
	id: number
	createdAt: string
	updatedAt: string

	notifiableType: 'classes' | 'students'
	notifiableId: number

	notificationId: string
}

interface NotificationResponse {
	id: string
	createdAt: string
	readAt: string

	notificationType: 'birthday' | 'officialCpv'
	title: string
	message: string

	isBatch: boolean
	batchKey: string
	totalCount: number

	items: Array<NotificationItemResponse>
}

interface GetNotificationsResponse {
	data: Array<NotificationResponse>
}

export const GetNotifications = api(
	{ expose: true, method: 'GET', path: '/notifications' },
	async (q: GetNotificationsQuery): Promise<GetNotificationsResponse> => {
		const resp = await notificationController.find(q).then((data) =>
			data.map(
				(n) =>
					({
						...n
					}) as NotificationResponse
			)
		)

		return { data: resp }
	}
)

interface MarkAsReadRequest {
	ids: Array<string>
}

export const MarkAsRead = api(
	{ expose: true, method: 'PATCH', path: '/notifications/mark-as-read' },
	async ({ ids }: MarkAsReadRequest) => {
		await notificationController.markAsRead(ids)

		return {}
	}
)

interface GetUnreadCountResponse {
	data: { count: number }
}

export const GetUnreadCount = api(
	{ expose: true, method: 'GET', path: '/notifications/unread' },
	async (): Promise<GetUnreadCountResponse> => {
		const count = await notificationController.getUnreadCount()

		return { data: { count } }
	}
)
