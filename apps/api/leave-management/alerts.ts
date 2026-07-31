/**
 * Thông báo in-app: chỉ huy / CQQL / người đề xuất
 * + chuông (notifications) + leave_alerts
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import log from 'encore.dev/log'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import { leaveAlerts, leaveRequests } from '../schema/leave-management'
import { users } from '../schema/users'
import { notifications } from '../schema/notifications'
import { nowIso } from './helpers'

export type LeaveAlertKind =
	| 'NEED_COMMANDER'
	| 'NEED_AGENCY'
	| 'DECIDED'
	| 'RETURNED'

export interface LeaveAlertResponse {
	id: number
	createdAt: string
	userId: number
	requestId: number
	kind: LeaveAlertKind
	title: string
	message: string
	readAt: string | null
	/** Snapshot ngắn từ đơn */
	personnelName?: string | null
	personnelCode?: string | null
	status?: string | null
	totalDays?: number | null
	startDate?: string | null
	endDate?: string | null
}

function mapAlert(
	a: typeof leaveAlerts.$inferSelect,
	extra?: Partial<LeaveAlertResponse>
): LeaveAlertResponse {
	return {
		id: a.id,
		createdAt: a.createdAt ?? '',
		userId: a.userId,
		requestId: a.requestId,
		kind: a.kind as LeaveAlertKind,
		title: a.title,
		message: a.message,
		readAt: a.readAt,
		...extra
	}
}

/** Tạo alert + chuông notification cho 1 user (không spam trùng unread cùng request+kind) */
export async function createLeaveAlert(opts: {
	userId: number
	requestId: number
	kind: LeaveAlertKind
	title: string
	message: string
}): Promise<void> {
	if (!opts.userId || opts.userId <= 0) return
	const existing = await orm
		.select({ id: leaveAlerts.id })
		.from(leaveAlerts)
		.where(
			and(
				eq(leaveAlerts.userId, opts.userId),
				eq(leaveAlerts.requestId, opts.requestId),
				eq(leaveAlerts.kind, opts.kind),
				isNull(leaveAlerts.readAt)
			)
		)
		.limit(1)
	if (existing[0]) return
	await orm.insert(leaveAlerts).values({
		userId: opts.userId,
		requestId: opts.requestId,
		kind: opts.kind,
		title: opts.title,
		message: opts.message
	})

	// Chuông thông báo (bảng notifications)
	try {
		await orm.insert(notifications).values({
			id: uuidv4(),
			notificationType: 'leave',
			title: opts.title,
			message: opts.message,
			recipientId: opts.userId,
			isBatch: false,
			totalCount: 1,
			batchKey: `leave:${opts.requestId}:${opts.kind}`
		})
	} catch (e) {
		log.warn('createLeaveAlert: bell notification failed', {
			err: String((e as Error)?.message || e),
			userId: opts.userId
		})
	}
}

/** Gửi alert tới mọi super admin (CQQL) */
export async function alertSuperAdmins(opts: {
	requestId: number
	kind: LeaveAlertKind
	title: string
	message: string
}): Promise<void> {
	const admins = await orm
		.select({ id: users.id })
		.from(users)
		.where(eq(users.isSuperUser, true))
	for (const a of admins) {
		await createLeaveAlert({
			userId: a.id,
			requestId: opts.requestId,
			kind: opts.kind,
			title: opts.title,
			message: opts.message
		})
	}
}

