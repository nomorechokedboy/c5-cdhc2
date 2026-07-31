/**
 * Quy định về phép + tính ngày phép cơ bản
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, asc, eq } from 'drizzle-orm'
import orm from '../database'
import {
	leaveRegulations,
	leaveObjectTypes,
	leaveExtraStandards,
	type LeaveObjectType,
	type LeaveType
} from '../schema/leave-management'
import {
	asOfFromDate,
	canTakeSpecialLeave,
	computeServiceYears,
	isLeaveObjectType,
	normalizeObjectType,
	objectTypeLabel,
	resolveAnnualBaseDays,
	OBJECT_TYPE_LABELS,
	EXTRA_5_REASONS,
	EXTRA_10_REASONS,
	SPECIAL_REASONS,
	SPECIAL_MAX_DAYS,
	CANONICAL_OBJECT_TYPES
} from './helpers'

export interface RegulationResponse {
	id: number
	createdAt: string
	updatedAt: string
	leaveType: LeaveType
	objectType: LeaveObjectType | null
	objectTypeLabel: string | null
	minYears: number | null
	maxYears: number | null
	baseDays: number
	label: string | null
	description: string | null
	isActive: boolean
}

function mapRow(r: typeof leaveRegulations.$inferSelect): RegulationResponse {
	const ot = r.objectType
		? normalizeObjectType(String(r.objectType)) ||
			(r.objectType as LeaveObjectType)
		: null
	return {
		id: r.id,
		createdAt: r.createdAt ?? '',
		updatedAt: r.updatedAt ?? '',
		leaveType: r.leaveType as LeaveType,
		objectType: ot,
		objectTypeLabel: ot ? objectTypeLabel(ot) : null,
		minYears: r.minYears,
		maxYears: r.maxYears,
		baseDays: r.baseDays,
		label: r.label,
		description: r.description,
		isActive: !!r.isActive
	}
}

export const ListLeaveRegulations = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/regulations'
	},
	async (q: {
		leaveType?: Query<string>
	}): Promise<{ data: RegulationResponse[] }> => {
		const conditions = []
		if (q.leaveType === 'ANNUAL' || q.leaveType === 'SPECIAL') {
			conditions.push(eq(leaveRegulations.leaveType, q.leaveType))
		}
		const rows = await orm
			.select()
			.from(leaveRegulations)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(
				asc(leaveRegulations.leaveType),
				asc(leaveRegulations.objectType),
				asc(leaveRegulations.minYears)
			)
		return { data: rows.map(mapRow) }
	}
)

/** Metadata form đề xuất: đối tượng, lý do nghỉ thêm */
export const GetLeaveMeta = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/meta'
	},
	async (): Promise<{
		data: {
			objectTypes: { code: LeaveObjectType; label: string }[]
			extra10Reasons: { code: string; label: string }[]
			extra5Reasons: { code: string; label: string }[]
			specialReasons: { code: string; label: string }[]
			specialMaxDays: number
			specialEligible: LeaveObjectType[]
		}
	}> => {
		// Bảng đối tượng (DB) → fallback hardcode
		let objectTypes: { code: LeaveObjectType; label: string }[] = []
		try {
			const ots = await orm
				.select()
				.from(leaveObjectTypes)
				.where(eq(leaveObjectTypes.isActive, true))
				.orderBy(asc(leaveObjectTypes.sortOrder))
			objectTypes = ots.map((o) => ({
				code: o.code as LeaveObjectType,
				label: o.name
			}))
		} catch {
			/* table may not exist yet */
		}
		if (!objectTypes.length) {
			objectTypes = CANONICAL_OBJECT_TYPES.map((code) => ({
				code,
				label: OBJECT_TYPE_LABELS[code] || code
			}))
		}

		// Tiêu chuẩn phép thêm (DB) → fallback
		let extra10: { code: string; label: string }[] = []
		let extra5: { code: string; label: string }[] = []
		try {
			const extras = await orm
				.select()
				.from(leaveExtraStandards)
				.where(eq(leaveExtraStandards.isActive, true))
				.orderBy(asc(leaveExtraStandards.sortOrder))
			extra10 = extras
				.filter((e) => e.days === 10)
				.map((e) => ({ code: e.code, label: e.label }))
			extra5 = extras
				.filter((e) => e.days === 5)
				.map((e) => ({ code: e.code, label: e.label }))
		} catch {
			/* table may not exist yet */
		}
		if (!extra10.length) {
			extra10 = EXTRA_10_REASONS.filter((r) =>
				['01', '02', '03'].includes(r.code)
			).map((r) => ({ code: r.code, label: r.label }))
		}
		if (!extra5.length) {
			extra5 = EXTRA_5_REASONS.filter((r) =>
				['04', '05', '06'].includes(r.code)
			).map((r) => ({ code: r.code, label: r.label }))
		}

		const specialEligible: LeaveObjectType[] = [
			'SQ',
			'QNCN',
			'CNQP',
			'VCQP'
		]

		return {
			data: {
				objectTypes,
				extra10Reasons: extra10,
				extra5Reasons: extra5,
				specialReasons: SPECIAL_REASONS.map((r) => ({
					code: r.code,
					label: r.label
				})),
				specialMaxDays: SPECIAL_MAX_DAYS,
				specialEligible
			}
		}
	}
)

