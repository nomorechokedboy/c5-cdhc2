import { CreatePermissionRequest, Permission, PermissionDB } from '../schema'

export interface Repository {
	create(params: CreatePermissionRequest): Promise<Permission>
	find(): Promise<Permission[]>
	findOne(id: number): Promise<Permission | undefined>
}
