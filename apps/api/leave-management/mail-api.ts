/**
 * API kiểm tra / gửi thử email quản lý phép
 */
import { api, APIError, Query } from 'encore.dev/api'
import { desc } from 'drizzle-orm'
import { getAuthData } from '~encore/auth'
import orm from '../database'
import { leaveMailLog } from '../schema/leave-management'
import { getMailStatus, sendLeaveMail, type MailStatus } from './mail'

export const GetLeaveMailStatus = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/mail/status'
	},
	async (): Promise<{ data: MailStatus }> => {
		return { data: getMailStatus() }
	}
)

export const TestLeaveMail = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/leave/mail/test'
	},
	async (body: {
		to?: string
	}): Promise<{
		data: {
			ok: boolean
			mode: string
			error?: string
			previewUrl?: string
			to: string
		}
	}> => {
		const auth = getAuthData()!
		if (!auth.isSuperAdmin) {
			throw APIError.permissionDenied('Chỉ admin được gửi mail thử')
		}
		const to = (body.to || '').trim()
		if (!to) {
			throw APIError.invalidArgument(
				'Cần trường to (email nhận thử), VD: ban@example.com'
			)
		}
		const result = await sendLeaveMail({
			to,
			subject: '[Quản lý phép] Thư thử — cấu hình SMTP',
			text: [
				'Đây là email thử từ hệ thống Quản lý phép.',
				'',
				`Thời điểm: ${new Date().toISOString()}`,
				`Người gửi thử: user #${auth.userID}`,
				'',
				'Nếu bạn nhận được thư này trên Gmail/Outlook thật,',
				'thì SMTP đã cấu hình đúng (LEAVE_MAIL_DEV=false + App Password).',
				'',
				'Nếu mode=ethereal-dev: thư CHỈ xem qua previewUrl, không vào hộp Gmail.',
				'— Hệ thống QLHV / Phép'
			].join('\n'),
			kind: 'TEST'
		})
		return {
			data: {
				ok: result.ok,
				mode: result.mode,
				error: result.error,
				previewUrl: result.previewUrl,
				to,
				isTestInbox: result.isTestInbox
			}
		}
	}
)

export const ListLeaveMailLog = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/leave/mail/log'
	},
	async (q: {
		limit?: Query<number>
	}): Promise<{
		data: {
			id: number
			createdAt: string
			requestId: number | null
			toEmail: string
			subject: string
			body: string | null
			mode: string | null
			ok: boolean
			error: string | null
			previewUrl: string | null
			kind: string | null
		}[]
	}> => {
		const auth = getAuthData()!
		if (!auth.isSuperAdmin) {
			throw APIError.permissionDenied('Chỉ admin xem nhật ký mail')
		}
		const limit = Math.min(100, Math.max(1, Number(q.limit) || 30))
		const rows = await orm
			.select()
			.from(leaveMailLog)
			.orderBy(desc(leaveMailLog.id))
			.limit(limit)
		return {
			data: rows.map((r) => ({
				id: r.id,
				createdAt: r.createdAt ?? '',
				requestId: r.requestId,
				toEmail: r.toEmail,
				subject: r.subject,
				body: r.body,
				mode: r.mode,
				ok: !!r.ok,
				error: r.error,
				previewUrl: r.previewUrl,
				kind: r.kind
			}))
		}
	}
)
