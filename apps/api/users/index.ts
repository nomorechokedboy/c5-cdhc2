import {
	CreateUserRequest,
	UpdateUserRequest,
	User,
	UserDB,
	UserPermissions
} from '../schema'

export interface Repository {
	create(params: Omit<CreateUserRequest, 'roleIds'>): Promise<UserDB>
	delete(ids: number[]): Promise<UserDB[]>
	find(params?: { isAdmin?: boolean }): Promise<User[]>
	findByIds(ids: number[]): Promise<UserDB[]>
	findOne(user: UserDB): Promise<User>
	update(params: UpdateUserRequest): Promise<UserDB>
	findUserPermissions(id: number): Promise<UserPermissions[]>
}
