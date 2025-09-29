import { api } from 'encore.dev/api'
import log from 'encore.dev/log'
import busboy from 'busboy'
import { MinIO } from '../objectStorage/minio'
import { APICallMeta, currentRequest } from 'encore.dev'
import { getAuthData } from '~encore/auth'

type FileEntry = { data: any[]; filename: string }

export const UploadFiles = api.raw(
	{ auth: true, expose: true, method: 'POST', path: '/media/upload' },
	async (req, res) => {
		const uId = getAuthData()!.userID
		const bb = busboy({
			headers: req.headers
		})
		const entries: FileEntry[] = []

		bb.on('file', (_, file, info) => {
			const entry: FileEntry = { filename: info.filename, data: [] }
			file.on('data', (data) => {
				entry.data.push(data)
			})
				.on('close', () => {
					log.info(`File ${entry.filename} uploaded`)
					entries.push(entry)
				})
				.on('error', (err) => {
					log.error('busboy error', { err })

					bb.emit('error', err)
				})
		})

		bb.on('close', async () => {
			try {
				const uris: string[] = []

				for (const entry of entries) {
					log.info('Processing entry', { filename: entry.filename })
					const buf = Buffer.concat(entry.data)
					log.info(`File ${entry.filename} saved`)
					const resp = await MinIO.PutObject({
						Body: buf,
						Key: `${uId}-${entry.filename}`
					})
					uris.push(resp.Key)
				}

				// Redirect to the root page
				res.writeHead(200, { 'Content-Type': 'application/json' })
				res.end(JSON.stringify({ data: { uris } }))
			} catch (err) {
				log.error('busboy error', { err })

				bb.emit('error', err)
			}
		})

		bb.on('error', async (err) => {
			res.writeHead(500, { Connection: 'close' })
			res.end(`Error: ${(err as Error).message}`)
		})

		req.pipe(bb)
		return
	}
)

export const GetMedia = api.raw(
	{ expose: true, method: 'GET', path: '/media/:fileUri' },
	async (req, res) => {
		try {
			const { fileUri } = (currentRequest() as APICallMeta).pathParams

			if (!fileUri) {
				res.writeHead(400, {
					'Content-Type': 'application/json',
					connection: 'close'
				})
				res.end(JSON.stringify({ error: 'File URI is required' }))
				return
			}

			log.info('Fetching media file', { fileUri })

			// Get the file from S3/MinIO
			const file = await MinIO.GetObject({
				Key: fileUri
			})

			// Set appropriate headers
			res.setHeader(
				'Content-Type',
				file.ContentType || 'application/octet-stream'
			)

			if (file.ContentLength) {
				res.setHeader('Content-Length', file.ContentLength.toString())
			}

			// Set cache headers (optional but recommended)
			res.setHeader('Cache-Control', 'public, max-age=31536000') // 1 year
			res.setHeader('ETag', `"${fileUri}"`)

			// Stream the file to the response
			file.Body.pipe(res)

			// Handle streaming errors
			file.Body.on('error', (err) => {
				log.error('Stream error', { err, fileUri })
				if (!res.headersSent) {
					res.writeHead(500, { connection: 'close' })
					res.end(JSON.stringify({ error: 'Error streaming file' }))
					return
				}
			})
		} catch (err: any) {
			log.error('Error serving media', { err })

			if (err.message === 'File not found') {
				res.writeHead(404, { connection: 'close' })
				res.end(JSON.stringify({ error: 'File not found' }))
				return
			} else {
				res.writeHead(500, { connection: 'close' })
				res.end(JSON.stringify({ error: 'Internal server error' }))
				return
			}
		}
	}
)
