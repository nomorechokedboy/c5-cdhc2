import { api } from 'encore.dev/api'
import userController from './controller'
import { getAuthData } from '~encore/auth'

interface CreateUserRequest {
	username: string
	password: string
	displayName: string
	unitId: number
	isSuperUser?: boolean
}

interface UpdateUserRequest {
	id: number
	displayName: string
	unitId?: number
	isSuperUser?: boolean
}
interface GetUserRequest {
	id: number
	username: string
	displayName: string
	unitId: number
}
interface GetUserResponse {
	data: UserResponse[]
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
interface UserResponse {
	id: number
	createdAt: string
	updatedAt: string
	username: string
	password: string
	displayName: string
	unitId: number
}
interface BulkUserResponse {
	data: UserResponse[]
}

export interface User extends UserDB {
	roles: RoleDB[]
}
interface GetUsersResponse extends BulkUserResponse {}

export const GetUsers = api(
	{ expose: true, method: 'GET', path: '/users' },
	async (): Promise<GetUserResponse> => {
		const data = await userController.find()
		const resp = data.map(
			(c) =>
				({
					...c
				}) as UserResponse
		)

		return { data: resp }
	}
)

export const CreateUser = api(
	{ expose: true, method: 'POST', path: '/users' },
	async (req: CreateUserRequest): Promise<CreateUserResponse> => {
		const { username, password, displayName, unitId, isSuperUser } = req

		const data = await userController
			.create({ password, username, displayName, unitId, isSuperUser })
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)

export const UpdateUser = api(
	{ expose: true, auth: true, method: 'PUT', path: '/users' },
	async (req: UpdateUserRequest): Promise<UpdateUserResponse> => {
		const { id, displayName, unitId, isSuperUser } = req
		const validUnitIds = getAuthData()!.validUnitIds
		// Debug
		const authData = getAuthData()
		console.log('Auth Data:', authData)
		console.log('Valid Unit IDs:', authData?.validUnitIds)

		if (!authData) {
			throw new Error('Không tìm thấy thông tin xác thực')
		}

		if (!authData.validUnitIds) {
			throw new Error('Không tìm thấy validUnitIds trong auth data')
		}
		const updatedAt = new Date().toISOString()
		const data = await userController
			.update({ id, displayName, unitId, isSuperUser }, validUnitIds)
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)
interface DeleteUserRequest {
	ids: number[]
}
interface DeleteUserResponse {
	ids: number[]
}
export const DeleteUsers = api(
	{ expose: true, auth: true, method: 'DELETE', path: '/users' },
	async (body: DeleteUserRequest): Promise<DeleteUserResponse> => {
		console.log('users.DeleteStudents body', { body })
		const users = body.ids
		const validUnitIds = getAuthData()!.validUnitIds
		await userController.delete(users, validUnitIds)

		return { ids: body.ids }
	}
)
