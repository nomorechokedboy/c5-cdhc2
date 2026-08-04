/**
 * Danh sách phép + đề xuất nghỉ phép
 */
import { api, APIError, Query } from 'encore.dev/api'
import log from 'encore.dev/log'
import { and, desc, eq, like, or } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import {
	leavePersonnel,
	leaveRequests,
	leaveRegulations,
	leaveRecords,
	type LeaveObjectType,
	type LeaveRequestStatus,
	type LeaveType
} from '../schema/leave-management'
import { leaveBatches } from '../schema/leave-batches'
import {
	asOfFromDate,
	canTakeExtraLeave,
	computeServiceYears,
	isLeaveObjectType,
	normalizeObjectType,
	nowIso,
	objectTypeLabel,
	resolveAnnualBaseDays,
	validateExtraReasons,
	validateSpecialLeave,
	SPECIAL_MAX_DAYS
} from './helpers'
import { resolveLocalityPath } from './localities'
import { resolveLeaveAccess } from './access'
import { users } from '../schema/users'
import {
	buildLeaveDecisionMail,
	buildLeaveSubmittedMail,
	looksLikeEmail,
	sendLeaveMail
} from './mail'
import { alertSuperAdmins, createLeaveAlert } from './alerts'
import { resolveUnitCommander } from './units'

/**
 * Email người nhận thông báo — ưu tiên users.email (đã cập nhật trên tài khoản).
 * Fallback: leave_personnel.email · username dạng email.
 */
async function resolveUserEmail(
	userId: number | null | undefined
): Promise<string | null> {
	if (userId == null || userId <= 0) return null
	const u = await orm
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)
	const row = u[0] as { email?: string | null; username?: string } | undefined
	if (row?.email && looksLikeEmail(row.email)) {
		return row.email.trim()
	}
	if (row?.username && looksLikeEmail(row.username)) {
		return row.username.trim()
	}
	const p = await orm
		.select()
		.from(leavePersonnel)
		.where(eq(leavePersonnel.userId, userId))
		.limit(1)
	if (p[0]?.email && looksLikeEmail(p[0].email)) {
		return p[0].email.trim()
	}
	return null
}

/** Email quân nhân nhận kết quả duyệt: user liên kết hồ sơ / người đề xuất */
async function resolvePersonnelNotifyEmail(
	row: typeof leaveRequests.$inferSelect
): Promise<string | null> {
	// 1) User người đề xuất (tài khoản đăng nhập)
	if (row.proposedByUserId) {
		const e = await resolveUserEmail(row.proposedByUserId)
		if (e) return e
	}
	// 2) User gắn trên hồ sơ QN
	if (row.personnelId) {
		const p = await orm
			.select()
			.from(leavePersonnel)
			.where(eq(leavePersonnel.id, row.personnelId))
			.limit(1)
		if (p[0]?.userId) {
			const e = await resolveUserEmail(p[0].userId)
			if (e) return e
		}
		if (p[0]?.email && looksLikeEmail(p[0].email)) {
			return p[0].email.trim()
		}
	}
	// 3) Snapshot lúc gửi đơn
	if (row.proposerEmail && looksLikeEmail(row.proposerEmail)) {
		return row.proposerEmail.trim()
	}
	return null
}

async function resolveAdminEmails(): Promise<string[]> {
	const admins = await orm
		.select()
		.from(users)
		.where(eq(users.isSuperUser, true))
	const emails: string[] = []
	for (const a of admins) {
		const e = await resolveUserEmail(a.id)
		if (e) emails.push(e)
		else if (looksLikeEmail(a.username)) emails.push(a.username.trim())
	}
	return [...new Set(emails)]
}

