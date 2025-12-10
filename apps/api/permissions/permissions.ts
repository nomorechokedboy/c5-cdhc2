import { api } from 'encore.dev/api'
import permissionController from './controller'
import { Permission } from '../schema'

interface CreatePermissionRequest {
	actionId: number
	resourceId: number
}

interface CreatePermissionResponse {
	data: Permission
}

export const CreatePermission = api(
	{ auth: true, expose: true, method: 'POST', path: '/permissions' },
	async (req: CreatePermissionRequest) => {
		const { resourceId, actionId } = req

		const _reps = await permissionController.create({
			resourceId,
			actionId
		})

		return {}
	}
)

interface GetPermissionsResponse {
	data: Permission[]
}

export const GetPermissions = api(
	{ auth: true, expose: true, method: 'GET', path: '/permissions' },
	async (): Promise<GetPermissionsResponse> => {
		const data = await permissionController.find()

		return { data }
	}
)

interface GetPermissionResponse {
	data: Permission | undefined
}

export const GetPermission = api(
	{ auth: true, expose: true, method: 'GET', path: '/permissions/:id' },
	async ({ id }: { id: number }): Promise<GetPermissionResponse> => {
		const data = await permissionController.findOne(id)

		return { data }
	}
)
