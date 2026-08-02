/**
 * Quản lý đợt nghỉ phép (leave batches)
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, desc, eq, inArray } from 'drizzle-orm'
import orm from '../database'
import { leaveBatches, leaveRequests } from '../schema'
import { resolveLeaveAccess } from './access'
import { writeLeaveAudit } from './audit'

export interface LeaveBatchResponse {
	id: number
	createdAt: string
	updatedAt: string
	requestId: number
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: string
	leaveType: string
	batchIndex: number
	batchLabel: string
	startDate: string | null
	endDate: string | null
	totalDays: number
	note: string | null
	createdByUserId: number | null
}

function mapRow(r: typeof leaveBatches.$inferSelect): LeaveBatchResponse {
	return {
		id: r.id,
		createdAt: r.createdAt ?? '',
		updatedAt: r.updatedAt ?? '',
		requestId: r.requestId,
		personnelId: r.personnelId,
		personnelCode: r.personnelCode,
		personnelName: r.personnelName,
		objectType: r.objectType,
		leaveType: r.leaveType,
		batchIndex: r.batchIndex,
		batchLabel: r.batchLabel,
		startDate: r.startDate,
		endDate: r.endDate,
		totalDays: r.totalDays,
		note: r.note,
		createdByUserId: r.createdByUserId
	}
}

export const CreateLeaveBatch = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/batches'
	},
	async (body: {
		requestId: number
		personnelId?: number | null
		personnelCode?: string | null
		personnelName?: string | null
		objectType: string
		leaveType: string
		batchIndex?: number
		batchLabel?: string
		startDate?: string | null
		endDate?: string | null
		totalDays?: number
		note?: string | null
	}): Promise<{ data: LeaveBatchResponse }> => {
		const req = await orm
			.select()
			.from(leaveRequests)
			.where(eq(leaveRequests.id, body.requestId))
			.limit(1)
		if (!req[0]) throw APIError.notFound('Không tìm thấy đơn phép')

		const inserted = await orm
			.insert(leaveBatches)
			.values({
				requestId: body.requestId,
				personnelId: body.personnelId ?? req[0].personnelId ?? null,
				personnelCode:
					body.personnelCode ?? req[0].personnelCode ?? null,
				personnelName:
					body.personnelName ?? req[0].personnelName ?? null,
				objectType: body.objectType,
				leaveType: body.leaveType,
				batchIndex: body.batchIndex ?? 1,
				batchLabel: body.batchLabel || '',
				startDate: body.startDate ?? req[0].startDate ?? null,
				endDate: body.endDate ?? req[0].endDate ?? null,
				totalDays: body.totalDays ?? req[0].totalDays ?? 0,
				note: body.note ?? null,
				createdByUserId:
					Number((await getAuthData())?.userID || 0) || null
			})
			.returning()
		await writeLeaveAudit({
			action: 'CREATE',
			entityType: 'LEAVE_BATCH',
			entityId: inserted[0]!.id,
			details: { requestId: body.requestId, batchLabel: body.batchLabel }
		})

		return { data: mapRow(inserted[0]!) }
	}
)

import { getAuthData } from '~encore/auth'

export const ListLeaveBatches = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/batches'
	},
	async (q: {
		requestId?: Query<number>
	}): Promise<{ data: LeaveBatchResponse[] }> => {
		const auth = getAuthData()!
		const access = await resolveLeaveAccess(
			Number(auth.userID),
			!!auth.isSuperAdmin
		)
		const conditions = []
		if (!access.isAdmin) {
			if (!access.unitIds.length) return { data: [] }
			const managedRequests = await orm
				.select({ id: leaveRequests.id })
				.from(leaveRequests)
				.where(inArray(leaveRequests.unitId, access.unitIds))
			if (!managedRequests.length) return { data: [] }
			conditions.push(
				inArray(
					leaveBatches.requestId,
					managedRequests.map((r) => r.id)
				)
			)
		}
		if (q.requestId) {
			conditions.push(eq(leaveBatches.requestId, Number(q.requestId)))
		}
		const rows = await orm
			.select()
			.from(leaveBatches)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(leaveBatches.id))
		const mapped = rows.map(mapRow)
		const grouped = new Map<string, LeaveBatchResponse>()
		for (const row of mapped) {
			const isClass =
				row.batchLabel.startsWith('Đợt nghỉ ') &&
				row.personnelCode != null
			const key = isClass
				? [
						'class',
						row.personnelName ?? '',
						row.leaveType,
						row.startDate ?? '',
						row.endDate ?? '',
						row.totalDays
					].join(':')
				: `batch:${row.id}`
			if (!grouped.has(key)) {
				grouped.set(
					key,
					isClass
						? { ...row, personnelId: null, personnelCode: null }
						: row
				)
			}
		}
		const result = [...grouped.values()]
		await writeLeaveAudit({
			action: 'VIEW',
			entityType: 'LEAVE_BATCH',
			details: { requestId: q.requestId ?? null, count: result.length }
		})
		return { data: result }
	}
)

export const GetLeaveBatch = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/batches/:id'
	},
	async ({ id }: { id: number }): Promise<{ data: LeaveBatchResponse }> => {
		const auth = getAuthData()!
		const access = await resolveLeaveAccess(
			Number(auth.userID),
			!!auth.isSuperAdmin
		)
		const rows = await orm
			.select()
			.from(leaveBatches)
			.where(eq(leaveBatches.id, id))
			.limit(1)
		if (!rows[0]) throw APIError.notFound('Không tìm thấy đợt nghỉ phép')
		if (!access.isAdmin) {
			const request = await orm
				.select({ unitId: leaveRequests.unitId })
				.from(leaveRequests)
				.where(eq(leaveRequests.id, rows[0].requestId))
				.limit(1)
			if (
				request[0]?.unitId == null ||
				!access.unitIds.includes(request[0].unitId)
			) {
				throw APIError.permissionDenied(
					'Không có quyền xem đợt nghỉ này'
				)
			}
		}
		return { data: mapRow(rows[0]) }
	}
)

export const UpdateLeaveBatch = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/leave/batches/:id'
	},
	async ({
		id,
		startDate,
		endDate,
		totalDays,
		batchLabel,
		note
	}: {
		id: number
		startDate?: string | null
		endDate?: string | null
		totalDays?: number
		batchLabel?: string
		note?: string | null
	}): Promise<{ data: LeaveBatchResponse }> => {
		const existing = await orm
			.select()
			.from(leaveBatches)
			.where(eq(leaveBatches.id, id))
			.limit(1)
		if (!existing[0])
			throw APIError.notFound('Không tìm thấy đợt nghỉ phép')

		const updated = await orm
			.update(leaveBatches)
			.set({
				...(startDate !== undefined
					? { startDate: startDate || null }
					: {}),
				...(endDate !== undefined ? { endDate: endDate || null } : {}),
				...(totalDays !== undefined ? { totalDays } : {}),
				...(batchLabel !== undefined
					? { batchLabel: batchLabel || '' }
					: {}),
				...(note !== undefined ? { note: note || null } : {})
			})
			.where(eq(leaveBatches.id, id))
			.returning()
		await writeLeaveAudit({
			action: 'UPDATE',
			entityType: 'LEAVE_BATCH',
			entityId: id,
			details: { batchLabel, startDate, endDate, totalDays }
		})
		return { data: mapRow(updated[0]!) }
	}
)

export const DeleteLeaveBatch = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/leave/batches/:id'
	},
	async ({ id }: { id: number }): Promise<{ ok: boolean }> => {
		const res = await orm
			.delete(leaveBatches)
			.where(eq(leaveBatches.id, id))
			.returning()
		if (!res[0]) throw APIError.notFound('Không tìm thấy đợt nghỉ phép')
		await writeLeaveAudit({
			action: 'DELETE',
			entityType: 'LEAVE_BATCH',
			entityId: id,
			details: { requestId: res[0].requestId }
		})
		return { ok: true }
	}
)

export const CreateLeaveBatchForRequest = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/requests/:id/batches'
	},
	async (
		{ id }: { id: number },
		body: {
			personnelId?: number | null
			personnelCode?: string | null
			personnelName?: string | null
			objectType: string
			leaveType: string
			batchIndex?: number
			batchLabel?: string
			startDate?: string | null
			endDate?: string | null
			totalDays?: number
			note?: string | null
		}
	): Promise<{ data: LeaveBatchResponse }> => {
		const req = await orm
			.select()
			.from(leaveRequests)
			.where(eq(leaveRequests.id, id))
			.limit(1)
		if (!req[0]) throw APIError.notFound('Không tìm thấy đơn phép')

		const inserted = await orm
			.insert(leaveBatches)
			.values({
				requestId: id,
				personnelId: body.personnelId ?? req[0].personnelId ?? null,
				personnelCode:
					body.personnelCode ?? req[0].personnelCode ?? null,
				personnelName:
					body.personnelName ?? req[0].personnelName ?? null,
				objectType: body.objectType,
				leaveType: body.leaveType,
				batchIndex: body.batchIndex ?? 1,
				batchLabel: body.batchLabel || '',
				startDate: body.startDate ?? req[0].startDate ?? null,
				endDate: body.endDate ?? req[0].endDate ?? null,
				totalDays: body.totalDays ?? req[0].totalDays ?? 0,
				note: body.note ?? null,
				createdByUserId:
					Number((await getAuthData())?.userID || 0) || null
			})
			.returning()

		return { data: mapRow(inserted[0]!) }
	}
)
