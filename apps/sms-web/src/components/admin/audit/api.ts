import { appFetcher } from '@/api'
import { ApiUrl } from '@/const'
import { buildLogQuery } from './query'
import type { AuditListResponse, AuditStatsResponse, Filters } from './types'

async function failure(res: Response): Promise<never> {
	const body = await res.json().catch(() => ({}))
	throw new Error(body?.message ?? `HTTP ${res.status}`)
}

export async function fetchLogs(
	page: number,
	limit: number,
	f: Filters
): Promise<AuditListResponse> {
	const res = await appFetcher(
		`${ApiUrl}/audit/logs?${buildLogQuery(page, limit, f)}`
	)
	if (!res.ok) return failure(res)
	return res.json()
}

export async function fetchStats(): Promise<AuditStatsResponse> {
	const res = await appFetcher(`${ApiUrl}/audit/stats`)
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	return res.json()
}

export async function purge(daysOld: number) {
	const res = await appFetcher(`${ApiUrl}/audit/logs`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ days_old: daysOld })
	})
	if (!res.ok) return failure(res)
	return res.json() as Promise<{ removed: number; message: string }>
}