export interface LeaveRequestResponse {
	id: number
	createdAt: string
	updatedAt: string
	leaveType: LeaveType
	requestScope: 'INDIVIDUAL' | 'CLASS' | 'SHORT_LEAVE'
	classId: number | null
	className: string | null
	status: LeaveRequestStatus
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
	proposedByUserId: number | null
	proposedByUsername: string | null
	proposedByDisplayName: string | null
	proposerEmail: string | null
	commanderUserId: number | null
	commanderName: string | null
	replacementPersonnelId: number | null
	replacementPersonnelName: string | null
	replacementPosition: string | null
	adminNote: string | null
	decidedByUserId: number | null
	decidedByUsername: string | null
	decidedAt: string | null
	/** Số ngày đã đi (đơn APPROVED cùng năm, cùng loại) */
	usedDays: number
	/** Số ngày còn lại theo hạn mức năm (chỉ ANNUAL; SPECIAL = null) */
	remainingDays: number | null
	/** Hạn mức ngày phép cơ bản năm */
	quotaDays: number | null
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

function leaveYear(startDate: string | null | undefined): string {
	if (startDate && /^\d{4}/.test(startDate)) return startDate.slice(0, 4)
	return String(new Date().getFullYear())
}

/** Parse YYYY-MM-DD → Date local midnight (tránh lệch timezone) */
function parseDateOnly(iso: string | null | undefined): Date | null {
	if (!iso) return null
	const m = String(iso)
		.trim()
		.match(/^(\d{4})-(\d{2})-(\d{2})/)
	if (!m) {
		const d = new Date(iso)
		return Number.isNaN(d.getTime()) ? null : d
	}
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}

function startOfToday(asOf: Date = new Date()): Date {
	return new Date(asOf.getFullYear(), asOf.getMonth(), asOf.getDate())
}

/**
 * Số ngày đã thực sự đi (trôi qua trên lịch), không phải tổng ngày được duyệt.
 * - Chưa tới startDate → 0
 * - Đang trong khoảng nghỉ → từ start đến hôm nay (inclusive)
 * - Đã qua endDate → full totalDays
 */
export function elapsedLeaveDays(
	startDate: string | null | undefined,
	endDate: string | null | undefined,
	totalDays: number,
	asOf: Date = new Date()
): number {
	const start = parseDateOnly(startDate)
	if (!start) return 0
	const today = startOfToday(asOf)
	if (today < start) return 0

	const total = Math.max(0, Number(totalDays) || 0)
	let end = parseDateOnly(endDate)
	if (!end && total >= 1) {
		end = new Date(start)
		end.setDate(end.getDate() + total - 1)
	}
	if (end && today > end) {
		return total > 0
			? total
			: Math.max(
					0,
					Math.round((end.getTime() - start.getTime()) / 86400000) + 1
				)
	}

	// Đang nghỉ: inclusive start..today
	const elapsed =
		Math.round((today.getTime() - start.getTime()) / 86400000) + 1
	if (total > 0) return Math.min(total, Math.max(0, elapsed))
	return Math.max(0, elapsed)
}

function mapRow(
	r: typeof leaveRequests.$inferSelect,
	usage?: {
		usedDays: number
		remainingDays: number | null
		quotaDays: number | null
	}
): LeaveRequestResponse {
	const ot =
		(normalizeObjectType(String(r.objectType)) as LeaveObjectType) ||
		(r.objectType as LeaveObjectType)
	return {
		id: r.id,
		createdAt: r.createdAt ?? '',
		updatedAt: r.updatedAt ?? '',
		leaveType: r.leaveType as LeaveType,
		requestScope: r.requestScope as 'INDIVIDUAL' | 'CLASS' | 'SHORT_LEAVE',
		classId: r.classId ?? null,
		className: r.className ?? null,
		status: r.status as LeaveRequestStatus,
		personnelId: r.personnelId,
		personnelCode: r.personnelCode,
		personnelName: r.personnelName,
		objectType: ot,
		objectTypeLabel: objectTypeLabel(ot),
		rank: r.rank,
		position: (r as { position?: string | null }).position ?? null,
		enlistmentDate:
			(r as { enlistmentDate?: string | null }).enlistmentDate ?? null,
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
		proposedByUserId: r.proposedByUserId,
		proposedByUsername: r.proposedByUsername,
		proposedByDisplayName: r.proposedByDisplayName,
		proposerEmail: r.proposerEmail ?? null,
		commanderUserId: r.commanderUserId ?? null,
		commanderName: r.commanderName ?? null,
		replacementPersonnelId: r.replacementPersonnelId ?? null,
		replacementPersonnelName: r.replacementPersonnelName ?? null,
		replacementPosition: r.replacementPosition ?? null,
		adminNote: r.adminNote,
		decidedByUserId: r.decidedByUserId,
		decidedByUsername: r.decidedByUsername,
		decidedAt: r.decidedAt,
		usedDays: usage?.usedDays ?? 0,
		remainingDays: usage?.remainingDays ?? null,
		quotaDays: usage?.quotaDays ?? null
	}
}

/**
 * Lưu trữ: ghi khi gửi duyệt, cập nhật khi xử lý (upsert theo requestId).
 */
async function upsertLeaveRecord(
	row: typeof leaveRequests.$inferSelect
): Promise<void> {
	const payload = {
		requestId: row.id,
		status: row.status as LeaveRequestStatus,
		leaveType: row.leaveType as LeaveType,
		personnelId: row.personnelId,
		personnelCode: row.personnelCode,
		personnelName: row.personnelName,
		objectType: row.objectType as LeaveObjectType,
		rank: row.rank,
		position: (row as { position?: string | null }).position ?? null,
		enlistmentDate:
			(row as { enlistmentDate?: string | null }).enlistmentDate ?? null,
		unitId: row.unitId,
		unitName: row.unitName,
		serviceYears: row.serviceYears,
		baseDays: row.baseDays,
		travelDays: row.travelDays,
		extraDays: row.extraDays,
		extraReasons: row.extraReasons,
		totalDays: row.totalDays,
		startDate: row.startDate,
		endDate: row.endDate,
		leaveYear: leaveYear(row.startDate),
		localityId: row.localityId,
		localityPath: row.localityPath,
		note: row.note,
		replacementPersonnelId: row.replacementPersonnelId,
		replacementPersonnelName: row.replacementPersonnelName,
		replacementPosition: row.replacementPosition,
		adminNote: row.adminNote,
		proposedByUserId: row.proposedByUserId,
		proposedByUsername: row.proposedByUsername,
		proposedByDisplayName: row.proposedByDisplayName,
		decidedByUserId: row.decidedByUserId,
		decidedByUsername: row.decidedByUsername,
		decidedAt: row.decidedAt,
		archivedAt: nowIso()
	}
	const existing = await orm
		.select({ id: leaveRecords.id })
		.from(leaveRecords)
		.where(eq(leaveRecords.requestId, row.id))
		.limit(1)
	if (existing[0]) {
		await orm
			.update(leaveRecords)
			.set(payload)
			.where(eq(leaveRecords.id, existing[0].id))
	} else {
		await orm.insert(leaveRecords).values(payload)
	}
}

/**
 * Đã đi / còn lại theo personnel + năm (đơn APPROVED):
 * - Đã đi = số ngày đã trôi qua trên lịch (từ start → hôm nay), không lấy full totalDays
 * - Còn lại = số ngày phép đã duyệt nhưng chưa tới (totalDays − đã trôi qua)
 * - quotaDays = hạn mức phép cơ bản năm (tham chiếu, ANNUAL)
 */
async function computeUsageForRows(
	rows: (typeof leaveRequests.$inferSelect)[]
): Promise<
	Map<
		number,
		{
			usedDays: number
			remainingDays: number | null
			quotaDays: number | null
		}
	>
> {
	const result = new Map<
		number,
		{
			usedDays: number
			remainingDays: number | null
			quotaDays: number | null
		}
	>()
	if (!rows.length) return result

	const asOf = new Date()
	const approved = await orm
		.select()
		.from(leaveRequests)
		.where(eq(leaveRequests.status, 'APPROVED'))

	for (const r of rows) {
		const year = leaveYear(r.startDate)
		const leaveType = r.leaveType as LeaveType
		const related = approved.filter((a) => {
			if (a.personnelId == null || a.personnelId !== r.personnelId)
				return false
			if (a.leaveType !== leaveType) return false
			return leaveYear(a.startDate) === year
		})

		let used = 0
		let remainingOnLeave = 0
		for (const a of related) {
			const total = Number(a.totalDays) || 0
			const el = elapsedLeaveDays(a.startDate, a.endDate, total, asOf)
			used += el
			remainingOnLeave += Math.max(0, total - el)
		}

		let quota: number | null = null
		if (leaveType === 'ANNUAL') {
			const ot =
				normalizeObjectType(String(r.objectType)) ||
				(r.objectType as LeaveObjectType)
			quota = await resolveBaseDays(
				'ANNUAL',
				ot as LeaveObjectType,
				r.serviceYears
			)
		}

		result.set(r.id, {
			usedDays: used,
			remainingDays: remainingOnLeave,
			quotaDays: quota
		})
	}
	return result
}

async function resolveBaseDays(
	leaveType: LeaveType,
	objectType: LeaveObjectType,
	serviceYears: number
): Promise<number> {
	const rules = await orm
		.select()
		.from(leaveRegulations)
		.where(
			and(
				eq(leaveRegulations.leaveType, leaveType),
				eq(leaveRegulations.isActive, true)
			)
		)

	if (leaveType === 'SPECIAL') {
		// Mặc định tối đa 10 ngày; số ngày thực tế do client gửi (specialDays)
		return SPECIAL_MAX_DAYS
	}

	const ot = normalizeObjectType(String(objectType)) || objectType
	const match = rules.find((r) => {
		const rot = r.objectType
			? normalizeObjectType(String(r.objectType))
			: null
		if (rot !== ot) return false
		const min = r.minYears ?? 0
		const max = r.maxYears
		if (serviceYears < min) return false
		if (max != null && serviceYears >= max) return false
		return true
	})
	if (match) return match.baseDays
	return resolveAnnualBaseDays(ot, serviceYears)
}

export const ListLeaveRequests = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/requests'
	},
	async (q: {
		status?: Query<string>
		mine?: Query<boolean>
		leaveType?: Query<string>
		/** Tìm mã QN hoặc họ tên */
		search?: Query<string>
		/** Lọc theo chỉ huy cơ quan (user id) */
		commanderUserId?: Query<number>
		/**
		 * mine — đơn tôi đề xuất
		 * commander — đơn chờ/tôi là chỉ huy cơ quan
		 * agency — đơn chờ cơ quan quản lý (super admin)
		 * all — toàn bộ (super admin) hoặc đơn liên quan (user)
		 */
		inbox?: Query<string>
	}): Promise<{ data: LeaveRequestResponse[] }> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const isAdmin = !!auth.isSuperAdmin
		const access = await resolveLeaveAccess(uid, isAdmin)
		const conditions = []
		if (q.status) {
			const st = String(q.status)
			// legacy PENDING ≈ chờ chỉ huy
			if (st === 'PENDING') {
				conditions.push(
					or(
						eq(leaveRequests.status, 'PENDING'),
						eq(leaveRequests.status, 'PENDING_COMMANDER')
					)!
				)
			} else {
				conditions.push(
					eq(leaveRequests.status, st as LeaveRequestStatus)
				)
			}
		}
		if (q.leaveType === 'ANNUAL' || q.leaveType === 'SPECIAL') {
			conditions.push(eq(leaveRequests.leaveType, q.leaveType))
		}
		if (q.commanderUserId != null && Number(q.commanderUserId) > 0) {
			conditions.push(
				eq(leaveRequests.commanderUserId, Number(q.commanderUserId))
			)
		}
		if (q.search) {
			const s = `%${String(q.search).trim()}%`
			if (String(q.search).trim()) {
				conditions.push(
					or(
						like(leaveRequests.personnelCode, s),
						like(leaveRequests.personnelName, s)
					)!
				)
			}
		}

		const inbox = String(
			q.inbox || (q.mine ? 'mine' : isAdmin ? 'all' : 'related')
		)
		if (inbox === 'mine') {
			conditions.push(eq(leaveRequests.proposedByUserId, uid))
		} else if (inbox === 'commander') {
			conditions.push(eq(leaveRequests.commanderUserId, uid))
		} else if (inbox === 'agency') {
			if (!isAdmin && !access.isAgency) {
				throw APIError.permissionDenied(
					'Chỉ cơ quan quản lý xem hộp thư này'
				)
			}
			conditions.push(eq(leaveRequests.status, 'PENDING_AGENCY'))
			if (!isAdmin && access.unitIds.length) {
				conditions.push(
					or(
						...access.unitIds.map((id) =>
							eq(leaveRequests.unitId, id)
						)
					)!
				)
			}
		} else if (inbox === 'all') {
			if (!isAdmin) {
				if (access.isAgency && access.unitIds.length) {
					conditions.push(
						or(
							...access.unitIds.map((id) =>
								eq(leaveRequests.unitId, id)
							)
						)!
					)
				} else {
					conditions.push(
						or(
							eq(leaveRequests.proposedByUserId, uid),
							eq(leaveRequests.commanderUserId, uid)
						)!
					)
				}
			}
		} else {
			// related
			conditions.push(
				or(
					eq(leaveRequests.proposedByUserId, uid),
					eq(leaveRequests.commanderUserId, uid)
				)!
			)
		}

		const rows = await orm
			.select()
			.from(leaveRequests)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(desc(leaveRequests.id))
		const usage = await computeUsageForRows(rows)
		return {
			data: rows.map((r) => mapRow(r, usage.get(r.id)))
		}
	}
)

