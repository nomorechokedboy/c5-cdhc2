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

export class Controller {
	constructor(private readonly repo: Repository) {}

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

	find(query: GetNotificationsQuery): Promise<Notification[]> {
		const q: NotificationQuery = this.convertToEntityQuery(query)
		return this.repo.find(q).catch(AppError.handleAppErr)
	}

	markAsRead(ids: Array<string>): Promise<Array<NotificationDB>> {
		const updateNotiMap: UpdateNotificationMap = ids.map((id) => ({
			id,
			updatePayload: {
				readAt: dayjs().format('YYYY-MM-DD HH:mm:ss')
			}
		}))
		return this.repo
			.update(updateNotiMap)
			.catch(AppError.handleAppErr)
	}
}

const notificationController = new Controller(notificationRepo)

export default notificationController
