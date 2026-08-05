import { api, APIError, Query } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import { and, desc, eq, inArray, like, or, type SQL } from 'drizzle-orm'
import log from 'encore.dev/log'
import orm from '../database'
import {
	auditLogs,
	type AuditLogDB,
	type CreateAuditLogRequest
} from '../schema'
import userRepo from '../users/repo'

export interface AuditActor {
	userId: number | null
	username: string | null
	displayName: string | null
	isAdmin: boolean
}

export interface AuditLogResponse {
	id: number
	createdAt: string
	updatedAt: string
	module: string
	resourceType: string
	resourceId: number | null
	action: string
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	actorIsAdmin: boolean
	entityCode: string | null
	entityName: string | null
	parentCode: string | null
	parentName: string | null
	summary: string
	details: string | null
	metadata: unknown
}

export async function resolveAuditActor(): Promise<AuditActor> {
	const auth = getAuthData()
	if (!auth?.userID) {
		return {
			userId: null,
			username: null,
			displayName: null,
			isAdmin: false
		}
	}
	const userId = Number(auth.userID)
	try {
		const user = await userRepo.findOne({ id: userId } as any)
		return {
			userId,
			username: user?.username ?? null,
			displayName: user?.displayName ?? user?.username ?? null,
			isAdmin: !!auth.isSuperAdmin || !!user?.isSuperUser
		}
	} catch {
		return {
			userId,
			username: null,
			displayName: `User #${userId}`,
			isAdmin: !!auth.isSuperAdmin
		}
	}
}

export async function writeAuditLog(
	input: CreateAuditLogRequest,
	actorOverride?: AuditActor
): Promise<void> {
	const actor = actorOverride ?? (await resolveAuditActor())
	await orm.insert(auditLogs).values({
		module: String(input.module).trim().toUpperCase(),
		resourceType: input.resourceType.trim().toUpperCase(),
		resourceId: input.resourceId ?? null,
		action: input.action.trim().toUpperCase(),
		actorUserId: input.actorUserId ?? actor.userId,
		actorUsername: input.actorUsername ?? actor.username,
		actorDisplayName: input.actorDisplayName ?? actor.displayName,
		actorIsAdmin: (input.actorIsAdmin ?? actor.isAdmin) ? 1 : 0,
		entityCode: input.entityCode ?? null,
		entityName: input.entityName ?? null,
		parentCode: input.parentCode ?? null,
		parentName: input.parentName ?? null,
		summary: input.summary,
		details: input.details ?? null,
		metadata: input.metadata == null ? null : JSON.stringify(input.metadata)
	})
}

function parseMetadata(value?: string | null): unknown {
	if (!value) return null
	try {
		return JSON.parse(value)
	} catch {
		return value
	}
}

export function toAuditResponse(row: AuditLogDB): AuditLogResponse {
	return {
		id: row.id,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		module: row.module,
		resourceType: row.resourceType,
		resourceId: row.resourceId ?? null,
		action: row.action,
		actorUserId: row.actorUserId ?? null,
		actorUsername: row.actorUsername ?? null,
		actorDisplayName: row.actorDisplayName ?? null,
		actorIsAdmin: !!row.actorIsAdmin,
		entityCode: row.entityCode ?? null,
		entityName: row.entityName ?? null,
		parentCode: row.parentCode ?? null,
		parentName: row.parentName ?? null,
		summary: row.summary,
		details: row.details ?? null,
		metadata: parseMetadata(row.metadata)
	}
}

export interface FindAuditLogsQuery {
	module?: string
	allowedModules?: string[]
	resourceType?: string
	resourceId?: number
	action?: string
	actorUserId?: number
	search?: string
	limit?: number
}

export async function findAuditLogs(
	query: FindAuditLogsQuery
): Promise<AuditLogResponse[]> {
	const conditions: SQL[] = []
	if (query.allowedModules?.length)
		conditions.push(inArray(auditLogs.module, query.allowedModules))
	if (query.module)
		conditions.push(eq(auditLogs.module, query.module.trim().toUpperCase()))
	if (query.resourceType)
		conditions.push(
			eq(auditLogs.resourceType, query.resourceType.trim().toUpperCase())
		)
	if (query.resourceId != null)
		conditions.push(eq(auditLogs.resourceId, Number(query.resourceId)))
	if (query.action)
		conditions.push(eq(auditLogs.action, query.action.trim().toUpperCase()))
	if (query.actorUserId != null)
		conditions.push(eq(auditLogs.actorUserId, Number(query.actorUserId)))
	if (query.search?.trim()) {
		const pattern = `%${query.search.trim()}%`
		conditions.push(
			or(
				like(auditLogs.summary, pattern),
				like(auditLogs.entityCode, pattern),
				like(auditLogs.entityName, pattern),
				like(auditLogs.actorUsername, pattern),
				like(auditLogs.actorDisplayName, pattern),
				like(auditLogs.parentCode, pattern),
				like(auditLogs.parentName, pattern),
				like(auditLogs.action, pattern),
				like(auditLogs.details, pattern),
				like(auditLogs.metadata, pattern)
			)!
		)
	}
	const where =
		conditions.length === 0
			? undefined
			: conditions.length === 1
				? conditions[0]
				: and(...conditions)
	const rows = await orm
		.select()
		.from(auditLogs)
		.where(where)
		.orderBy(desc(auditLogs.id))
		.limit(Math.min(500, Math.max(1, Number(query.limit || 200))))
	return rows.map(toAuditResponse)
}

function allowedAuditModules(): { all: boolean; modules: string[] } {
	const auth = getAuthData()
	if (!auth) return { all: false, modules: [] }
	if (auth.isSuperAdmin || auth.permissions.includes('audit-logs:read')) {
		return { all: true, modules: [] }
	}
	const modules: string[] = []
	if (
		auth.permissions.some((permission) =>
			['asset-catalog:read', 'rooms:read', 'account-audit:read'].includes(
				permission
			)
		)
	) {
		modules.push('ASSET')
	}
	if (auth.permissions.includes('leave-reports:read')) modules.push('LEAVE')
	if (
		auth.permissions.some((permission) =>
			['exam-approvals:read', 'exam-bank:read'].includes(permission)
		)
	) {
		modules.push('EXAM')
	}
	return { all: false, modules }
}

export const ListAuditLogs = api(
	{ auth: true, expose: true, method: 'GET', path: '/audit-logs' },
	async (q: {
		module?: Query<string>
		resourceType?: Query<string>
		resourceId?: Query<number>
		action?: Query<string>
		actorUserId?: Query<number>
		q?: Query<string>
		limit?: Query<number>
	}): Promise<{ data: AuditLogResponse[] }> => {
		const access = allowedAuditModules()
		const requestedModule = q.module?.trim().toUpperCase()
		if (!access.all) {
			if (!access.modules.length) {
				throw APIError.permissionDenied('Không có quyền xem nhật ký')
			}
			if (requestedModule && !access.modules.includes(requestedModule)) {
				throw APIError.permissionDenied(
					`Không có quyền xem nhật ký ${requestedModule}`
				)
			}
		}

		try {
			return {
				data: await findAuditLogs({
					module: requestedModule,
					allowedModules:
						!access.all && !requestedModule
							? access.modules
							: undefined,
					resourceType: q.resourceType,
					resourceId: q.resourceId,
					action: q.action,
					actorUserId: q.actorUserId,
					search: q.q,
					limit: q.limit
				})
			}
		} catch (err) {
			log.error('ListAuditLogs failed', { err })
			throw err
		}
	}
)