export const GetLeaveRequest = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/requests/:id'
	},
	async ({ id }: { id: number }): Promise<{ data: LeaveRequestResponse }> => {
		const auth = getAuthData()!
		const rows = await orm
			.select()
			.from(leaveRequests)
			.where(eq(leaveRequests.id, id))
			.limit(1)
		if (!rows[0]) throw APIError.notFound('Không tìm thấy đơn phép')
		const uid = Number(auth.userID)
		const access = await resolveLeaveAccess(uid, !!auth.isSuperAdmin)
		const isCommander =
			rows[0].commanderUserId != null && rows[0].commanderUserId === uid
		if (
			!auth.isSuperAdmin &&
			rows[0].proposedByUserId !== uid &&
			!isCommander &&
			!(
				access.isAgency &&
				rows[0].unitId != null &&
				access.unitIds.includes(rows[0].unitId)
			)
		) {
			throw APIError.permissionDenied('Không có quyền xem đơn này')
		}
		const usage = await computeUsageForRows([rows[0]])
		return { data: mapRow(rows[0], usage.get(rows[0].id)) }
	}
)

interface CreateLeaveBody {
	leaveType?: string
	requestScope?: 'INDIVIDUAL' | 'CLASS' | 'SHORT_LEAVE'
	classId?: number | null
	className?: string | null
	/** Chỉ huy/đại đội nhập trực tiếp, không tính theo thâm niên */
	manualDays?: number
	personnelId?: number | null
	/** Đối tượng cố định từ profile — server ưu tiên profile */
	objectType?: string
	rank?: string | null
	unitId?: number | null
	unitName?: string | null
	travelDays?: number
	extraDays?: number
	/** Lý do nghỉ thêm (ANNUAL) hoặc lý do phép đặc biệt (SPECIAL) */
	extraReasons?: string[]
	/** Số ngày phép đặc biệt (1–10), chỉ dùng khi leaveType=SPECIAL */
	specialDays?: number
	startDate?: string | null
	endDate?: string | null
	localityId?: number | null
	/** Địa chỉ cụ thể (số nhà, đường…) — ghép vào localityPath */
	localityDetail?: string | null
	note?: string | null
	replacementPersonnelId?: number | null
}

