import { api } from 'encore.dev/api'
import userController from './controller'
import { getAuthData } from '~encore/auth'

interface CreateUserRequest {
	username: string
	password: string
	displayName: string
	unitId: number
}

interface UpdateUserRequest {
	id: number
	displayName: string
	unitId?: number
}

interface CreateUserResponse {
	data: UserDB
}

interface UpdateUserResponse {
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
		const { username, password, displayName, unitId } = req

		const data = await userController
			.create({ password, username, displayName, unitId })
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)

export const UpdateUser = api(
	{ expose: true, method: 'PUT', path: '/users' },
	async (req: UpdateUserRequest): Promise<UpdateUserResponse> => {
		const { id, displayName, unitId } = req
		const validUnitIds = getAuthData()!.validUnitIds
		const data = await userController
			.update({ id, displayName, unitId }, validUnitIds)
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)
