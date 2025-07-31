import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration.js'
import { api } from 'encore.dev/api'
import log from 'encore.dev/log'

dayjs.extend(duration)

const appStartTime = Date.now()

function getHealthCheck() {
	const uptimeMs = Date.now() - appStartTime
	const uptimeDuration = dayjs.duration(uptimeMs)

	const days = uptimeDuration.days()
	const hours = uptimeDuration.hours()
	const minutes = uptimeDuration.minutes()
	const seconds = uptimeDuration.seconds()

	const parts: Array<string> = []
	if (days > 0) parts.push(`${days}d`)
	if (hours > 0) parts.push(`${hours}h`)
	if (minutes > 0) parts.push(`${minutes}m`)
	if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`)

	return {
		uptime: parts.join(' '),
		timestamp: uptimeMs
	}
}

interface HeathCheckResponse {
	uptime: string
	timestamp: number
}

export const Heathz = api(
	{ expose: true, method: '*', path: '/healthz' },
	async (): Promise<HeathCheckResponse> => {
		log.trace('healthz calling')
		const { timestamp, uptime } = getHealthCheck()

		return { uptime, timestamp }
	}
)
