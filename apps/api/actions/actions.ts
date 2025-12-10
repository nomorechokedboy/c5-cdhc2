import { api } from 'encore.dev/api'
import actionController from './controller'
import { Action } from '../schema'

interface GetActionsResponse {
	data: Action[]
}

export const GetActions = api(
	{ auth: true, expose: true, method: 'GET', path: '/actions' },
	async (): Promise<GetActionsResponse> => {
		const data = await actionController.find()
		return { data }
	}
)
