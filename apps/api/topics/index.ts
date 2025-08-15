import { Topic } from 'encore.dev/pubsub'

export interface NotificationEvent {
	userId: number
	title: string
	message: string
	type:
		| 'birthdayThisWeek'
		| 'birthdayThisMonth'
		| 'birthdayThisQuarter'
		| 'cpvOfficialThisWeek'
		| 'cpvOfficialThisMonth'
		| 'cpvOfficialThisQuarter'
}

export const notiTopic = new Topic<NotificationEvent>('notification-events', {
	deliveryGuarantee: 'at-least-once'
})