export const CreateLeaveRequest = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/requests'
	},
	async (body: CreateLeaveBody): Promise<{ data: LeaveRequestResponse }> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const access = await resolveLeaveAccess(uid, !!auth.isSuperAdmin)
		if (access.isAgency && !access.isAdmin) {
			throw APIError.permissionDenied(
				'Cơ quan quản lý không có quyền đề xuất nghỉ phép'
			)
		}
		const userRow = (
			await orm.select().from(users).where(eq(users.id, uid)).limit(1)
		)[0]

		// Prefill from linked personnel
		const personnel =
			body.personnelId != null
				? (
						await orm
							.select()
							.from(leavePersonnel)
							.where(eq(leavePersonnel.id, body.personnelId))
							.limit(1)
					)[0]
				: (
						await orm
							.select()
							.from(leavePersonnel)
							.where(eq(leavePersonnel.userId, uid))
							.limit(1)
					)[0]
		if (
			personnel &&
			!access.isAdmin &&
			personnel.userId !== uid &&
			(personnel.unitId == null ||
				!access.isCommander ||
				!access.unitIds.includes(personnel.unitId))
		) {
			throw APIError.permissionDenied(
				'Chỉ được đề xuất cho quân nhân thuộc đơn vị mình quản lý'
			)
		}

		// Super admin can create without personnel if objectType provided
		if (!personnel && !auth.isSuperAdmin) {
			throw APIError.failedPrecondition(
				'Tài khoản chưa liên kết hồ sơ quân nhân. Liên hệ quản trị để gán trong Danh sách quân nhân.'
			)
		}

		const rawObjectType = (personnel?.objectType ||
			body.objectType) as string
		if (!isLeaveObjectType(rawObjectType)) {
			throw APIError.invalidArgument('Đối tượng không hợp lệ')
		}
		const objectType = normalizeObjectType(rawObjectType)!

		const leaveType: LeaveType =
			body.leaveType === 'SPECIAL' ? 'SPECIAL' : 'ANNUAL'

		// Thâm niên: tháng/năm bắt đầu nghỉ − tháng/năm nhập ngũ/tuyển dụng
		const serviceYears = computeServiceYears(
			personnel?.enlistmentDate,
			asOfFromDate(body.startDate)
		)
		const extraReasons = body.extraReasons || []

		let baseDays: number
		let travelDays: number
		let extraDays: number
		let totalDays: number
		let reasonsJson: string

		if (leaveType === 'SPECIAL') {
			let specialDays = Number(body.specialDays ?? SPECIAL_MAX_DAYS)
			if (!Number.isFinite(specialDays)) specialDays = SPECIAL_MAX_DAYS
			specialDays = Math.min(
				SPECIAL_MAX_DAYS,
				Math.max(1, Math.floor(specialDays))
			)
			const err = validateSpecialLeave(
				objectType,
				specialDays,
				extraReasons
			)
			if (err) throw APIError.invalidArgument(err)
			baseDays = specialDays
			travelDays = 0
			extraDays = 0
			totalDays = specialDays
			reasonsJson = JSON.stringify(extraReasons)
		} else {
			baseDays = await resolveBaseDays(
				leaveType,
				objectType,
				serviceYears
			)
			travelDays = Math.max(0, Number(body.travelDays || 0))
			extraDays = Math.max(0, Number(body.extraDays || 0))
			if (extraDays > 0) {
				if (!canTakeExtraLeave(objectType)) {
					throw APIError.invalidArgument(
						'Hạ sĩ quan / binh sĩ không được nghỉ thêm theo quy định form này'
					)
				}
				const err = validateExtraReasons(extraDays, extraReasons)
				if (err) throw APIError.invalidArgument(err)
			} else {
				extraDays = 0
			}
			totalDays = baseDays + travelDays + extraDays
			reasonsJson = JSON.stringify(extraDays > 0 ? extraReasons : [])
		}
		if (body.manualDays !== undefined) {
			if (!access.isAdmin && !access.isCommander) {
				throw APIError.permissionDenied(
					'Chỉ chỉ huy đơn vị được nhập trực tiếp số ngày nghỉ'
				)
			}
			const manualDays = Math.floor(Number(body.manualDays))
			if (
				!Number.isFinite(manualDays) ||
				manualDays < 1 ||
				manualDays > 365
			) {
				throw APIError.invalidArgument('Số ngày nghỉ phải từ 1 đến 365')
			}
			baseDays = manualDays
			travelDays = 0
			extraDays = 0
			totalDays = manualDays
			reasonsJson = JSON.stringify(extraReasons)
		}

		const basePath = await resolveLocalityPath(body.localityId)
		const detail = body.localityDetail?.trim() || ''
		// VD: Tỉnh Hà Tĩnh, Xã Cẩm Bình, số 12 đường ABC
		const localityPath = detail
			? basePath
				? `${basePath}, ${detail}`
				: detail
			: body.manualDays !== undefined
				? personnel?.permanentResidence || personnel?.hometown || null
				: basePath

		// SQ/QNCN/CNQP/VCQP: chờ chỉ huy đơn vị → CQQL
		// Chỉ huy lấy cố định theo đơn vị (danh mục), fallback hồ sơ QN
		const needsCommander = canTakeExtraLeave(objectType)
		const unitForCmd = body.unitId ?? personnel?.unitId ?? null
		const fromUnit = await resolveUnitCommander(unitForCmd)
		const commanderId =
			fromUnit.commanderUserId ?? personnel?.commanderUserId ?? null
		const commanderNm =
			fromUnit.commanderName ?? personnel?.commanderName ?? null
		// Chỉ huy/Đại đội tự lập đơn: chuyển thẳng lên CQQL,
		// không tạo bước duyệt lại cho chính người lập.
		const proposedByCommander = access.isCommander && !auth.isSuperAdmin
		const initialStatus: LeaveRequestStatus = proposedByCommander
			? 'PENDING_AGENCY'
			: needsCommander && commanderId
				? 'PENDING_COMMANDER'
				: 'PENDING_AGENCY'

		if (needsCommander && !commanderId && !auth.isSuperAdmin) {
			throw APIError.failedPrecondition(
				'Đơn vị chưa gán Chỉ huy CQ (hoặc hồ sơ chưa có đơn vị). Gán chỉ huy tại Danh mục đơn vị.'
			)
		}

		// Snapshot email: ưu tiên email tài khoản đăng nhập (users.email)
		const proposerEmail =
			(await resolveUserEmail(uid)) || personnel?.email?.trim() || null
		let replacementPersonnel: typeof leavePersonnel.$inferSelect | undefined
		if (body.replacementPersonnelId != null) {
			replacementPersonnel = (
				await orm
					.select()
					.from(leavePersonnel)
					.where(eq(leavePersonnel.id, body.replacementPersonnelId))
					.limit(1)
			)[0]
			if (!replacementPersonnel)
				throw APIError.invalidArgument('Người thay thế không tồn tại')
			if (replacementPersonnel.id === personnel?.id)
				throw APIError.invalidArgument(
					'Người nghỉ không thể tự thay thế chính mình'
				)
			if (
				personnel?.unitId != null &&
				replacementPersonnel.unitId !== personnel.unitId
			)
				throw APIError.invalidArgument(
					'Người thay thế phải thuộc cùng đơn vị'
				)
		}

		const inserted = await orm
			.insert(leaveRequests)
			.values({
				leaveType,
				requestScope: body.requestScope || 'INDIVIDUAL',
				classId: body.classId ?? personnel?.classId ?? null,
				className: body.className ?? personnel?.className ?? null,
				status: initialStatus,
				personnelId: personnel?.id ?? null,
				personnelCode: personnel?.code ?? null,
				personnelName:
					personnel?.fullName || userRow?.displayName || null,
				objectType,
				rank: body.rank ?? personnel?.rank ?? null,
				position: personnel?.position ?? null,
				enlistmentDate: personnel?.enlistmentDate ?? null,
				unitId: body.unitId ?? personnel?.unitId ?? null,
				unitName: body.unitName ?? personnel?.unitName ?? null,
				serviceYears,
				baseDays,
				travelDays,
				extraDays,
				extraReasons: reasonsJson,
				totalDays,
				startDate: body.startDate || null,
				endDate: body.endDate || null,
				localityId: body.localityId ?? null,
				localityPath,
				note: body.note || null,
				proposedByUserId: uid,
				proposedByUsername: userRow?.username || null,
				proposedByDisplayName:
					userRow?.displayName || userRow?.username || null,
				proposerEmail,
				commanderUserId: commanderId,
				commanderName: commanderNm,
				replacementPersonnelId: replacementPersonnel?.id ?? null,
				replacementPersonnelName:
					replacementPersonnel?.fullName ?? null,
				replacementPosition: replacementPersonnel?.position ?? null
			})
			.returning()

		const row = inserted[0]!
		// Ghi lưu trữ khi gửi duyệt
		try {
			await upsertLeaveRecord(row)
		} catch (e) {
			log.error('CreateLeaveRequest: upsert leave record failed', {
				error: String((e as Error)?.message || e)
			})
		}

		// Mỗi đề xuất gửi lên → thông báo chuông (+ mail nếu có SMTP) cho đúng cấp
		try {
			const who = row.personnelName || 'Quân nhân'
			const code = row.personnelCode ? ` (${row.personnelCode})` : ''
			const typeLabel =
				row.leaveType === 'SPECIAL' ? 'phép đặc biệt' : 'phép hằng năm'
			const when =
				row.startDate && row.endDate
					? ` (${row.startDate} → ${row.endDate})`
					: ''
			const where = row.localityPath ? ` · ${row.localityPath}` : ''
			const detailMsg = `${who}${code}: đề xuất ${typeLabel} ${row.totalDays} ngày${when}${where}`

			if (initialStatus === 'PENDING_COMMANDER' && commanderId) {
				// Chuông + alert chỉ huy CQ của đơn vị
				await createLeaveAlert({
					userId: commanderId,
					requestId: row.id,
					kind: 'NEED_COMMANDER',
					title: `[Đề xuất phép] Chờ chỉ huy CQ duyệt — ${who}`,
					message: `${detailMsg}. Vào Duyệt đề xuất để xử lý.`
				})
				const cmdEmail = await resolveUserEmail(commanderId)
				if (cmdEmail) {
					const m = buildLeaveSubmittedMail({
						personnelName: who,
						personnelCode: row.personnelCode,
						totalDays: row.totalDays,
						leaveType: row.leaveType,
						startDate: row.startDate,
						endDate: row.endDate,
						localityPath: row.localityPath,
						toRole: 'commander'
					})
					const r = await sendLeaveMail({
						to: cmdEmail,
						subject: m.subject,
						text: m.text,
						requestId: row.id,
						kind: 'SUBMITTED'
					})
					if (!r.ok) {
						log.warn('CreateLeaveRequest: commander email failed', {
							to: cmdEmail,
							mode: r.mode,
							error: r.error
						})
					}
				}
			} else {
				// Thẳng CQQL / admin
				await alertSuperAdmins({
					requestId: row.id,
					kind: 'NEED_AGENCY',
					title: `[Đề xuất phép] Chờ CQQL ký — ${who}`,
					message: `${detailMsg}. Vào Duyệt đề xuất để ký / duyệt.`
				})
				const adminEmails = await resolveAdminEmails()
				const m = buildLeaveSubmittedMail({
					personnelName: who,
					personnelCode: row.personnelCode,
					totalDays: row.totalDays,
					leaveType: row.leaveType,
					startDate: row.startDate,
					endDate: row.endDate,
					localityPath: row.localityPath,
					toRole: 'agency'
				})
				for (const to of adminEmails) {
					const r = await sendLeaveMail({
						to,
						subject: m.subject,
						text: m.text,
						requestId: row.id,
						kind: 'SUBMITTED'
					})
					if (!r.ok) {
						log.warn('CreateLeaveRequest: admin email failed', {
							to,
							mode: r.mode,
							error: r.error
						})
					}
				}
			}

			// Chuông xác nhận cho người gửi đề xuất
			await createLeaveAlert({
				userId: uid,
				requestId: row.id,
				kind: 'SUBMITTED',
				title: `[Đề xuất phép] Đã gửi — chờ duyệt`,
				message: `Bạn đã gửi ${typeLabel} ${row.totalDays} ngày${when}. Trạng thái: ${
					initialStatus === 'PENDING_COMMANDER'
						? 'chờ chỉ huy CQ'
						: 'chờ CQQL'
				}.`
			})

			// Mail xác nhận người đề xuất (nếu có email)
			const proposerMail = proposerEmail || (await resolveUserEmail(uid))
			if (proposerMail) {
				const m = buildLeaveSubmittedMail({
					personnelName: who,
					personnelCode: row.personnelCode,
					totalDays: row.totalDays,
					leaveType: row.leaveType,
					startDate: row.startDate,
					endDate: row.endDate,
					localityPath: row.localityPath,
					toRole: 'proposer'
				})
				await sendLeaveMail({
					to: proposerMail,
					subject: m.subject,
					text: m.text,
					requestId: row.id,
					kind: 'SUBMITTED'
				})
			}
		} catch (e) {
			log.warn('CreateLeaveRequest: leave alert/mail failed', {
				error: String((e as Error)?.message || e)
			})
		}

		const usage = await computeUsageForRows([row])
		return { data: mapRow(row, usage.get(row.id)) }
	}
)

