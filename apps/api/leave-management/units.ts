/**
 * Danh mục đơn vị / đầu mối đơn vị trực thuộc (phân hệ phép)
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, asc, eq, inArray, like, or, sql } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import { leaveUnits } from '../schema/leave-management'
import { resolveLeaveAccess } from './access'

/** Resolve commander assignment for a leave unit.
 * Personnel-level commander fields remain the fallback when the unit catalog
 * has not yet been linked to an account.
 */
export async function resolveUnitCommander(unitId?: number | null): Promise<{
	commanderUserId: number | null
	commanderName: string | null
}> {
	if (!unitId) return { commanderUserId: null, commanderName: null }
	const rows = await orm
		.select()
		.from(leaveUnits)
		.where(eq(leaveUnits.id, unitId))
		.limit(1)
	return {
		commanderUserId: rows[0]?.commanderUserId ?? null,
		commanderName: rows[0]?.commanderName ?? null
	}
}

export interface LeaveUnitResponse {
	id: number
	createdAt: string
	updatedAt: string
	code: string | null
	name: string
	parentId: number | null
	level: string | null
	commanderUserId: number | null
	commanderName: string | null
	managementArea: string
	isActive: boolean
}

function mapRow(r: typeof leaveUnits.$inferSelect): LeaveUnitResponse {
	return {
		id: r.id,
		createdAt: r.createdAt ?? '',
		updatedAt: r.updatedAt ?? '',
		code: r.code,
		name: r.name,
		parentId: r.parentId,
		level: r.level,
		commanderUserId: r.commanderUserId,
		commanderName: r.commanderName,
		managementArea: r.managementArea,
		isActive: !!r.isActive
	}
}

export const ListLeaveUnits = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/units'
	},
	async (q: {
		search?: Query<string>
		activeOnly?: Query<boolean>
	}): Promise<{ data: LeaveUnitResponse[] }> => {
		const auth = getAuthData()!
		const access = await resolveLeaveAccess(
			Number(auth.userID),
			!!auth.isSuperAdmin
		)
		const conditions = []
		if (!access.isAdmin) {
			if (!access.unitIds.length) return { data: [] }
			conditions.push(inArray(leaveUnits.id, access.unitIds))
		}
		// activeOnly mặc định true; ?activeOnly=false để lấy cả ẩn
		const activeOnly = String(q.activeOnly ?? 'true') !== 'false'
		if (activeOnly) {
			conditions.push(eq(leaveUnits.isActive, true))
		}
		if (q.search) {
			const s = `%${String(q.search).trim()}%`
			conditions.push(
				or(like(leaveUnits.name, s), like(leaveUnits.code, s))!
			)
		}
		const rows = await orm
			.select()
			.from(leaveUnits)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(asc(leaveUnits.name))
		return { data: rows.map(mapRow) }
	}
)

export const CreateLeaveUnit = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/units'
	},
	async (body: {
		name: string
		code?: string | null
		parentId?: number | null
		level?: string | null
		managementArea?: string
		isActive?: boolean
	}): Promise<{ data: LeaveUnitResponse }> => {
		if (!body.name?.trim()) {
			throw APIError.invalidArgument('Tên đơn vị là bắt buộc')
		}
		if (body.level === 'company') {
			if (body.parentId == null)
				throw APIError.invalidArgument(
					'Đại đội phải thuộc một tiểu đoàn'
				)
			const parent = (
				await orm
					.select()
					.from(leaveUnits)
					.where(eq(leaveUnits.id, body.parentId))
					.limit(1)
			)[0]
			if (!parent || parent.level !== 'battalion')
				throw APIError.invalidArgument(
					'Đơn vị cha của đại đội phải là tiểu đoàn'
				)
		}
		if (body.level === 'battalion' && body.parentId != null)
			throw APIError.invalidArgument(
				'Tiểu đoàn là cấp gốc, không chọn đơn vị cha'
			)
		const inserted = await orm
			.insert(leaveUnits)
			.values({
				name: body.name.trim(),
				code: body.code?.trim() || null,
				parentId: body.parentId ?? null,
				level: body.level || null,
				managementArea: body.managementArea || 'cán_bộ',
				isActive: body.isActive !== false
			})
			.returning()
		return { data: mapRow(inserted[0]!) }
	}
)

