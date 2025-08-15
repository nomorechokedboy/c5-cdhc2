import { api } from 'encore.dev/api'
import notificationController from './controller'
import log from 'encore.dev/log'
import { Subscription } from 'encore.dev/pubsub'
import { notiTopic } from '../topics'
import NotificationBroadcaster from './broadcaster'

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

interface Handshake {
	userId: number
}

export interface Message {
	type:
		| 'ping'
		| 'birthdayThisWeek'
		| 'birthdayThisMonth'
		| 'birthdayThisQuarter'
		| 'cpvOfficialThisWeek'
		| 'cpvOfficialThisMonth'
		| 'cpvOfficialThisQuarter'
	data: { title: string; message: string; userId: number }
}

const notificationBroadcaster = new NotificationBroadcaster()

export const NotificationStream = api.streamOut<Handshake, Message>(
	{ expose: true, path: '/notifications/stream' },
	async ({ userId }, stream) => {
		log.trace(`Starting notification stream for user ${userId}`)

		notificationBroadcaster.addStream(userId, stream)

		try {
			log.trace('Starting heartbeat stream')

			// Keep the stream alive with heartbeats
			for await (const hb of heartbeatGenerator()) {
				const hbStr = hb.toString()
				await stream.send({
					type: 'ping',
					data: { message: hbStr, title: hbStr, userId: userId }
				})
			}
		} catch (err) {
			log.error('Stream error:', err)
		} finally {
			notificationBroadcaster.handleStreamDisconnect(userId, stream)
		}
	}
)

const _ = new Subscription(notiTopic, 'notification-processor', {
	handler: async (event) => {
		log.trace('Processing notification event', { event })

		// Use the broadcaster to send the message
		await notificationBroadcaster.sendToUser(event.userId, {
			type: event.type,
			data: {
				message: event.message,
				title: event.title,
				userId: event.userId
			}
		})
	}
})

async function* heartbeatGenerator(
	intervalMs: number = 25000,
	payload: string | Buffer = 'ping'
): AsyncGenerator<string | Buffer, never, unknown> {
	while (true) {
		yield payload
		await new Promise<void>((resolve) => setTimeout(resolve, intervalMs))
	}
}
