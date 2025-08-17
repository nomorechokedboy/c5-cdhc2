declare namespace NodeJS {
	interface ProcessEnv {
		PORT?: string
		HASH_SECRET: string
		JWT_PRIVATE_KEY: string
	}
}
