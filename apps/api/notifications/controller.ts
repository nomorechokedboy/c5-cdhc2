import log from 'encore.dev/log'
import { AppError } from '../errors/index'
import {
	CreateBatchNotificationData,
	CreateNotificationParams,
	Notification,
	NotificationQuery
} from '../schema/notifications'
import { Repository } from './index'
import { GetNotificationsQuery } from './notifications'
import notificationRepo from './repo'

export class Controller {
	constructor(private readonly repo: Repository) {}

	create(params: CreateNotificationParams[]) {
		return this.repo.create(params).catch(AppError.handleAppErr)
	}

	createBatch(data: CreateBatchNotificationData) {
		return this.repo.createBatch(data).catch(AppError.handleAppErr)
	}

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

	async find(query: GetNotificationsQuery): Promise<Notification[]> {
		const q: NotificationQuery = this.convertToEntityQuery(query)
		return this.repo.find(q).catch(AppError.handleAppErr)
	}
}

const notificationController = new Controller(notificationRepo)

export default notificationController
