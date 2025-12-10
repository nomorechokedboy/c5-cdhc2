import { api } from 'encore.dev/api'
import { CreateRoleRequest, UpdateRoleRequest, Role } from '../schema'
import roleController from './controller'

interface CreateRoleResponse {
	data: Role
}

interface GetRolesResponse {
	data: Role[]
}

interface GetRoleResponse {
	data: Role | undefined
}

interface UpdateRoleResponse {
	data: Role
}

interface DeleteRoleResponse {
	ids: number[]
}

export const CreateRole = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/roles'
	},
	async (req: CreateRoleRequest): Promise<CreateRoleResponse> => {
		const data = await roleController.create(req)
		return { data: data as Role }
	}
)

export const GetRoles = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/roles'
	},
	async (): Promise<GetRolesResponse> => {
		const data = await roleController.find()
		return { data }
	}
)

export const GetRole = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/roles/:id'
	},
	async ({ id }: { id: number }): Promise<GetRoleResponse> => {
		const data = await roleController.findOne(id)
		return { data }
	}
)

export const UpdateRole = api(
	{
		auth: true,
		expose: true,
		method: 'PUT',
		path: '/roles/:id'
	},
	async (req: UpdateRoleRequest): Promise<UpdateRoleResponse> => {
		const data = await roleController.update(req)
		return { data: data as Role }
	}
)

export const DeleteRoles = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/roles'
	},
	async ({ ids }: { ids: number[] }): Promise<DeleteRoleResponse> => {
		await roleController.delete(ids)
		return { ids }
	}
)
