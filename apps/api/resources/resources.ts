import { api } from 'encore.dev/api'
import resourceController from './controller'
import { Resource } from '../schema'

interface GetResourcesResponse {
	data: Resource[]
}

export const GetResources = api(
	{ auth: true, expose: true, method: 'GET', path: '/resources' },
	async (): Promise<GetResourcesResponse> => {
		const data = await resourceController.find()
		return { data }
	}
)
