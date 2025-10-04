import { api } from 'encore.dev/api'
import { APICallMeta, currentRequest } from 'encore.dev'
import { getAuthData } from '~encore/auth'
import { parseMultipartFiles } from './file-parser'
import { logger } from '../logger/encore-logger'
import {
	getCacheHeaders,
	retrieveFile,
	saveFiles,
	validateFileUri
} from './controller'
import { MinIO } from '../objectStorage/minio'

export const UploadFiles = api.raw(
	{ auth: true, expose: true, method: 'POST', path: '/media/upload' },
	async (req, res) => {
		try {
			const userId = getAuthData()!.userID

			logger.info('Starting file upload', { userId })

			// Parse files from multipart form data
			const files = await parseMultipartFiles(req, req.headers)

			logger.info('Files parsed', { count: files.length })

			// Save files to storage
			const uris = await saveFiles(files, userId, MinIO)

			logger.info('Files saved successfully', { count: uris.length })

			res.writeHead(200, { 'Content-Type': 'application/json' })
			res.end(JSON.stringify({ data: { uris } }))
		} catch (err) {
			logger.error('Upload error', { err })
			res.writeHead(500, { Connection: 'close' })
			res.end(`Error: ${(err as Error).message}`)
		}
	}
)

export const GetMedia = api.raw(
	{ expose: true, method: 'GET', path: '/media/:fileUri' },
	async (req, res) => {
		try {
			const { fileUri } = (currentRequest() as APICallMeta).pathParams

			// Validate input
			const validatedUri = validateFileUri(fileUri)

			logger.info('Fetching media file', { fileUri: validatedUri })

			// Retrieve file from storage
			const file = await retrieveFile(validatedUri, MinIO)

			// Get cache headers
			const cacheHeaders = getCacheHeaders()

			// Set response headers
			res.setHeader('Content-Type', file.contentType)

			if (file.contentLength) {
				res.setHeader('Content-Length', file.contentLength.toString())
			}

			res.setHeader('Cache-Control', cacheHeaders['Cache-Control'])
			res.setHeader('ETag', `"${file.etag}"`)

			// Stream the file to the response
			file.stream.pipe(res)

			// Handle streaming errors
			file.stream.on('error', (err) => {
				logger.error('Stream error', { err, fileUri: validatedUri })
				if (!res.headersSent) {
					res.writeHead(500, { connection: 'close' })
					res.end(JSON.stringify({ error: 'Error streaming file' }))
				}
			})
		} catch (err: any) {
			logger.error('Error serving media', { err })

			if (err.message === 'File URI is required') {
				res.writeHead(400, {
					'Content-Type': 'application/json',
					connection: 'close'
				})
				res.end(JSON.stringify({ error: err.message }))
			} else if (err.message === 'File not found') {
				res.writeHead(404, { connection: 'close' })
				res.end(JSON.stringify({ error: 'File not found' }))
			} else {
				res.writeHead(500, { connection: 'close' })
				res.end(JSON.stringify({ error: 'Internal server error' }))
			}
		}
	}
)
