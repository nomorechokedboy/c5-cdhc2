import dotenv from 'dotenv'
import * as v from 'valibot'

dotenv.config()

const AppConfigSchema = v.object({
	PORT: v.optional(v.string(), '8080'),
	HASH_SECRET: v.string(),
	JWT_PRIVATE_KEY: v.string(),
	S3_ACCESS_KEY: v.string(),
	S3_SECRET_KEY: v.string(),
	S3_ENDPOINT: v.optional(v.string(), 'http://localhost:9000'),
	S3_DEFAULT_BUCKET: v.optional(v.string(), 'my-first-bucket'),
	S3_REGION: v.optional(v.string(), 'us-west-rack-2')
})

export const appConfig = v.parse(AppConfigSchema, process.env)
