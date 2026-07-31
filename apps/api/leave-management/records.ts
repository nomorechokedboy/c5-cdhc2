/**
 * Bảng lưu thông tin nghỉ phép — chỉ công khai bản ghi đã được ký duyệt.
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, desc, eq, inArray, like, or } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import {
	leaveRecords,
	leaveRequests,
	type LeaveObjectType,
	type LeaveRequestStatus,
	type LeaveType
} from '../schema/leave-management'
import { OBJECT_TYPE_LABELS, objectTypeLabel } from './helpers'
import { resolveLeaveAccess } from './access'
import { writeLeaveAudit } from './audit'

export interface LeaveRecordResponse {
	id: number
	createdAt: string
	updatedAt: string
	requestId: number
	status: LeaveRequestStatus
	leaveType: LeaveType
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
	requestScope: 'INDIVIDUAL' | 'CLASS'
	classId: number | null
	className: string | null
	memberCount: number
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

function mapRow(r: typeof leaveRecords.$inferSelect): LeaveRecordResponse {
	const ot = r.objectType as LeaveObjectType
	return {
		id: r.id,
		createdAt: r.createdAt ?? '',
		updatedAt: r.updatedAt ?? '',
		requestId: r.requestId,
		status: ((r as { status?: string }).status ||
			'PENDING') as LeaveRequestStatus,
		leaveType: r.leaveType as LeaveType,
		personnelId: r.personnelId,
		personnelCode: r.personnelCode,
		personnelName: r.personnelName,
		objectType: ot,
		objectTypeLabel: objectTypeLabel(ot) || OBJECT_TYPE_LABELS[ot] || ot,
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
		archivedAt: r.archivedAt,
		requestScope: 'INDIVIDUAL',
		classId: null,
		className: null,
		memberCount: 1
	}
}

export const ListLeaveRecords = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/records'
	},
	async (q: {
		search?: Query<string>
		year?: Query<number>
		leaveType?: Query<string>
		objectType?: Query<string>
		status?: Query<string>
	}): Promise<{ data: LeaveRecordResponse[] }> => {
		const auth = getAuthData()!
		const access = await resolveLeaveAccess(
			Number(auth.userID),
			!!auth.isSuperAdmin
		)
		const conditions = []
		// Lưu trữ là sổ các giấy phép đã ký, không phải lịch sử luân chuyển đơn.
		conditions.push(eq(leaveRecords.status, 'APPROVED'))
		if (!access.isAdmin) {
			if (!access.unitIds.length) return { data: [] }
			conditions.push(inArray(leaveRecords.unitId, access.unitIds))
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
		if (q.year) {
			const y = String(Number(q.year))
			conditions.push(like(leaveRecords.startDate, `${y}%`))
		}
		if (q.search) {
			const s = `%${String(q.search).trim()}%`
			conditions.push(
				or(
					like(leaveRecords.personnelName, s),
					like(leaveRecords.personnelCode, s),
					like(leaveRecords.unitName, s),
					like(leaveRecords.localityPath, s)
				)!
			)
		}
		const rows = await orm
			.select()
			.from(leaveRecords)
			.where(conditions.length ? and(...conditions) : undefined)
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
		const grouped = new Map<string, LeaveRecordResponse>()
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
			const existing = grouped.get(key)
			if (existing) {
				existing.memberCount += 1
			} else {
				grouped.set(
					key,
					isClass
						? {
								...mapped,
								requestScope: 'CLASS',
								classId: meta.classId,
								className: meta.className,
								memberCount: 1,
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
				year: q.year,
				leaveType: q.leaveType,
				count: result.length
			}
		})
		return { data: result }
	}
)

export const GetLeaveRecord = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/records/:id'
	},
	async ({ id }: { id: number }): Promise<{ data: LeaveRecordResponse }> => {
		const auth = getAuthData()!
		const access = await resolveLeaveAccess(
			Number(auth.userID),
			!!auth.isSuperAdmin
		)
		const rows = await orm
			.select()
			.from(leaveRecords)
			.where(eq(leaveRecords.id, id))
			.limit(1)
		if (!rows[0])
			throw APIError.notFound('Không tìm thấy bản ghi nghỉ phép')
		if (rows[0].status !== 'APPROVED') {
			throw APIError.notFound('Bản ghi chưa được ký duyệt')
		}
		if (
			!access.isAdmin &&
			(rows[0].unitId == null || !access.unitIds.includes(rows[0].unitId))
		) {
			throw APIError.permissionDenied('Không có quyền xem bản ghi này')
		}
		return { data: mapRow(rows[0]) }
	}
)
