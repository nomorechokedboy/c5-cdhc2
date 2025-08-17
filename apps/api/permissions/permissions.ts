import { api } from 'encore.dev/api'
import permissionController from './controller'

interface CreatePermissionRequest {
	actionId: number
	resourceId: number
}

export const CreatePermission = api(
	{ expose: true, method: 'POST', path: '/permissions' },
	async (req: CreatePermissionRequest) => {
		const { resourceId, actionId } = req

		const _reps = await permissionController.create({
			resourceId,
			actionId
		})

		return {}
	}
)
