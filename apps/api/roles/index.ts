import { CreateRoleRequest, Role, RoleDB, UpdateRoleRequest } from '../schema'

export interface Repository {
	create(params: CreateRoleRequest): Promise<RoleDB>
	delete(ids: number[]): Promise<RoleDB[]>
	find(): Promise<Role[]>
	findOne(id: number): Promise<Role | undefined>
	update(params: UpdateRoleRequest): Promise<RoleDB>
}
