import { Local } from '@/api/client'
import { env } from '@/env'

export const ApiUrl =
	import.meta.env.DEV === true ? Local : `${env.VITE_API_URL ?? ''}/api`
