import dotenv from 'dotenv'
import * as v from 'valibot'

dotenv.config()

const AppConfigSchema = v.object({
	PORT: v.optional(v.string(), '8080'),
	HASH_SECRET: v.string(),
	JWT_PRIVATE_KEY: v.string()
})

export const appConfig = v.parse(AppConfigSchema, process.env)
