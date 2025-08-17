import { api } from 'encore.dev/api'
import userController from './controller'

interface CreateUserRequest {
	username: string
	password: string
}

interface CreateUserResponse {
	data: UserDB
}

interface UserDB extends Omit<CreateUserRequest, 'password'> {
	id: number
	createdAt: string
	updatedAt: string
}

export const CreateUser = api(
	{ expose: true, method: 'POST', path: '/users' },
	async (req: CreateUserRequest): Promise<CreateUserResponse> => {
		const { username, password } = req

		const data = await userController
			.create({ password, username })
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)