/**
 * Chỉ huy CQ được sửa ngày đi đường / nghỉ thêm (khi đơn còn chờ chỉ huy).
 * Tự tính lại totalDays (+ endDate nếu có startDate).
 */
export const PatchLeaveRequest = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/leave/requests/:id'
	},
	async ({
		id,
		travelDays,
		extraDays,
		extraReasons,
		startDate,
		endDate,
		adminNote
	}: {
		id: number
		travelDays?: number
		extraDays?: number
		extraReasons?: string[]
		startDate?: string | null
		endDate?: string | null
		adminNote?: string | null
	}): Promise<{ data: LeaveRequestResponse }> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const isAdmin = !!auth.isSuperAdmin
		const access = await resolveLeaveAccess(uid, isAdmin)

		const rows = await orm
			.select()
			.from(leaveRequests)
			.where(eq(leaveRequests.id, id))
			.limit(1)
		if (!rows[0]) throw APIError.notFound('Không tìm thấy đơn phép')
		const cur = rows[0]
		const st = cur.status as LeaveRequestStatus
		const isCommanderStep = st === 'PENDING_COMMANDER' || st === 'PENDING'
		if (!isCommanderStep) {
			throw APIError.failedPrecondition(
				'Chỉ sửa được khi đơn đang chờ chỉ huy cơ quan'
			)
		}
		const isCommander =
			cur.commanderUserId != null && cur.commanderUserId === uid
		if (!isCommander && !isAdmin) {
			throw APIError.permissionDenied(
				'Chỉ chỉ huy cơ quan (hoặc admin) được sửa ngày đi đường / nghỉ thêm'
			)
		}
		if (cur.leaveType === 'SPECIAL') {
			throw APIError.invalidArgument(
				'Phép đặc biệt không chỉnh ngày đi đường / nghỉ thêm'
			)
		}

		const travel =
			travelDays !== undefined
				? Math.max(0, Number(travelDays) || 0)
				: cur.travelDays
		let extra =
			extraDays !== undefined
				? Math.max(0, Number(extraDays) || 0)
				: cur.extraDays
		let reasons =
			extraReasons !== undefined
				? extraReasons
				: parseReasons(cur.extraReasons)

		if (extra > 0) {
			const ot = cur.objectType as LeaveObjectType
			if (!canTakeExtraLeave(ot)) {
				throw APIError.invalidArgument(
					'Đối tượng này không được nghỉ thêm'
				)
			}
			const err = validateExtraReasons(extra, reasons)
			if (err) throw APIError.invalidArgument(err)
		} else {
			extra = 0
			reasons = []
		}

		const totalDays = cur.baseDays + travel + extra
		// Auto endDate nếu có start và không gửi endDate
		let nextEnd = endDate !== undefined ? endDate || null : cur.endDate
		const nextStart =
			startDate !== undefined ? startDate || null : cur.startDate
		if (nextStart && totalDays >= 1 && endDate === undefined) {
			const d = new Date(nextStart)
			if (!Number.isNaN(d.getTime())) {
				d.setDate(d.getDate() + totalDays - 1)
				const y = d.getFullYear()
				const m = String(d.getMonth() + 1).padStart(2, '0')
				const day = String(d.getDate()).padStart(2, '0')
				nextEnd = `${y}-${m}-${day}`
			}
		}

		const updated = await orm
			.update(leaveRequests)
			.set({
				travelDays: travel,
				extraDays: extra,
				extraReasons: JSON.stringify(reasons),
				totalDays,
				startDate: nextStart,
				endDate: nextEnd,
				...(adminNote !== undefined
					? { adminNote: adminNote || null }
					: {})
			})
			.where(eq(leaveRequests.id, id))
			.returning()
		const row = updated[0]!
		try {
			await upsertLeaveRecord(row)
		} catch (e) {
			log.error('PatchLeaveRequest: upsert leave record failed', {
				error: String((e as Error)?.message || e)
			})
		}
		const usage = await computeUsageForRows([row])
		return { data: mapRow(row, usage.get(row.id)) }
	}
)

