import { Service } from 'encore.dev/service'
import { authzMiddleware, permissionMiddleware } from '../middleware/authz'

export default new Service('leave-management', {
	middlewares: [authzMiddleware, permissionMiddleware]
})
