/**
 * CRUD danh sách quân nhân (catalog phép)
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, eq, inArray, like, or, sql } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import {
	leaveClasses,
	leavePersonnel,
	type LeaveObjectType
} from '../schema/leave-management'
import { isLeaveObjectType, normalizeObjectType } from './helpers'
import { resolveUnitCommander } from './units'
import { resolveLeaveAccess } from './access'

export interface PersonnelResponse {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	fullName: string
	enlistmentDate: string | null
	recruitment: string | null
	objectType: LeaveObjectType
	rank: string | null
	position: string | null
	classId: number | null
	unitId: number | null
	unitName: string | null
	hometown: string | null
	permanentResidence: string | null
	userId: number | null
	email: string | null
	commanderUserId: number | null
	commanderName: string | null
	className: string | null
	managementArea: string
}

function mapRow(r: typeof leavePersonnel.$inferSelect): PersonnelResponse {
	return {
		id: r.id,
		createdAt: r.createdAt ?? '',
		updatedAt: r.updatedAt ?? '',
		code: r.code,
		fullName: r.fullName,
		enlistmentDate: r.enlistmentDate,
		recruitment: r.recruitment,
		objectType: r.objectType as LeaveObjectType,
		rank: r.rank,
		position: r.position,
		classId: r.classId ?? null,
		unitId: r.unitId,
		unitName: r.unitName,
		hometown: r.hometown,
		permanentResidence: r.permanentResidence,
		userId: r.userId,
		email: r.email ?? null,
		commanderUserId: r.commanderUserId ?? null,
		commanderName: r.commanderName ?? null,
		className: r.className ?? null,
		managementArea: r.managementArea
	}
}

export const ListLeavePersonnel = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/personnel'
	},
	async (q: {
		search?: Query<string>
		objectType?: Query<string>
	}): Promise<{ data: PersonnelResponse[] }> => {
		const auth = getAuthData()!
		const access = await resolveLeaveAccess(
			Number(auth.userID),
			!!auth.isSuperAdmin
		)
		const currentUserId = Number(auth.userID)
		const conditions = []
		if (!access.isAdmin) {
			if (access.unitIds.length) {
				conditions.push(inArray(leavePersonnel.unitId, access.unitIds))
			} else if (access.isPersonnel) {
				// A personnel account needs the colleagues in its own unit so the
				// leave form can offer valid replacement personnel. Keep this scope
				// local to the personnel catalog; do not broaden other leave access.
				const linkedPersonnel = await orm
					.select({ unitId: leavePersonnel.unitId })
					.from(leavePersonnel)
					.where(eq(leavePersonnel.userId, currentUserId))
					.limit(1)
				if (linkedPersonnel[0]?.unitId != null) {
					conditions.push(
						eq(leavePersonnel.unitId, linkedPersonnel[0].unitId)
					)
				} else {
					conditions.push(eq(leavePersonnel.userId, currentUserId))
				}
			} else {
				conditions.push(eq(leavePersonnel.userId, currentUserId))
			}
		}
		if (q.objectType && isLeaveObjectType(String(q.objectType))) {
			conditions.push(
				eq(leavePersonnel.objectType, q.objectType as LeaveObjectType)
			)
		}
		if (q.search) {
			const s = `%${String(q.search).trim()}%`
			conditions.push(
				or(
					like(leavePersonnel.code, s),
					like(leavePersonnel.fullName, s),
					like(leavePersonnel.unitName, s)
				)!
			)
		}
		const rows = await orm
			.select()
			.from(leavePersonnel)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(sql`${leavePersonnel.id} desc`)
		return { data: rows.map(mapRow) }
	}
)

export const GetLeavePersonnel = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/personnel/:id'
	},
	async ({ id }: { id: number }): Promise<{ data: PersonnelResponse }> => {
		const auth = getAuthData()!
		const access = await resolveLeaveAccess(
			Number(auth.userID),
			!!auth.isSuperAdmin
		)
		const rows = await orm
			.select()
			.from(leavePersonnel)
			.where(eq(leavePersonnel.id, id))
			.limit(1)
		if (!rows[0]) throw APIError.notFound('Không tìm thấy quân nhân')
		if (
			!access.isAdmin &&
			rows[0].userId !== Number(auth.userID) &&
			(rows[0].unitId == null || !access.unitIds.includes(rows[0].unitId))
		) {
			throw APIError.permissionDenied('Không có quyền xem quân nhân này')
		}
		return { data: mapRow(rows[0]) }
	}
)

export const GetMyLeavePersonnel = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/my-personnel'
	},
	async (): Promise<{ data: PersonnelResponse | null }> => {
		const { getAuthData } = await import('~encore/auth')
		const auth = getAuthData()
		if (!auth?.userID) return { data: null }
		const uid = Number(auth.userID)
		const rows = await orm
			.select()
			.from(leavePersonnel)
			.where(eq(leavePersonnel.userId, uid))
			.limit(1)
		return { data: rows[0] ? mapRow(rows[0]) : null }
	}
)

interface CreatePersonnelBody {
	/** Bỏ trống → hệ thống tự sinh (QN-xxxxxx) */
	code?: string | null
	fullName: string
	enlistmentDate?: string | null
	recruitment?: string | null
	objectType: string
	rank?: string | null
	position?: string | null
	classId?: number | null
	unitId?: number | null
	unitName?: string | null
	hometown?: string | null
	permanentResidence?: string | null
	userId?: number | null
	email?: string | null
	commanderUserId?: number | null
	commanderName?: string | null
	className?: string | null
	managementArea?: string
}

