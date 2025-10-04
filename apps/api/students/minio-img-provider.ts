import { MinIO } from '../objectStorage/minio'
import { ObjectStorage } from '../objectStorage/objectStorage'
import { ImageProvider, streamToBuffer } from './img-provider'

/**
 * Adapter for object storage that implements ImageProvider interface
 */
class objectStorageImageAdapter implements ImageProvider {
	constructor(private readonly storage: ObjectStorage) {}

	async getImageBuffer(key: string): Promise<Buffer> {
		try {
			const response = await this.storage.GetObject({ Key: key })

			// Convert stream to buffer
			const buffer = await streamToBuffer(response.Body)

			return buffer
		} catch (err) {
			throw new Error(
				`Failed to fetch image from storage: ${(err as Error).message}`
			)
		}
	}
}

export const ObjectStorageImageAdapter = new objectStorageImageAdapter(MinIO)
