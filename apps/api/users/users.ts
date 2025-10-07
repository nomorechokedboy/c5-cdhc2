import { api } from 'encore.dev/api'
import userController from './controller'

interface CreateUserRequest {
	username: string
	password: string
	displayName: string
	unitid: number
}

interface CreateUserResponse {
	data: UserDB
}

interface UserDB extends Omit<CreateUserRequest, 'password'> {
	id: number
	createdAt: string
	updatedAt: string
}

interface RoleDB {
	id: number
	createdAt: string
	updatedAt: string
	name: string
	description?: string
}

export interface User extends UserDB {
	roles: RoleDB[]
}

export const CreateUser = api(
	{ expose: true, method: 'POST', path: '/users' },
	async (req: CreateUserRequest): Promise<CreateUserResponse> => {
		const { username, password, displayName, unitid } = req

		const data = await userController
			.create({ password, username, displayName, unitid })
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)

export const UpdateUser = api(
	{ expose: true, method: 'POST', path: '/users' },
	async (req: CreateUserRequest): Promise<CreateUserResponse> => {
		const { username, password, displayName, unitid } = req

		const data = await userController
			.create({ password, username, displayName, unitid })
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)
