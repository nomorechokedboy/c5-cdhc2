/**
 * Báo cáo nghỉ phép
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, desc, eq, inArray, like, or } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import {
	leaveRecords,
	leaveRequests,
	leavePersonnel,
	students,
	users
} from '../schema'
import type { LeaveObjectType } from '../schema/leave-management'
import { resolveLeaveAccess } from './access'
import { writeLeaveAudit } from './audit'

export interface TakenListResponse {
	id: number
	createdAt: string
	updatedAt: string
	requestId: number
	status: string
	leaveType: string
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: LeaveObjectType
	objectTypeLabel: string
	rank: string | null
	position: string | null
	enlistmentDate: string | null
	unitId: number | null
	unitName: string | null
	serviceYears: number
	baseDays: number
	travelDays: number
	extraDays: number
	extraReasons: string[]
	totalDays: number
	startDate: string | null
	endDate: string | null
	leaveYear: string
	localityId: number | null
	localityPath: string | null
	note: string | null
	adminNote: string | null
	proposedByUserId: number | null
	proposedByUsername: string | null
	proposedByDisplayName: string | null
	decidedByUserId: number | null
	decidedByUsername: string | null
	decidedAt: string | null
	archivedAt: string
}

function parseReasons(raw: string | null): string[] {
	if (!raw) return []
	try {
		const v = JSON.parse(raw)
		return Array.isArray(v) ? v.map(String) : []
	} catch {
		return []
	}
}

function objectTypeLabel(ot: LeaveObjectType): string {
	const labels: Record<string, string> = {
		SQ: 'Sĩ quan',
		QNCN: 'Quân nhân chuyên nghiệp',
		CNQP: 'Cán bộ quân phục',
		VCQP: 'Viên chức quân phục',
		HSQBS: 'Hạ sĩ quan - Binh sĩ',
		HV: 'Học viên',
		KHAC: 'Khác'
	}
	return labels[ot] || ot
}

function mapRow(r: typeof leaveRecords.$inferSelect): TakenListResponse {
	const ot = r.objectType as LeaveObjectType
	return {
		id: r.id,
		createdAt: r.createdAt ?? '',
		updatedAt: r.updatedAt ?? '',
		requestId: r.requestId,
		status: (r as { status?: string }).status || 'PENDING',
		leaveType: r.leaveType,
		personnelId: r.personnelId,
		personnelCode: r.personnelCode,
		personnelName: r.personnelName,
		objectType: ot,
		objectTypeLabel: objectTypeLabel(ot),
		rank: r.rank,
		position: r.position,
		enlistmentDate: r.enlistmentDate,
		unitId: r.unitId,
		unitName: r.unitName,
		serviceYears: r.serviceYears,
		baseDays: r.baseDays,
		travelDays: r.travelDays,
		extraDays: r.extraDays,
		extraReasons: parseReasons(r.extraReasons),
		totalDays: r.totalDays,
		startDate: r.startDate,
		endDate: r.endDate,
		leaveYear:
			r.leaveYear ||
			String(r.startDate || '').slice(0, 4) ||
			String(new Date().getFullYear()),
		localityId: r.localityId,
		localityPath: r.localityPath,
		note: r.note,
		adminNote: r.adminNote,
		proposedByUserId: r.proposedByUserId,
		proposedByUsername: r.proposedByUsername,
		proposedByDisplayName: r.proposedByDisplayName,
		decidedByUserId: r.decidedByUserId,
		decidedByUsername: r.decidedByUsername,
		decidedAt: r.decidedAt,
		archivedAt: r.archivedAt
	}
}

export const GetTakenLeaveList = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/reports/taken-list'
	},
	async (q: {
		year: Query<number>
		leaveType?: Query<string>
		objectType?: Query<string>
		search?: Query<string>
		unitId?: Query<number>
	}): Promise<{ data: TakenListResponse[] }> => {
		const auth = getAuthData()!
		const access = await resolveLeaveAccess(
			Number(auth.userID),
			!!auth.isSuperAdmin,
			auth.permissions || []
		)
		const isAdmin = access.isAdmin

		const conditions = [
			or(
				eq(leaveRecords.leaveYear, String(Number(q.year))),
				like(leaveRecords.startDate, `${Number(q.year)}%`)
			)!,
			eq(leaveRecords.status, 'APPROVED')
		]

		if (!isAdmin) {
			if (access.isCommander && access.unitIds.length) {
				conditions.push(inArray(leaveRecords.unitId, access.unitIds))
			}
			const user = await orm
				.select({ diện_quản_lý: users.diện_quản_lý })
				.from(users)
				.where(eq(users.id, Number(auth.userID)))
				.limit(1)
			const domain = user[0]?.diện_quản_lý
			if (domain) {
				const studentIds = (
					await orm
						.select({ id: students.id })
						.from(students)
						.where(eq(students.diện_quản_lý, domain))
						.limit(10000)
				).map((s) => s.id)
				if (studentIds.length > 0) {
					conditions.push(
						inArray(leaveRecords.personnelId, studentIds)
					)
				}
			}
		}

		if (q.leaveType === 'ANNUAL' || q.leaveType === 'SPECIAL') {
			conditions.push(eq(leaveRecords.leaveType, q.leaveType))
		}
		if (q.objectType) {
			conditions.push(
				eq(
					leaveRecords.objectType,
					String(q.objectType) as LeaveObjectType
				)
			)
		}
		if (q.search) {
			const s = `%${String(q.search).trim()}%`
			conditions.push(
				or(
					like(leaveRecords.personnelName, s),
					like(leaveRecords.personnelCode, s)
				)!
			)
		}
		if (q.unitId) {
			conditions.push(eq(leaveRecords.unitId, Number(q.unitId)))
		}

		const rows = await orm
			.select()
			.from(leaveRecords)
			.where(and(...conditions))
			.orderBy(desc(leaveRecords.id))
			.limit(500)
		const requestRows = rows.length
			? await orm
					.select({
						id: leaveRequests.id,
						requestScope: leaveRequests.requestScope,
						classId: leaveRequests.classId,
						className: leaveRequests.className,
						proposedByUserId: leaveRequests.proposedByUserId,
						createdAt: leaveRequests.createdAt
					})
					.from(leaveRequests)
					.where(
						inArray(
							leaveRequests.id,
							rows.map((r) => r.requestId)
						)
					)
			: []
		const requestMeta = new Map(requestRows.map((r) => [r.id, r]))
		const grouped = new Map<string, TakenListResponse>()
		for (const row of rows) {
			const mapped = mapRow(row)
			const meta = requestMeta.get(row.requestId)
			const isClass =
				meta?.requestScope === 'CLASS' && meta.classId != null
			const key = isClass
				? [
						'class',
						meta.classId,
						meta.proposedByUserId ?? '',
						row.leaveType,
						row.startDate ?? '',
						row.endDate ?? '',
						row.totalDays,
						row.note ?? '',
						String(meta.createdAt).slice(0, 16)
					].join(':')
				: `request:${row.requestId}`
			if (!grouped.has(key)) {
				grouped.set(
					key,
					isClass
						? {
								...mapped,
								personnelId: null,
								personnelCode: null,
								personnelName: meta.className || 'Lớp',
								objectType: 'HV',
								objectTypeLabel: 'Học viên'
							}
						: mapped
				)
			}
		}
		const result = [...grouped.values()]
		await writeLeaveAudit({
			action: 'VIEW',
			entityType: 'LEAVE_REPORT',
			details: {
				report: 'taken-list',
				year: q.year,
				count: result.length
			}
		})

		return { data: result }
	}
)

export const CheckYearLeave = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/reports/check-year'
	},
	async (q: {
		year: Query<number>
		search?: Query<string>
		unitId?: Query<number>
	}): Promise<{
		data: Array<{
			personnelCode: string | null
			personnelName: string | null
			objectType: string
			objectTypeLabel: string
			unitName: string | null
			totalDays: number
			remainingDays: number
			quotaDays: number
		}>
	}> => {
		const conditions = [
			or(
				eq(leaveRecords.leaveYear, String(Number(q.year))),
				like(leaveRecords.startDate, `${Number(q.year)}%`)
			)!,
			eq(leaveRecords.status, 'APPROVED'),
			eq(leaveRecords.leaveType, 'ANNUAL')
		]

		if (q.search) {
			const s = `%${String(q.search).trim()}%`
			conditions.push(
				or(
					like(leaveRecords.personnelCode, s),
					like(leaveRecords.personnelName, s)
				)!
			)
		}
		if (q.unitId) {
			conditions.push(eq(leaveRecords.unitId, Number(q.unitId)))
		}

		const rows = await orm
			.select()
			.from(leaveRecords)
			.where(and(...conditions))
			.orderBy(desc(leaveRecords.id))
			.limit(500)

		const today = new Date()
		today.setHours(0, 0, 0, 0)
		await writeLeaveAudit({
			action: 'VIEW',
			entityType: 'LEAVE_REPORT',
			details: { report: 'check-year', year: q.year, count: rows.length }
		})
		return {
			data: rows.map((row) => {
				const start = row.startDate
					? new Date(`${row.startDate.slice(0, 10)}T00:00:00`)
					: null
				const elapsed =
					start && !Number.isNaN(start.getTime()) && today >= start
						? Math.floor(
								(today.getTime() - start.getTime()) / 86_400_000
							) + 1
						: 0
				const usedDays = Math.min(row.totalDays, Math.max(0, elapsed))
				const ot = row.objectType as LeaveObjectType
				return {
					personnelCode: row.personnelCode,
					personnelName: row.personnelName,
					objectType: ot,
					objectTypeLabel: objectTypeLabel(ot),
					unitName: row.unitName,
					totalDays: row.totalDays,
					remainingDays: Math.max(0, row.totalDays - usedDays),
					quotaDays: row.baseDays
				}
			})
		}
	}
)

export const GetNotYetTakenLeave = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/reports/not-yet-taken'
	},
	async (q: {
		year: Query<number>
		objectType?: Query<string>
		unitId?: Query<number>
	}): Promise<{
		data: Array<{
			personnelId: number | null
			personnelCode: string | null
			personnelName: string | null
			objectType: string
			unitId: number | null
			unitName: string | null
		}>
	}> => {
		const year = String(Number(q.year))
		const reportAuth = (await getAuthData())!
		const access = await resolveLeaveAccess(
			Number(reportAuth.userID),
			!!reportAuth.isSuperAdmin,
			reportAuth.permissions || []
		)
		const isAdmin = access.isAdmin

		let personnels: {
			id: number
			code: string
			fullName: string
			objectType: string
			unitId: number | null
			unitName: string | null
		}[] = []

		const otFilter = q.objectType
			? String(q.objectType).toUpperCase()
			: null

		if (isAdmin) {
			personnels = await orm
				.select()
				.from(leavePersonnel)
				.where(
					otFilter
						? eq(leavePersonnel.objectType, otFilter as any)
						: undefined
				)
		} else {
			if (!access.isCommander || access.unitIds.length === 0) {
				return { data: [] }
			}
			const personnelConditions = [
				inArray(leavePersonnel.unitId, access.unitIds)
			]
			if (otFilter) {
				personnelConditions.push(
					eq(leavePersonnel.objectType, otFilter as any)
				)
			}
			personnels = await orm
				.select()
				.from(leavePersonnel)
				.where(and(...personnelConditions))
		}

		if (q.unitId) {
			const unitId = Number(q.unitId)
			personnels = personnels.filter((p) => p.unitId === unitId)
		}

		const result: Array<{
			personnelId: number | null
			personnelCode: string | null
			personnelName: string | null
			objectType: string
			unitId: number | null
			unitName: string | null
		}> = []

		for (const p of personnels) {
			const existing = await orm
				.select()
				.from(leaveRecords)
				.where(
					and(
						eq(leaveRecords.leaveYear, year),
						eq(leaveRecords.personnelId, p.id),
						eq(leaveRecords.status, 'APPROVED'),
						eq(leaveRecords.leaveType, 'ANNUAL')
					)
				)
				.limit(1)

			if (!existing[0]) {
				result.push({
					personnelId: p.id,
					personnelCode: p.code,
					personnelName: p.fullName,
					objectType: p.objectType,
					unitId: p.unitId,
					unitName: p.unitName
				})
			}
		}

		await writeLeaveAudit({
			action: 'VIEW',
			entityType: 'LEAVE_REPORT',
			details: {
				report: 'not-yet-taken',
				year: q.year,
				count: result.length
			}
		})
		return { data: result }
	}
)
