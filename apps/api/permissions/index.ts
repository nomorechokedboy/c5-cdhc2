import { CreatePermissionRequest, Permission, PermissionDB } from '../schema'

export interface Repository {
	create(params: CreatePermissionRequest): Promise<Permission>
	find(): Promise<Permission[]>
}