async function generatePersonnelCode(): Promise<string> {
	const rows = await orm
		.select({ id: leavePersonnel.id })
		.from(leavePersonnel)
		.orderBy(sql`${leavePersonnel.id} desc`)
		.limit(1)
	const next = (rows[0]?.id ?? 0) + 1
	const base = `QN-${String(next).padStart(6, '0')}`
	// ensure unique even if ids were deleted
	const clash = await orm
		.select({ id: leavePersonnel.id })
		.from(leavePersonnel)
		.where(eq(leavePersonnel.code, base))
		.limit(1)
	if (!clash[0]) return base
	return `QN-${Date.now().toString(36).toUpperCase()}`
}

export const CreateLeavePersonnel = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/personnel'
	},
	async (body: CreatePersonnelBody): Promise<{ data: PersonnelResponse }> => {
		if (!body.fullName?.trim()) {
			throw APIError.invalidArgument('Tên là bắt buộc')
		}
		if (!isLeaveObjectType(body.objectType)) {
			throw APIError.invalidArgument('Đối tượng không hợp lệ')
		}
		const objectType = normalizeObjectType(body.objectType)!
		const code = body.code?.trim()
			? body.code.trim()
			: await generatePersonnelCode()
		// Chỉ huy CQ lấy cố định theo đơn vị
		const unitId = body.unitId ?? null
		const fromUnit = await resolveUnitCommander(unitId)
		const commanderUserId =
			fromUnit.commanderUserId ?? body.commanderUserId ?? null
		const commanderName =
			fromUnit.commanderName ?? (body.commanderName?.trim() || null)
		try {
			const inserted = await orm
				.insert(leavePersonnel)
				.values({
					code,
					fullName: body.fullName.trim(),
					enlistmentDate: body.enlistmentDate || null,
					recruitment: body.recruitment || null,
					objectType,
					rank: body.rank || null,
					position: body.position || null,
					classId: body.classId ?? null,
					unitId,
					unitName: body.unitName || null,
					hometown: body.hometown || null,
					permanentResidence: body.permanentResidence || null,
					userId: body.userId ?? null,
					email: body.email?.trim() || null,
					commanderUserId,
					commanderName,
					className: body.className || null,
					managementArea: body.managementArea || 'cán_bộ'
				})
				.returning()
			return { data: mapRow(inserted[0]!) }
		} catch (e: unknown) {
			const msg = String((e as Error)?.message || e)
			if (/unique|UNIQUE/i.test(msg)) {
				throw APIError.alreadyExists('Mã quân nhân đã tồn tại')
			}
			throw e
		}
	}
)

export const UpdateLeavePersonnel = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/leave/personnel/:id'
	},
	async ({
		id,
		...body
	}: { id: number } & Partial<CreatePersonnelBody>): Promise<{
		data: PersonnelResponse
	}> => {
		const existing = await orm
			.select()
			.from(leavePersonnel)
			.where(eq(leavePersonnel.id, id))
			.limit(1)
		if (!existing[0]) throw APIError.notFound('Không tìm thấy quân nhân')
		if (body.objectType && !isLeaveObjectType(body.objectType)) {
			throw APIError.invalidArgument('Đối tượng không hợp lệ')
		}

		// Khi đổi đơn vị → gán lại chỉ huy CQ theo đơn vị
		const nextUnitId =
			body.unitId !== undefined
				? (body.unitId ?? null)
				: existing[0].unitId
		const fromUnit = await resolveUnitCommander(nextUnitId)
		const commanderUserId =
			fromUnit.commanderUserId ??
			(body.commanderUserId !== undefined
				? (body.commanderUserId ?? null)
				: existing[0].commanderUserId)
		const commanderName =
			fromUnit.commanderName ??
			(body.commanderName !== undefined
				? body.commanderName?.trim() || null
				: existing[0].commanderName)

		const updated = await orm
			.update(leavePersonnel)
			.set({
				...(body.code != null ? { code: body.code.trim() } : {}),
				...(body.fullName != null
					? { fullName: body.fullName.trim() }
					: {}),
				...(body.enlistmentDate !== undefined
					? { enlistmentDate: body.enlistmentDate || null }
					: {}),
				...(body.recruitment !== undefined
					? { recruitment: body.recruitment || null }
					: {}),
				...(body.objectType
					? {
							objectType:
								normalizeObjectType(body.objectType) ||
								(body.objectType as LeaveObjectType)
						}
					: {}),
				...(body.rank !== undefined ? { rank: body.rank || null } : {}),
				...(body.position !== undefined
					? { position: body.position || null }
					: {}),
				...(body.classId !== undefined
					? { classId: body.classId ?? null }
					: {}),
				...(body.unitId !== undefined
					? { unitId: body.unitId ?? null }
					: {}),
				...(body.unitName !== undefined
					? { unitName: body.unitName || null }
					: {}),
				...(body.hometown !== undefined
					? { hometown: body.hometown || null }
					: {}),
				...(body.permanentResidence !== undefined
					? { permanentResidence: body.permanentResidence || null }
					: {}),
				...(body.userId !== undefined
					? { userId: body.userId ?? null }
					: {}),
				...(body.email !== undefined
					? { email: body.email?.trim() || null }
					: {}),
				...(body.className !== undefined
					? { className: body.className || null }
					: {}),
				...(body.managementArea !== undefined
					? { managementArea: body.managementArea }
					: {}),
				commanderUserId,
				commanderName
			})
			.where(eq(leavePersonnel.id, id))
			.returning()
		return { data: mapRow(updated[0]!) }
	}
)

