import { testMariaDbConnection } from '../utils/mariadb'

async function main() {
	try {
		const result = await testMariaDbConnection(process.env)
		console.log('MariaDB connected successfully:', result)
	} catch (error) {
		console.error('MariaDB connection failed:', error)
		process.exit(1)
	}
}

main()
