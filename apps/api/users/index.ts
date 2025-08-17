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
	find(): Promise<User[]>
	findOne(user: UserDB): Promise<User>
	update(params: Omit<UpdateUserRequest, 'roleIds'>): Promise<UserDB>
	findUserPermissions(id: number): Promise<UserPermissions[]>
}