export const DeleteLeavePersonnel = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/leave/personnel/:id'
	},
	async ({ id }: { id: number }): Promise<{ ok: boolean }> => {
		const res = await orm
			.delete(leavePersonnel)
			.where(eq(leavePersonnel.id, id))
			.returning()
		if (!res[0]) throw APIError.notFound('Không tìm thấy quân nhân')
		return { ok: true }
	}
)

export interface ImportPersonnelItem {
	/** Bỏ trống → tự sinh */
	code?: string | null
	fullName: string
	enlistmentDate?: string | null
	recruitment?: string | null
	objectType: string
	rank?: string | null
	position?: string | null
	unitId?: number | null
	unitName?: string | null
	hometown?: string | null
	permanentResidence?: string | null
	userId?: number | null
}

export interface ImportPersonnelResult {
	successCount: number
	errorCount: number
	totalCount: number
	errors: { row: number; message: string }[]
}

/** Import hàng loạt — upsert theo mã (code). */
export const ImportLeavePersonnel = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/personnel/import'
	},
	async (body: {
		items: ImportPersonnelItem[]
	}): Promise<{ data: ImportPersonnelResult }> => {
		const items = body.items || []
		if (!items.length) {
			throw APIError.invalidArgument('Danh sách import trống')
		}
		if (items.length > 2000) {
			throw APIError.invalidArgument('Tối đa 2000 dòng mỗi lần import')
		}

		const errors: { row: number; message: string }[] = []
		let successCount = 0
		const maxRow = await orm
			.select({ id: leavePersonnel.id })
			.from(leavePersonnel)
			.orderBy(sql`${leavePersonnel.id} desc`)
			.limit(1)
		let nextSeq = (maxRow[0]?.id ?? 0) + 1
		const usedCodes = new Set<string>()

		for (let i = 0; i < items.length; i++) {
			const row = i + 1
			const item = items[i]!
			let code = String(item.code || '').trim()
			const fullName = String(item.fullName || '').trim()
			if (!fullName) {
				errors.push({ row, message: 'Tên là bắt buộc' })
				continue
			}
			if (!code) {
				do {
					code = `QN-${String(nextSeq++).padStart(6, '0')}`
				} while (usedCodes.has(code))
			}
			usedCodes.add(code)
			const objectTypeRaw = String(item.objectType || 'SQ')
				.trim()
				.toUpperCase()
			if (!isLeaveObjectType(objectTypeRaw)) {
				errors.push({
					row,
					message: `Đối tượng không hợp lệ: ${item.objectType}`
				})
				continue
			}
			const objectType = normalizeObjectType(objectTypeRaw)!
			let userId: number | null = null
			if (item.userId != null && String(item.userId).trim() !== '') {
				userId = Number(item.userId)
				if (Number.isNaN(userId) || userId <= 0) {
					errors.push({ row, message: 'User ID không hợp lệ' })
					continue
				}
			}

			const values = {
				code,
				fullName,
				enlistmentDate: item.enlistmentDate
					? String(item.enlistmentDate).trim() || null
					: null,
				recruitment: item.recruitment
					? String(item.recruitment).trim() || null
					: null,
				objectType,
				rank: item.rank ? String(item.rank).trim() || null : null,
				position: item.position
					? String(item.position).trim() || null
					: null,
				unitId: item.unitId ?? null,
				unitName: item.unitName
					? String(item.unitName).trim() || null
					: null,
				hometown: item.hometown
					? String(item.hometown).trim() || null
					: null,
				permanentResidence: item.permanentResidence
					? String(item.permanentResidence).trim() || null
					: null,
				userId: userId && userId > 0 ? userId : null
			}

			try {
				const existing = await orm
					.select()
					.from(leavePersonnel)
					.where(eq(leavePersonnel.code, code))
					.limit(1)
				if (existing[0]) {
					await orm
						.update(leavePersonnel)
						.set(values)
						.where(eq(leavePersonnel.id, existing[0].id))
				} else {
					await orm.insert(leavePersonnel).values(values)
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
