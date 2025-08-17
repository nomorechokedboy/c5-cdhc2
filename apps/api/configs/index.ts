import dotenv from 'dotenv'

dotenv.config()

export type AppConfig = {
	PORT?: string
	HASH_SECRET: string
	JWT_PRIVATE_KEY: string
}

export const appConfig: AppConfig = {
	PORT: process.env.PORT || '8080',
	HASH_SECRET: process.env.HASH_SECRET,
	JWT_PRIVATE_KEY: process.env.JWT_PRIVATE_KEY
}