/** Tính ngày phép cơ bản theo đối tượng + thâm niên */
export const ComputeLeaveDays = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/compute-days'
	},
	async (body: {
		objectType: string
		serviceYears?: number
		enlistmentDate?: string | null
		/** Ngày bắt đầu nghỉ — dùng tính thâm niên theo tài liệu */
		startDate?: string | null
		leaveType?: string
		travelDays?: number
		extraDays?: number
		/** Số ngày phép đặc biệt (1–10) */
		specialDays?: number
	}): Promise<{
		data: {
			serviceYears: number
			baseDays: number
			travelDays: number
			extraDays: number
			totalDays: number
		}
	}> => {
		if (!isLeaveObjectType(body.objectType)) {
			throw APIError.invalidArgument('Đối tượng không hợp lệ')
		}
		const objectType = normalizeObjectType(body.objectType)!
		const serviceYears =
			body.serviceYears != null
				? Number(body.serviceYears)
				: computeServiceYears(
						body.enlistmentDate,
						asOfFromDate(body.startDate)
					)
		const leaveType = (body.leaveType || 'ANNUAL') as LeaveType

		// Phép đặc biệt: tối đa 10 ngày / lần, không cộng nghỉ thêm/đi đường
		if (leaveType === 'SPECIAL') {
			if (!canTakeSpecialLeave(objectType)) {
				throw APIError.invalidArgument(
					'Chỉ sỹ quan, QNCN, công nhân QP và viên chức QP được nghỉ phép đặc biệt'
				)
			}
			let specialDays = Number(body.specialDays ?? SPECIAL_MAX_DAYS)
			if (!Number.isFinite(specialDays)) specialDays = SPECIAL_MAX_DAYS
			specialDays = Math.min(
				SPECIAL_MAX_DAYS,
				Math.max(1, Math.floor(specialDays))
			)
			return {
				data: {
					serviceYears,
					baseDays: specialDays,
					travelDays: 0,
					extraDays: 0,
					totalDays: specialDays
				}
			}
		}

		let baseDays = resolveAnnualBaseDays(objectType, serviceYears)

		// Ưu tiên rule DB (so khớp mã đã chuẩn hoá)
		const rules = await orm
			.select()
			.from(leaveRegulations)
			.where(
				and(
					eq(leaveRegulations.leaveType, leaveType),
					eq(leaveRegulations.isActive, true)
				)
			)

		const match = rules.find((r) => {
			const rot = r.objectType
				? normalizeObjectType(String(r.objectType))
				: null
			if (rot !== objectType) return false
			const min = r.minYears ?? 0
			const max = r.maxYears
			if (serviceYears < min) return false
			if (max != null && serviceYears >= max) return false
			return true
		})
		if (match) baseDays = match.baseDays

		const travelDays = Math.max(0, Number(body.travelDays || 0))
		const extraDays = Math.max(0, Number(body.extraDays || 0))
		return {
			data: {
				serviceYears,
				baseDays,
				travelDays,
				extraDays,
				totalDays: baseDays + travelDays + extraDays
			}
		}
	}
)

interface CreateRegulationBody {
	leaveType: string
	objectType?: string | null
	minYears?: number | null
	maxYears?: number | null
	baseDays: number
	label?: string | null
	description?: string | null
	isActive?: boolean
}

export const CreateLeaveRegulation = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/regulations'
	},
	async (
		body: CreateRegulationBody
	): Promise<{ data: RegulationResponse }> => {
		if (body.leaveType !== 'ANNUAL' && body.leaveType !== 'SPECIAL') {
			throw APIError.invalidArgument('Loại phép không hợp lệ')
		}
		if (body.baseDays == null || body.baseDays < 0) {
			throw APIError.invalidArgument('Số ngày không hợp lệ')
		}
		if (body.objectType && !isLeaveObjectType(body.objectType)) {
			throw APIError.invalidArgument('Đối tượng không hợp lệ')
		}
		const inserted = await orm
			.insert(leaveRegulations)
			.values({
				leaveType: body.leaveType as LeaveType,
				objectType: (body.objectType as LeaveObjectType) || null,
				minYears: body.minYears ?? null,
				maxYears: body.maxYears ?? null,
				baseDays: body.baseDays,
				label: body.label || null,
				description: body.description || null,
				isActive: body.isActive !== false
			})
			.returning()
		return { data: mapRow(inserted[0]!) }
	}
)

export const UpdateLeaveRegulation = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/leave/regulations/:id'
	},
	async ({
		id,
		...body
	}: { id: number } & Partial<CreateRegulationBody>): Promise<{
		data: RegulationResponse
	}> => {
		const existing = await orm
			.select()
			.from(leaveRegulations)
			.where(eq(leaveRegulations.id, id))
			.limit(1)
		if (!existing[0]) throw APIError.notFound('Không tìm thấy quy định')
		const updated = await orm
			.update(leaveRegulations)
			.set({
				...(body.baseDays != null ? { baseDays: body.baseDays } : {}),
				...(body.label !== undefined
					? { label: body.label || null }
					: {}),
				...(body.description !== undefined
					? { description: body.description || null }
					: {}),
				...(body.isActive !== undefined
					? { isActive: body.isActive }
					: {}),
				...(body.minYears !== undefined
					? { minYears: body.minYears ?? null }
					: {}),
				...(body.maxYears !== undefined
					? { maxYears: body.maxYears ?? null }
					: {})
			})
			.where(eq(leaveRegulations.id, id))
			.returning()
		return { data: mapRow(updated[0]!) }
	}
)

export const DeleteLeaveRegulation = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/leave/regulations/:id'
	},
	async ({ id }: { id: number }): Promise<{ ok: boolean }> => {
		const res = await orm
			.delete(leaveRegulations)
			.where(eq(leaveRegulations.id, id))
			.returning()
		if (!res[0]) throw APIError.notFound('Không tìm thấy quy định')
		return { ok: true }
	}
)
