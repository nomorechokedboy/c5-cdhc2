import { Service } from 'encore.dev/service'
import { authzMiddleware } from '../middleware/authz'

export default new Service('classes', {
	middlewares: [authzMiddleware]
})
