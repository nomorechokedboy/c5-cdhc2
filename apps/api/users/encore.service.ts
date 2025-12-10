import { Service } from 'encore.dev/service'
import { permissionMiddleware } from '../middleware/authz'

export default new Service('users', {
	middlewares: [permissionMiddleware]
})
