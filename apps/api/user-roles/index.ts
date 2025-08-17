import { AssignRoleRequest } from '../schema'

export interface Repository {
	assignRolesToUser(params: AssignRoleRequest): Promise<void>
}
