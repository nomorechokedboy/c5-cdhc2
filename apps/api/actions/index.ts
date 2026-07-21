import { Action, CreateActionRequest } from '../schema/actions'

export interface Repository {
	create(params: CreateActionRequest): Promise<Action>
	find(): Promise<Action[]>
	findOne(id: number): Promise<Action | undefined>
}
