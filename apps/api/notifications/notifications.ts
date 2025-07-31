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
