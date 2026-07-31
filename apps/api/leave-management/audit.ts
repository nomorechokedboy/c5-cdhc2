import { getAuthData } from '~encore/auth'
import { api, Query } from 'encore.dev/api'
import { desc, eq } from 'drizzle-orm'
import orm from '../database'
import { leaveAuditLogs } from '../schema'

export async function writeLeaveAudit(input: {
	action: string
	entityType: string
	entityId?: number | null
	details?: unknown
}) {
	const userId = Number(getAuthData()?.userID || 0) || null
	await orm.insert(leaveAuditLogs).values({
		userId,
		action: input.action,
		entityType: input.entityType,
		entityId: input.entityId ?? null,
		details: input.details == null ? null : JSON.stringify(input.details)
	})
}

export const ListLeaveAuditLogs = api(
	{ auth: true, expose: true, method: 'GET', path: '/leave/audit-logs' },
	async (q: { entityType?: Query<string>; limit?: Query<number> }) => {
		const rows = await orm
			.select()
			.from(leaveAuditLogs)
			.where(
				q.entityType
					? eq(leaveAuditLogs.entityType, String(q.entityType))
					: undefined
			)
			.orderBy(desc(leaveAuditLogs.id))
			.limit(Math.min(500, Math.max(1, Number(q.limit || 100))))
		return { data: rows }
	}
)
