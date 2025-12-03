import { api } from 'encore.dev/api'
import userController from './controller'
import { getAuthData } from '~encore/auth'
import { AppError } from '../errors'

interface CreateUserRequest {
	username: string
	password: string
	displayName: string
	unitId?: number
	isSuperUser?: boolean
	status?: string
}

interface UpdateUserRequest {
	id: number
	displayName?: string
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
	{ expose: true, auth: true, method: 'POST', path: '/users' },
	async (req: CreateUserRequest): Promise<CreateUserResponse> => {
		const isAdmin = getAuthData()!.isSuperUser
		if (!isAdmin) {
			AppError.handleAppErr(AppError.permissionDenied('Unauthorized'))
		}

		const { username, password, displayName, unitId, isSuperUser, status } =
			req

		const data = await userController
			.create({
				password,
				username,
				displayName,
				unitId,
				isSuperUser,
				status
			})
			.then(({ password: _, ...user }) => ({ ...(user as UserDB) }))

		return { data }
	}
)

export const UpdateUser = api(
	{ expose: true, auth: true, method: 'PUT', path: '/users' },
	async (req: UpdateUserRequest): Promise<UpdateUserResponse> => {
		const { id, displayName, unitId, isSuperUser } = req
		const data = await userController
			.update({ id, displayName, unitId, isSuperUser })
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

interface IsInitAdminResponse {
	data: boolean
}

export const IsInitAdmin = api(
	{ expose: true, method: 'GET', path: '/users/check-init-admin' },
	async (): Promise<IsInitAdminResponse> => {
		const result = await userController.isInitAdmin()

		return { data: result }
	}
)

interface InitAdminRequest {
	username: string
	password: string
	displayName: string
}

interface InitAdminResponse {}

export const InitAdmin = api(
	{ auth: false, expose: true, method: 'POST', path: '/users/init-admin' },
	async (req: InitAdminRequest): Promise<InitAdminResponse> => {
		await userController.initAdmin({
			username: req.username,
			displayName: req.displayName,
			password: req.password
		})

		return {}
	}
)
