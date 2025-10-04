import { ObjectStorage } from '../objectStorage/objectStorage'

export interface FileData {
	filename: string
	buffer: Buffer
}

export interface StorageObject {
	stream: NodeJS.ReadableStream
	contentType?: string
	contentLength?: number
}

export interface UploadResult {
	uris: string[]
}

/**
 * Generate storage key for a file
 */
export function generateStorageKey(userId: string, filename: string): string {
	return `${userId}-${filename}`
}

/**
 * Save multiple files to storage
 */
export async function saveFiles(
	files: FileData[],
	userId: string,
	storage: ObjectStorage
): Promise<string[]> {
	const uris: string[] = []

	for (const file of files) {
		const key = generateStorageKey(userId, file.filename)
		const result = await storage.PutObject({ Key: key, Body: file.buffer })
		uris.push(result.Key)
	}

	return uris
}

/**
 * Retrieve file metadata from storage
 */
export async function retrieveFile(
	fileUri: string,
	storage: ObjectStorage
): Promise<{
	stream: NodeJS.ReadableStream
	contentType: string
	contentLength?: number
	etag: string
}> {
	const resp = await storage.GetObject({ Key: fileUri })

	return {
		stream: resp.Body,
		contentType: resp.ContentType || 'application/octet-stream',
		contentLength: resp.ContentLength,
		etag: fileUri
	}
}

/**
 * Validate file URI
 */
export function validateFileUri(fileUri: string | undefined): string {
	if (!fileUri || fileUri.trim() === '') {
		throw new Error('File URI is required')
	}
	return fileUri
}

/**
 * Get cache headers for media files
 */
export function getCacheHeaders() {
	return {
		'Cache-Control': 'public, max-age=31536000',
		maxAge: 31536000
	}
}