export const DecideLeaveRequest = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/requests/:id/decide'
	},
	async ({
		id,
		decision,
		adminNote,
		travelDays,
		extraDays,
		extraReasons
	}: {
		id: number
		/** APPROVED = duyệt bước hiện tại | RETURNED/REJECTED = trả lại */
		decision: 'APPROVED' | 'REJECTED' | 'RETURNED'
		adminNote?: string | null
		/** Chỉ huy có thể chỉnh khi duyệt */
		travelDays?: number
		extraDays?: number
		extraReasons?: string[]
	}): Promise<{
		data: LeaveRequestResponse
		/** Kết quả gửi mail tự động (khi duyệt cuối / trả lại) */
		mail?: {
			ok: boolean
			to: string
			mode: string
			error?: string
			previewUrl?: string
			isTestInbox: boolean
			message: string
		} | null
	}> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const isAdmin = !!auth.isSuperAdmin
		const access = await resolveLeaveAccess(uid, isAdmin)

		const norm =
			decision === 'REJECTED'
				? 'RETURNED'
				: decision === 'APPROVED'
					? 'APPROVED'
					: decision === 'RETURNED'
						? 'RETURNED'
						: null
		if (!norm) {
			throw APIError.invalidArgument(
				'decision phải là APPROVED | RETURNED | REJECTED'
			)
		}

		const rows = await orm
			.select()
			.from(leaveRequests)
			.where(eq(leaveRequests.id, id))
			.limit(1)
		if (!rows[0]) throw APIError.notFound('Không tìm thấy đơn phép')
		const cur = rows[0]
		const st = cur.status as LeaveRequestStatus

		const isCommanderStep = st === 'PENDING_COMMANDER' || st === 'PENDING'
		const isAgencyStep = st === 'PENDING_AGENCY'

		if (!isCommanderStep && !isAgencyStep) {
			throw APIError.failedPrecondition(
				'Đơn không ở trạng thái chờ duyệt / chờ ký'
			)
		}

		if (isCommanderStep) {
			const isCommander =
				cur.commanderUserId != null && cur.commanderUserId === uid
			if (!isCommander && !isAdmin) {
				throw APIError.permissionDenied(
					'Chỉ chỉ huy cơ quan (hoặc admin) được duyệt bước này'
				)
			}
		}
		if (
			isAgencyStep &&
			!isAdmin &&
			!(
				access.isAgency &&
				cur.unitId != null &&
				access.unitIds.includes(cur.unitId)
			)
		) {
			throw APIError.permissionDenied(
				'Chỉ cơ quan quản lý phụ trách được duyệt / trả lại sau khi ký'
			)
		}

		// Chỉ huy chỉnh ngày đi đường / nghỉ thêm trước khi duyệt
		let travel = cur.travelDays
		let extra = cur.extraDays
		let reasons = parseReasons(cur.extraReasons)
		let totalDays = cur.totalDays
		let endDate = cur.endDate
		if (
			isCommanderStep &&
			cur.leaveType === 'ANNUAL' &&
			(travelDays !== undefined ||
				extraDays !== undefined ||
				extraReasons !== undefined)
		) {
			travel =
				travelDays !== undefined
					? Math.max(0, Number(travelDays) || 0)
					: cur.travelDays
			extra =
				extraDays !== undefined
					? Math.max(0, Number(extraDays) || 0)
					: cur.extraDays
			reasons =
				extraReasons !== undefined
					? extraReasons
					: parseReasons(cur.extraReasons)
			if (extra > 0) {
				const ot = cur.objectType as LeaveObjectType
				if (!canTakeExtraLeave(ot)) {
					throw APIError.invalidArgument(
						'Đối tượng này không được nghỉ thêm'
					)
				}
				const err = validateExtraReasons(extra, reasons)
				if (err) throw APIError.invalidArgument(err)
			} else {
				extra = 0
				reasons = []
			}
			totalDays = cur.baseDays + travel + extra
			if (cur.startDate && totalDays >= 1) {
				const d = new Date(cur.startDate)
				if (!Number.isNaN(d.getTime())) {
					d.setDate(d.getDate() + totalDays - 1)
					const y = d.getFullYear()
					const m = String(d.getMonth() + 1).padStart(2, '0')
					const day = String(d.getDate()).padStart(2, '0')
					endDate = `${y}-${m}-${day}`
				}
			}
		}

		const decider = (
			await orm.select().from(users).where(eq(users.id, uid)).limit(1)
		)[0]

		let nextStatus: LeaveRequestStatus
		if (norm === 'RETURNED') {
			nextStatus = 'RETURNED'
		} else if (isCommanderStep) {
			nextStatus = 'PENDING_AGENCY'
		} else {
			nextStatus = 'APPROVED'
		}

		const updated = await orm
			.update(leaveRequests)
			.set({
				status: nextStatus,
				travelDays: travel,
				extraDays: extra,
				extraReasons: JSON.stringify(reasons),
				totalDays,
				endDate,
				adminNote: adminNote || cur.adminNote || null,
				decidedByUserId: uid,
				decidedByUsername: decider?.username || null,
				decidedAt: nowIso()
			})
			.where(eq(leaveRequests.id, id))
			.returning()

		const row = updated[0]!

		// Cập nhật lưu trữ (đã gửi duyệt / đã duyệt / trả lại)
		try {
			await upsertLeaveRecord(row)
		} catch (e) {
			log.error('DecideLeaveRequest: upsert leave record failed', {
				requestId: id,
				error: String((e as Error)?.message || e)
			})
		}

		// Duyệt cuối tạo luôn đợt nghỉ, không bắt nhập lại thủ công.
		if (nextStatus === 'APPROVED') {
			try {
				const batchConditions =
					row.requestScope === 'CLASS'
						? and(
								eq(
									leaveBatches.personnelName,
									row.className || row.personnelName || 'Lớp'
								),
								eq(leaveBatches.leaveType, row.leaveType),
								eq(leaveBatches.startDate, row.startDate),
								eq(leaveBatches.endDate, row.endDate),
								eq(leaveBatches.totalDays, row.totalDays)
							)
						: eq(leaveBatches.requestId, row.id)
				const existingBatch = await orm
					.select({ id: leaveBatches.id })
					.from(leaveBatches)
					.where(batchConditions)
					.limit(1)
				if (!existingBatch[0]) {
					await orm.insert(leaveBatches).values({
						requestId: row.id,
						personnelId: row.personnelId,
						personnelCode: row.personnelCode,
						personnelName:
							row.requestScope === 'CLASS'
								? row.className || row.personnelName
								: row.personnelName,
						objectType: row.objectType,
						leaveType: row.leaveType,
						batchIndex: 1,
						batchLabel:
							row.requestScope === 'CLASS'
								? `Đợt nghỉ ${row.className || 'lớp'}`
								: 'Đợt nghỉ theo đơn đã duyệt',
						startDate: row.startDate,
						endDate: row.endDate,
						totalDays: row.totalDays,
						note: row.note,
						createdByUserId: uid
					})
				}
			} catch (e) {
				log.error('DecideLeaveRequest: create leave batch failed', {
					requestId: id,
					error: String((e as Error)?.message || e)
				})
			}
		}

		// Thông báo bước tiếp / người đề xuất
		try {
			const who = row.personnelName || 'Quân nhân'
			const code = row.personnelCode ? ` (${row.personnelCode})` : ''
			if (nextStatus === 'PENDING_AGENCY') {
				await alertSuperAdmins({
					requestId: row.id,
					kind: 'NEED_AGENCY',
					title: 'Đơn phép đã qua chỉ huy — chờ CQQL ký',
					message: `${who}${code}: chỉ huy đã duyệt bước 1. Vào Duyệt đề xuất để ký / duyệt cuối.`
				})
				const adminEmails = await resolveAdminEmails()
				const m = buildLeaveSubmittedMail({
					personnelName: who,
					personnelCode: row.personnelCode,
					totalDays: row.totalDays,
					leaveType: row.leaveType,
					startDate: row.startDate,
					endDate: row.endDate,
					localityPath: row.localityPath,
					toRole: 'agency'
				})
				for (const to of adminEmails) {
					await sendLeaveMail({
						to,
						subject: m.subject,
						text: m.text
					})
				}
			}
			if (
				(nextStatus === 'APPROVED' || nextStatus === 'RETURNED') &&
				row.proposedByUserId
			) {
				await createLeaveAlert({
					userId: row.proposedByUserId,
					requestId: row.id,
					kind: nextStatus === 'APPROVED' ? 'DECIDED' : 'RETURNED',
					title:
						nextStatus === 'APPROVED'
							? 'Đơn nghỉ phép đã được duyệt'
							: 'Đơn nghỉ phép bị trả lại',
					message:
						nextStatus === 'APPROVED'
							? `${who}${code}: đơn ${row.totalDays} ngày đã được phê duyệt.`
							: `${who}${code}: đơn bị trả lại. ${adminNote || ''}`.trim()
				})
			}
		} catch (e) {
			log.warn('DecideLeaveRequest: leave alert failed', {
				error: String((e as Error)?.message || e)
			})
		}

		// Tự gửi mail khi duyệt cuối / trả lại — lấy users.email (không cần bấm gửi)
		let mailOut: {
			ok: boolean
			to: string
			mode: string
			error?: string
			previewUrl?: string
			isTestInbox: boolean
			message: string
		} | null = null

		if (nextStatus === 'APPROVED' || nextStatus === 'RETURNED') {
			const email = await resolvePersonnelNotifyEmail(row)
			if (email) {
				const mail = buildLeaveDecisionMail({
					personnelName: row.personnelName || 'đồng chí',
					leaveType: row.leaveType,
					status: nextStatus,
					totalDays: row.totalDays,
					adminNote: adminNote,
					actorName:
						decider?.displayName || decider?.username || null,
					startDate: row.startDate,
					endDate: row.endDate
				})
				const mailResult = await sendLeaveMail({
					to: email,
					subject: mail.subject,
					text: mail.text,
					requestId: id,
					kind: 'DECISION'
				})
				if (!mailResult.ok) {
					log.warn('DecideLeaveRequest: email not delivered', {
						to: email,
						mode: mailResult.mode,
						error: mailResult.error,
						requestId: id
					})
					mailOut = {
						ok: false,
						to: email,
						mode: mailResult.mode,
						error: mailResult.error,
						isTestInbox: false,
						message:
							mailResult.error ||
							`Không gửi được mail tới ${email}`
					}
				} else {
					log.info('DecideLeaveRequest: auto-notified personnel', {
						to: email,
						mode: mailResult.mode,
						status: nextStatus,
						requestId: id,
						previewUrl: mailResult.previewUrl
					})
					mailOut = {
						ok: true,
						to: email,
						mode: mailResult.mode,
						previewUrl: mailResult.previewUrl,
						isTestInbox: mailResult.isTestInbox,
						message: mailResult.isTestInbox
							? `Đã gửi (chế độ TEST Ethereal) tới ${email} — không vào Gmail thật. Mở previewUrl để xem thư.`
							: `Đã gửi mail thật tới ${email}`
					}
				}
			} else {
				log.warn(
					'DecideLeaveRequest: no user email — cập nhật email trên tài khoản QN',
					{ requestId: id, proposedByUserId: row.proposedByUserId }
				)
				mailOut = {
					ok: false,
					to: '',
					mode: 'no-recipient',
					isTestInbox: false,
					message:
						'Tài khoản quân nhân chưa có email (users.email). Vào Danh sách người dùng → sửa email.'
				}
			}
		}

		const usage = await computeUsageForRows([row])
		return { data: mapRow(row, usage.get(row.id)), mail: mailOut }
	}
)

