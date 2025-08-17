import { CreateResourceRequest, Resource, ResourceDB } from '../schema'

export interface Repository {
	create(params: CreateResourceRequest): Promise<ResourceDB>
	find(): Promise<Resource[]>
	findOne(id: number): Promise<Resource | undefined>
}
