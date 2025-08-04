import {
	CreateBatchNotificationData,
	CreateNotificationParams,
	Notification,
	NotificationDB,
	NotificationQuery,
	UpdateNotificationMap
} from '../schema/notifications'

export interface Repository {
	create(params: CreateNotificationParams[]): Promise<NotificationDB[]>
	createBatch(params: CreateBatchNotificationData): Promise<NotificationDB>
	delete(params: NotificationDB[]): Promise<NotificationDB[]>
	find(q: NotificationQuery): Promise<Notification[]>
	update(params: UpdateNotificationMap): Promise<NotificationDB[]>
	unreadCount(): Promise<number>
}
