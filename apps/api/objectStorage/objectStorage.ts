import { Readable } from 'stream'

export type PutObjectRequest = {
	Bucket?: string
	Key: string
	Body: Buffer
}

export type PutObjectResponse = {
	Key: string
	Bucket: string
}

export interface GetObjectRequest {
	Bucket?: string
	Key: string
}

export interface GetObjectResponse {
	Body: Readable
	ContentType?: string
	ContentLength?: number
}

export interface ObjectStorage {
	PutObject(req: PutObjectRequest): Promise<PutObjectResponse>
	GetObject(req: GetObjectRequest): Promise<GetObjectResponse>
}
