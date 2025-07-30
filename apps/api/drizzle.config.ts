import 'dotenv/config'
import { defineConfig } from 'drizzle-kit'

const config: unknown = defineConfig({
	out: 'migrations',
	schema: './schema',
	dialect: 'sqlite',
	dbCredentials: {
		url: 'file:./local.db'
	}
})

export default config
