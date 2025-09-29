import {
	GetObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3'
import {
	GetObjectRequest,
	GetObjectResponse,
	ObjectStorage,
	PutObjectRequest,
	PutObjectResponse
} from './objectStorage'
import { appConfig } from '../configs'
import log from 'encore.dev/log'
import { AppError } from '../errors'
import { Readable } from 'stream'

class minioObjectStorage implements ObjectStorage {
	constructor(private readonly client: S3Client) {}

	async PutObject(req: PutObjectRequest): Promise<PutObjectResponse> {
		try {
			await this.client.send(
				new PutObjectCommand({
					Bucket: req.Bucket ?? appConfig.S3_DEFAULT_BUCKET,
					Key: req.Key,
					Body: req.Body
				})
			)

			log.info(`Successfully uploaded ${req.Bucket}/${req.Key}`)
			return { Key: req.Key, Bucket: req.Bucket! }
		} catch (err) {
			console.log('Error PutObject', err)
			log.error('PutObject error', { err: err, request: req })
			throw AppError.internal('Internal error')
		}
	}

	async GetObject(req: GetObjectRequest): Promise<GetObjectResponse> {
		try {
			const command = new GetObjectCommand({
				Bucket: req.Bucket ?? appConfig.S3_DEFAULT_BUCKET,
				Key: req.Key
			})

			const response = await this.client.send(command)

			if (!response.Body) {
				throw AppError.notFound('File not found')
			}

			return {
				Body: response.Body as Readable,
				ContentType: response.ContentType,
				ContentLength: response.ContentLength
			}
		} catch (err: any) {
			console.log('Error GetObject', err)

			// Handle specific S3 errors
			if (
				err.name === 'NoSuchKey' ||
				err.$metadata?.httpStatusCode === 404
			) {
				log.warn('File not found', { request: req })
				throw AppError.notFound('File not found')
			}

			log.error('GetObject error', { err: err, request: req })
			throw AppError.internal('Internal error')
		}
	}
}

const s3Client = new S3Client({
	credentials: {
		accessKeyId: appConfig.S3_ACCESS_KEY,
		secretAccessKey: appConfig.S3_SECRET_KEY
	},
	endpoint: appConfig.S3_ENDPOINT,
	forcePathStyle: true,
	region: appConfig.S3_REGION
})

export const MinIO = new minioObjectStorage(s3Client)