export const UpdateLeaveUnit = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/leave/units/:id'
	},
	async ({
		id,
		name,
		code,
		parentId,
		level,
		managementArea,
		isActive
	}: {
		id: number
		name?: string
		code?: string | null
		parentId?: number | null
		level?: string | null
		managementArea?: string
		isActive?: boolean
	}): Promise<{ data: LeaveUnitResponse }> => {
		const existing = await orm
			.select()
			.from(leaveUnits)
			.where(eq(leaveUnits.id, id))
			.limit(1)
		if (!existing[0]) throw APIError.notFound('Không tìm thấy đơn vị')
		const updated = await orm
			.update(leaveUnits)
			.set({
				...(name !== undefined ? { name: name.trim() } : {}),
				...(code !== undefined ? { code: code?.trim() || null } : {}),
				...(parentId !== undefined
					? { parentId: parentId ?? null }
					: {}),
				...(level !== undefined ? { level: level || null } : {}),
				...(managementArea !== undefined ? { managementArea } : {}),
				...(isActive !== undefined ? { isActive } : {})
			})
			.where(eq(leaveUnits.id, id))
			.returning()
		return { data: mapRow(updated[0]!) }
	}
)

export const DeleteLeaveUnit = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/leave/units/:id'
	},
	async ({ id }: { id: number }): Promise<{ ok: boolean }> => {
		const res = await orm
			.delete(leaveUnits)
			.where(eq(leaveUnits.id, id))
			.returning()
		if (!res[0]) throw APIError.notFound('Không tìm thấy đơn vị')
		return { ok: true }
	}
)

/** Import hàng loạt đơn vị (theo tên; upsert theo code nếu có) */
export const ImportLeaveUnits = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/units/import'
	},
	async (body: {
		items: { name: string; code?: string | null }[]
	}): Promise<{
		data: {
			successCount: number
			errorCount: number
			totalCount: number
			errors: { row: number; message: string }[]
		}
	}> => {
		const items = body.items || []
		if (!items.length) {
			throw APIError.invalidArgument('Danh sách import trống')
		}
		const errors: { row: number; message: string }[] = []
		let successCount = 0
		for (let i = 0; i < items.length; i++) {
			const row = i + 1
			const name = String(items[i]?.name || '').trim()
			const code = items[i]?.code
				? String(items[i]!.code).trim() || null
				: null
			if (!name) {
				errors.push({ row, message: 'Tên đơn vị là bắt buộc' })
				continue
			}
			try {
				if (code) {
					const existing = await orm
						.select()
						.from(leaveUnits)
						.where(eq(leaveUnits.code, code))
						.limit(1)
					if (existing[0]) {
						await orm
							.update(leaveUnits)
							.set({ name, isActive: true })
							.where(eq(leaveUnits.id, existing[0].id))
						successCount++
						continue
					}
				}
				// match by name
				const byName = await orm
					.select()
					.from(leaveUnits)
					.where(eq(leaveUnits.name, name))
					.limit(1)
				if (byName[0]) {
					await orm
						.update(leaveUnits)
						.set({
							...(code ? { code } : {}),
							isActive: true
						})
						.where(eq(leaveUnits.id, byName[0].id))
				} else {
					await orm.insert(leaveUnits).values({
						name,
						code,
						isActive: true
					})
				}
				successCount++
			} catch (e: unknown) {
				errors.push({
					row,
					message: String((e as Error)?.message || e)
				})
			}
		}
		return {
			data: {
				successCount,
				errorCount: errors.length,
				totalCount: items.length,
				errors
			}
		}
	}
)

/** Seed từ bảng units (tiểu đoàn/đại đội) nếu leave_units trống */
export const SeedLeaveUnitsFromSystem = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/units/seed-from-system'
	},
	async (): Promise<{ data: { inserted: number } }> => {
		const { units } = await import('../schema/units')
		const existing = await orm
			.select({ c: sql<number>`count(*)` })
			.from(leaveUnits)
		if ((existing[0]?.c ?? 0) > 0) {
			return { data: { inserted: 0 } }
		}
		const sys = await orm.select().from(units).orderBy(asc(units.id))
		let inserted = 0
		for (const u of sys) {
			await orm.insert(leaveUnits).values({
				code: u.alias,
				name: u.name,
				isActive: true
			})
			inserted++
		}
		return { data: { inserted } }
	}
)
