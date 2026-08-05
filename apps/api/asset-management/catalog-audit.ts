/**
 * Nhật ký danh mục ngành / loại vật / vật tư.
 */
import { api, Query } from 'encore.dev/api'
import { resolveActor } from './account-audit'
import log from 'encore.dev/log'
import {
	findAuditLogs,
	type AuditLogResponse,
	writeAuditLog
} from '../audit/audit'

type CatalogAuditAction = 'CREATE' | 'UPDATE' | 'DELETE'
type CatalogAuditEntity = 'NGANH' | 'LOAI_VAT' | 'VAT_TU'

export interface CatalogAuditLogResponse {
	id: number
	createdAt: string
	action: string
	entityType: string
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	actorIsAdmin: boolean
	entityId: number | null
	entityCode: string | null
	entityName: string | null
	parentCode: string | null
	parentName: string | null
	summary: string
	details: string | null
}

function toResponse(row: AuditLogResponse): CatalogAuditLogResponse {
	return {
		id: row.id,
		createdAt: row.createdAt,
		action: row.action,
		entityType: row.resourceType,
		actorUserId: row.actorUserId ?? null,
		actorUsername: row.actorUsername ?? null,
		actorDisplayName: row.actorDisplayName ?? null,
		actorIsAdmin: !!row.actorIsAdmin,
		entityId: row.resourceId,
		entityCode: row.entityCode ?? null,
		entityName: row.entityName ?? null,
		parentCode: row.parentCode ?? null,
		parentName: row.parentName ?? null,
		summary: row.summary,
		details: row.details ?? null
	}
}

const entityVi: Record<string, string> = {
	NGANH: 'ngành',
	LOAI_VAT: 'loại vật',
	VAT_TU: 'vật tư'
}

const actionVi: Record<string, string> = {
	CREATE: 'thêm',
	UPDATE: 'sửa',
	DELETE: 'xóa'
}

export async function logCatalogChange(opts: {
	action: CatalogAuditAction
	entityType: CatalogAuditEntity
	entityId?: number | null
	entityCode?: string | null
	entityName?: string | null
	parentCode?: string | null
	parentName?: string | null
	details?: string | null
}): Promise<void> {
	try {
		const actor = await resolveActor()
		const actorLabel =
			actor.displayName ||
			actor.username ||
			(actor.userId != null ? `User #${actor.userId}` : 'Hệ thống')
		const roleTag = actor.isAdmin ? 'admin' : 'user'
		const code = opts.entityCode || `#${opts.entityId ?? '?'}`
		const summary = `[${roleTag}] ${actorLabel} ${actionVi[opts.action] || opts.action} ${entityVi[opts.entityType] || opts.entityType} ${code}${
			opts.entityName ? ` — ${opts.entityName}` : ''
		}`

		await writeAuditLog({
			module: 'ASSET',
			resourceType: opts.entityType,
			action: opts.action,
			actorUserId: actor.userId,
			actorUsername: actor.username,
			actorDisplayName: actor.displayName,
			actorIsAdmin: actor.isAdmin,
			resourceId: opts.entityId ?? null,
			entityCode: opts.entityCode ?? null,
			entityName: opts.entityName ?? null,
			parentCode: opts.parentCode ?? null,
			parentName: opts.parentName ?? null,
			summary,
			details: opts.details ?? null
		})
	} catch (err) {
		log.error('logCatalogChange failed', { err })
	}
}

interface GetCatalogAuditLogsQuery {
	q?: Query<string>
	entityType?: Query<string>
	limit?: Query<number>
}

export const GetCatalogAuditLogs = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/catalog-audit-logs'
	},
	async (
		query: GetCatalogAuditLogsQuery
	): Promise<{ data: CatalogAuditLogResponse[] }> => {
		const list = await findAuditLogs({
			module: 'ASSET',
			search: query.q,
			resourceType: query.entityType,
			limit: query.limit != null ? Number(query.limit) : 200
		})
		return { data: list.map(toResponse) }
	}
)