export const ListLeaveAlerts = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/alerts'
	},
	async (q: {
		unreadOnly?: Query<boolean>
		limit?: Query<number>
	}): Promise<{ data: LeaveAlertResponse[] }> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const unreadOnly = String(q.unreadOnly ?? 'false') === 'true'
		const limit = Math.min(100, Math.max(1, Number(q.limit) || 30))

		const conditions = [eq(leaveAlerts.userId, uid)]
		if (unreadOnly) conditions.push(isNull(leaveAlerts.readAt))

		const rows = await orm
			.select()
			.from(leaveAlerts)
			.where(and(...conditions))
			.orderBy(desc(leaveAlerts.id))
			.limit(limit)

		const reqIds = [...new Set(rows.map((r) => r.requestId))]
		const reqMap = new Map<number, typeof leaveRequests.$inferSelect>()
		if (reqIds.length) {
			for (const id of reqIds) {
				const r = await orm
					.select()
					.from(leaveRequests)
					.where(eq(leaveRequests.id, id))
					.limit(1)
				if (r[0]) reqMap.set(id, r[0])
			}
		}

		return {
			data: rows.map((a) => {
				const req = reqMap.get(a.requestId)
				return mapAlert(a, {
					personnelName: req?.personnelName,
					personnelCode: req?.personnelCode,
					status: req?.status,
					totalDays: req?.totalDays,
					startDate: req?.startDate,
					endDate: req?.endDate
				})
			})
		}
	}
)

export const GetLeaveAlertCount = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/alerts/unread-count'
	},
	async (): Promise<{ data: { count: number; pendingApprove: number } }> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const isAdmin = !!auth.isSuperAdmin

		const unread = await orm
			.select({ c: sql<number>`count(*)` })
			.from(leaveAlerts)
			.where(and(eq(leaveAlerts.userId, uid), isNull(leaveAlerts.readAt)))

		// Đơn chờ tôi duyệt (chỉ huy hoặc CQQL)
		let pendingApprove = 0
		if (isAdmin) {
			const agency = await orm
				.select({ c: sql<number>`count(*)` })
				.from(leaveRequests)
				.where(eq(leaveRequests.status, 'PENDING_AGENCY'))
			pendingApprove += Number(agency[0]?.c || 0)
		}
		const cmd = await orm
			.select({ c: sql<number>`count(*)` })
			.from(leaveRequests)
			.where(
				and(
					eq(leaveRequests.commanderUserId, uid),
					eq(leaveRequests.status, 'PENDING_COMMANDER')
				)
			)
		// admin also sees PENDING as commander step
		const cmdPending = await orm
			.select({ c: sql<number>`count(*)` })
			.from(leaveRequests)
			.where(
				and(
					eq(leaveRequests.commanderUserId, uid),
					eq(leaveRequests.status, 'PENDING')
				)
			)
		pendingApprove += Number(cmd[0]?.c || 0) + Number(cmdPending[0]?.c || 0)
		// Super admin count PENDING_COMMANDER only in agency count already separate;
		// for badge we want "what I need to act on"
		if (isAdmin) {
			// already added PENDING_AGENCY; commander ones only if assigned
		}

		return {
			data: {
				count: Number(unread[0]?.c || 0),
				pendingApprove
			}
		}
	}
)

export const MarkLeaveAlertsRead = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/alerts/mark-read'
	},
	async (body: {
		ids?: number[]
		requestId?: number
		all?: boolean
	}): Promise<{ ok: boolean }> => {
		const auth = getAuthData()!
		const uid = Number(auth.userID)
		const ts = nowIso()

		if (body.all) {
			await orm
				.update(leaveAlerts)
				.set({ readAt: ts })
				.where(
					and(eq(leaveAlerts.userId, uid), isNull(leaveAlerts.readAt))
				)
			return { ok: true }
		}
		if (body.requestId != null) {
			await orm
				.update(leaveAlerts)
				.set({ readAt: ts })
				.where(
					and(
						eq(leaveAlerts.userId, uid),
						eq(leaveAlerts.requestId, body.requestId),
						isNull(leaveAlerts.readAt)
					)
				)
			return { ok: true }
		}
		const ids = body.ids || []
		if (!ids.length) {
			throw APIError.invalidArgument('Cần ids, requestId hoặc all')
		}
		for (const id of ids) {
			await orm
				.update(leaveAlerts)
				.set({ readAt: ts })
				.where(and(eq(leaveAlerts.id, id), eq(leaveAlerts.userId, uid)))
		}
		return { ok: true }
	}
)
