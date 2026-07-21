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
	S3_REGION: v.optional(v.string(), 'us-west-rack-2'),
	DATABASE_URI: v.optional(v.string(), './local.db'),
	DATABASE_DIALECT: v.optional(v.string(), 'sqlite'),
	MARIADB_HOST: v.optional(v.string(), 'localhost'),
	MARIADB_PORT: v.optional(v.string(), '3306'),
	MARIADB_USER: v.optional(v.string(), 'root'),
	MARIADB_PASSWORD: v.optional(v.string(), ''),
	MARIADB_DATABASE: v.optional(v.string(), ''),
	/** false = không đọc Moodle; true = thử kết nối an toàn, chỉ dùng khi có dữ liệu */
	MARIADB_SYNC_ENABLED: v.optional(v.string(), 'true')
})

export const appConfig = v.parse(AppConfigSchema, process.env)
