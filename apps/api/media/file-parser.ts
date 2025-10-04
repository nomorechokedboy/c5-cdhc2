import busboy from 'busboy'
import { IncomingHttpHeaders } from 'http'
import { FileData } from './controller'

interface FileEntry {
	data: Buffer[]
	filename: string
}

/**
 * Parse multipart form data and extract files
 */
export async function parseMultipartFiles(
	stream: NodeJS.ReadableStream,
	headers: IncomingHttpHeaders
): Promise<FileData[]> {
	return new Promise((resolve, reject) => {
		const bb = busboy({ headers })
		const entries: FileEntry[] = []

		bb.on('file', (_, file, info) => {
			const entry: FileEntry = { filename: info.filename, data: [] }

			file.on('data', (data) => {
				entry.data.push(data)
			})
				.on('close', () => {
					entries.push(entry)
				})
				.on('error', (err) => {
					bb.emit('error', err)
				})
		})

		bb.on('close', () => {
			const files: FileData[] = entries.map((entry) => ({
				filename: entry.filename,
				buffer: Buffer.concat(entry.data)
			}))
			resolve(files)
		})

		bb.on('error', (err) => {
			reject(err)
		})

		stream.pipe(bb)
	})
}