export const CancelLeaveRequest = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/requests/:id/cancel'
	},
	async ({ id }: { id: number }): Promise<{ data: LeaveRequestResponse }> => {
		const auth = getAuthData()!
		const rows = await orm
			.select()
			.from(leaveRequests)
			.where(eq(leaveRequests.id, id))
			.limit(1)
		if (!rows[0]) throw APIError.notFound('Không tìm thấy đơn phép')
		if (
			!auth.isSuperAdmin &&
			rows[0].proposedByUserId !== Number(auth.userID)
		) {
			throw APIError.permissionDenied('Không có quyền hủy đơn này')
		}
		const st = rows[0].status as LeaveRequestStatus
		if (
			st !== 'PENDING' &&
			st !== 'DRAFT' &&
			st !== 'PENDING_COMMANDER' &&
			st !== 'PENDING_AGENCY'
		) {
			throw APIError.failedPrecondition('Chỉ hủy được đơn đang chờ')
		}
		const updated = await orm
			.update(leaveRequests)
			.set({ status: 'CANCELLED' })
			.where(eq(leaveRequests.id, id))
			.returning()
		const row = updated[0]!
		try {
			await upsertLeaveRecord(row)
		} catch (e) {
			log.error('CancelLeaveRequest: upsert leave record failed', {
				error: String((e as Error)?.message || e)
			})
		}
		const usage = await computeUsageForRows([row])
		return { data: mapRow(row, usage.get(row.id)) }
	}
)
