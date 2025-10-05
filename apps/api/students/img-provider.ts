// Pure business logic for image handling

export interface ImageProvider {
	getImageBuffer(key: string): Promise<Buffer>
}

export interface ImageData {
	width: number
	height: number
	data: Buffer
	extension: string
}

/**
 * Convert stream to buffer
 */
export async function streamToBuffer(
	stream: NodeJS.ReadableStream
): Promise<Buffer> {
	const chunks: Buffer[] = []

	return new Promise((resolve, reject) => {
		stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
		stream.on('error', (err) => reject(err))
		stream.on('end', () => resolve(Buffer.concat(chunks)))
	})
}

/**
 * Get image data from storage
 */
export async function getImageData(
	imageKey: string,
	provider: ImageProvider,
	dimensions: { width: number; height: number }
): Promise<ImageData> {
	const buffer = await provider.getImageBuffer(imageKey)
	const extension = extractExtension(imageKey)

	return {
		width: dimensions.width,
		height: dimensions.height,
		data: buffer,
		extension
	}
}

const validImgExt = ['.png', '.gif', '.jpg', '.jpeg', '.svg']

/**
 * Extract file extension from key
 */
function extractExtension(key: string): string {
	const parts = key.split('.')
	const extension = `.${parts[parts.length - 1]}`
	if (!validImgExt.includes(extension)) {
		return '.png'
	}

	return extension
}

/**
 * Create image injection function for document templates
 */
export function createImageInjector(
	imageKey: string,
	provider: ImageProvider,
	dimensions: { width: number; height: number }
) {
	return async (): Promise<ImageData> => {
		return getImageData(imageKey, provider, dimensions)
	}
}
