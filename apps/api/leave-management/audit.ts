import { api, Query } from 'encore.dev/api'
import { findAuditLogs, writeAuditLog } from '../audit/audit'

export async function writeLeaveAudit(input: {
	action: string
	entityType: string
	entityId?: number | null
	details?: unknown
}) {
	await writeAuditLog({
		module: 'LEAVE',
		action: input.action,
		resourceType: input.entityType,
		resourceId: input.entityId ?? null,
		summary: `${input.action} ${input.entityType}`,
		details: input.details == null ? null : JSON.stringify(input.details)
	})
}

export const ListLeaveAuditLogs = api(
	{ auth: true, expose: true, method: 'GET', path: '/leave/audit-logs' },
	async (q: { entityType?: Query<string>; limit?: Query<number> }) => {
		const rows = await findAuditLogs({
			module: 'LEAVE',
			resourceType: q.entityType,
			limit: q.limit == null ? 100 : Number(q.limit)
		})
		return {
			data: rows.map((row) => ({
				id: row.id,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				userId: row.actorUserId,
				action: row.action,
				entityType: row.resourceType,
				entityId: row.resourceId,
				details: row.details
			}))
		}
	}
)
