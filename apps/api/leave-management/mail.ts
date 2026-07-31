/**
 * Gửi email thông báo đơn phép.
 *
 * Cấu hình apps/api/.env:
 *
 * ## Cách 1 — Gmail (production / thật)
 *   SMTP_HOST=smtp.gmail.com
 *   SMTP_PORT=587
 *   SMTP_USER=your@gmail.com
 *   SMTP_PASS=xxxx xxxx xxxx xxxx   # App Password (bật 2FA)
 *   SMTP_FROM="QL Phép <your@gmail.com>"
 *
 * ## Cách 2 — SMTP không auth (Mailpit / MailHog local)
 *   SMTP_HOST=127.0.0.1
 *   SMTP_PORT=1025
 *   SMTP_USER=
 *   SMTP_PASS=
 *   SMTP_NO_AUTH=true
 *   SMTP_FROM="QL Phép <leave@localhost>"
 *
 * ## Cách 3 — Dev auto (Ethereal) — không cần SMTP thật
 *   LEAVE_MAIL_DEV=true
 *   → nodemailer tạo hộp mail test; log có link xem thư
 *
 *   LEAVE_MAIL_WEBHOOK=https://...  (optional fallback)
 */
import log from 'encore.dev/log'
import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import fs from 'fs'
import path from 'path'
import { appConfig } from '../configs'
import orm from '../database'
import { leaveMailLog } from '../schema/leave-management'

export interface LeaveMailPayload {
	to: string
	subject: string
	text: string
	html?: string
	/** leave_requests.id nếu có */
	requestId?: number | null
	/** DECISION | SUBMITTED | TEST */
	kind?: string
}

export interface SendMailResult {
	ok: boolean
	mode: string
	error?: string
	previewUrl?: string
	to: string
	/** true = mail chỉ nằm trên Ethereal, KHÔNG vào hộp Gmail thật */
	isTestInbox: boolean
}

export interface MailStatus {
	configured: boolean
	mode: 'smtp' | 'smtp-no-auth' | 'ethereal-dev' | 'webhook' | 'none'
	host: string | null
	port: number | null
	user: string | null
	from: string | null
	devMode: boolean
	lastPreviewUrl: string | null
	hint: string
}

let transporter: Transporter | null = null
let transportMode: MailStatus['mode'] = 'none'
let etherealUser: string | null = null
let lastPreviewUrl: string | null = null

const PREVIEW_FILE = path.resolve(process.cwd(), '.leave-mail-last-preview.txt')

function env(key: string, fallback = ''): string {
	// Ưu tiên process.env (dotenv / encore), fallback appConfig
	const fromProcess = process.env[key]
	if (fromProcess != null && String(fromProcess).trim() !== '') {
		return String(fromProcess).trim()
	}
	const cfg = appConfig as Record<string, string | undefined>
	const v = cfg[key]
	return v != null && String(v).trim() !== '' ? String(v).trim() : fallback
}

function isDevMail(): boolean {
	const v = env('LEAVE_MAIL_DEV', 'false').toLowerCase()
	return v === 'true' || v === '1' || v === 'yes'
}

function smtpHost(): string {
	return env('SMTP_HOST')
}

function smtpPort(): number {
	return Number(env('SMTP_PORT', '587') || 587)
}

function smtpUser(): string {
	return env('SMTP_USER')
}

function smtpPass(): string {
	return env('SMTP_PASS')
}

function smtpFrom(): string {
	return (
		env('SMTP_FROM') ||
		(smtpUser() ? smtpUser() : 'QL Phép <noreply@localhost>')
	)
}

function smtpNoAuth(): boolean {
	const v = env('SMTP_NO_AUTH', '').toLowerCase()
	if (v === 'true' || v === '1') return true
	// Mailpit / MailHog default ports without credentials
	const port = smtpPort()
	const host = smtpHost()
	if (
		!smtpUser() &&
		!smtpPass() &&
		host &&
		(port === 1025 ||
			port === 1026 ||
			host === '127.0.0.1' ||
			host === 'localhost')
	) {
		return true
	}
	return false
}

function hasSmtpAuth(): boolean {
	return !!(smtpHost() && smtpUser() && smtpPass())
}

function hasSmtpNoAuth(): boolean {
	return !!(smtpHost() && smtpNoAuth())
}

function loadLastPreview(): string | null {
	try {
		if (fs.existsSync(PREVIEW_FILE)) {
			return fs.readFileSync(PREVIEW_FILE, 'utf8').trim() || null
		}
	} catch {
		/* ignore */
	}
	return lastPreviewUrl
}

function saveLastPreview(url: string) {
	lastPreviewUrl = url
	try {
		fs.writeFileSync(PREVIEW_FILE, url + '\n', 'utf8')
	} catch {
		/* ignore */
	}
}

export function getMailStatus(): MailStatus {
	const host = smtpHost() || null
	const port = host ? smtpPort() : null
	const user = smtpUser() || etherealUser || null
	const dev = isDevMail()

	let mode: MailStatus['mode'] = 'none'
	let hint =
		'Chưa cấu hình. Xem apps/api/.env (SMTP_* hoặc LEAVE_MAIL_DEV=true).'

	if (hasSmtpAuth()) {
		mode = 'smtp'
		hint = `SMTP ${host}:${port} (có auth) — gửi mail thật.`
	} else if (hasSmtpNoAuth()) {
		mode = 'smtp-no-auth'
		hint = `SMTP ${host}:${port} (không auth — Mailpit/MailHog). UI Mailpit thường :8025`
	} else if (dev || transportMode === 'ethereal-dev') {
		mode = 'ethereal-dev'
		hint =
			'Chế độ dev Ethereal — mail test; mở lastPreviewUrl để xem thư đã gửi.'
	} else if (env('LEAVE_MAIL_WEBHOOK')) {
		mode = 'webhook'
		hint = 'Dùng LEAVE_MAIL_WEBHOOK fallback.'
	}

	return {
		configured: mode !== 'none',
		mode,
		host,
		port,
		user,
		from: smtpFrom(),
		devMode: dev,
		lastPreviewUrl: loadLastPreview(),
		hint
	}
}

async function ensureTransporter(): Promise<Transporter | null> {
	if (transporter) return transporter

	// 1) Real SMTP with auth
	if (hasSmtpAuth()) {
		const port = smtpPort()
		transporter = nodemailer.createTransport({
			host: smtpHost(),
			port,
			secure: port === 465,
			auth: {
				user: smtpUser(),
				pass: smtpPass()
			}
		})
		transportMode = 'smtp'
		log.info('Leave mail: SMTP transporter ready', {
			host: smtpHost(),
			port
		})
		return transporter
	}

	// 2) SMTP no auth (Mailpit)
	if (hasSmtpNoAuth()) {
		const port = smtpPort()
		transporter = nodemailer.createTransport({
			host: smtpHost(),
			port,
			secure: false,
			tls: { rejectUnauthorized: false }
		})
		transportMode = 'smtp-no-auth'
		log.info('Leave mail: SMTP no-auth transporter ready', {
			host: smtpHost(),
			port
		})
		return transporter
	}

	// 3) Ethereal dev auto
	if (isDevMail()) {
		try {
			const account = await nodemailer.createTestAccount()
			etherealUser = account.user
			transporter = nodemailer.createTransport({
				host: account.smtp.host,
				port: account.smtp.port,
				secure: account.smtp.secure,
				auth: {
					user: account.user,
					pass: account.pass
				}
			})
			transportMode = 'ethereal-dev'
			log.info('Leave mail: Ethereal test account ready', {
				user: account.user,
				web: 'https://ethereal.email'
			})
			return transporter
		} catch (e) {
			log.error('Leave mail: cannot create Ethereal account', {
				err: String((e as Error)?.message || e)
			})
			return null
		}
	}

	return null
}

function toHtml(text: string): string {
	const esc = text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
	const body = esc.replace(/\n/g, '<br/>')
	return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="font-family:system-ui,sans-serif;line-height:1.5;color:#111;padding:16px">
${body}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0"/>
<p style="font-size:12px;color:#666">Email tự động từ hệ thống Quản lý phép — vui lòng không trả lời.</p>
</body></html>`
}

async function logMail(entry: {
	to: string
	subject: string
	body: string
	mode: string
	ok: boolean
	error?: string
	previewUrl?: string
	requestId?: number | null
	kind?: string
}) {
	try {
		await orm.insert(leaveMailLog).values({
			toEmail: entry.to,
			subject: entry.subject,
			body: entry.body,
			mode: entry.mode,
			ok: entry.ok,
			error: entry.error || null,
			previewUrl: entry.previewUrl || null,
			requestId: entry.requestId ?? null,
			kind: entry.kind || null
		})
	} catch (e) {
		log.warn('leave_mail_log insert failed', {
			err: String((e as Error)?.message || e)
		})
	}
}

export async function sendLeaveMail(
	payload: LeaveMailPayload
): Promise<SendMailResult> {
	const to = (payload.to || '').trim()
	const kind = payload.kind || 'GENERIC'
	if (!to) {
		log.warn('sendLeaveMail: missing recipient', {
			subject: payload.subject
		})
		const r: SendMailResult = {
			ok: false,
			mode: 'no-recipient',
			error: 'Thiếu email người nhận (users.email trống)',
			to: '',
			isTestInbox: false
		}
		await logMail({
			to: '(empty)',
			subject: payload.subject,
			body: payload.text,
			mode: r.mode,
			ok: false,
			error: r.error,
			requestId: payload.requestId,
			kind
		})
		return r
	}

	log.info('LEAVE_EMAIL attempt', {
		to,
		subject: payload.subject,
		status: getMailStatus().mode,
		kind
	})

	// 1) SMTP / Ethereal
	const tx = await ensureTransporter()
	if (tx) {
		try {
			const info = await tx.sendMail({
				from: smtpFrom(),
				to,
				subject: payload.subject,
				text: payload.text,
				html: payload.html || toHtml(payload.text)
			})
			const preview =
				nodemailer.getTestMessageUrl(info) ||
				(typeof info === 'object' && info && 'preview' in info
					? String((info as { preview?: string }).preview)
					: null)
			if (preview) {
				saveLastPreview(String(preview))
				log.info('LEAVE_EMAIL preview (Ethereal)', {
					to,
					previewUrl: preview
				})
			}
			log.info('LEAVE_EMAIL sent', {
				to,
				mode: transportMode,
				messageId: info.messageId
			})
			const isTest = transportMode === 'ethereal-dev'
			const result: SendMailResult = {
				ok: true,
				mode: transportMode,
				previewUrl: preview ? String(preview) : undefined,
				to,
				isTestInbox: isTest
			}
			await logMail({
				to,
				subject: payload.subject,
				body: payload.text,
				mode: result.mode,
				ok: true,
				previewUrl: result.previewUrl,
				requestId: payload.requestId,
				kind
			})
			return result
		} catch (e: unknown) {
			const msg = String((e as Error)?.message || e)
			log.error('LEAVE_EMAIL transport error', { err: msg, to })
			// fall through to webhook
			transporter = null
			transportMode = 'none'
			await logMail({
				to,
				subject: payload.subject,
				body: payload.text,
				mode: 'smtp-error',
				ok: false,
				error: msg,
				requestId: payload.requestId,
				kind
			})
		}
	}

	// 2) Webhook fallback
	const webhook = env('LEAVE_MAIL_WEBHOOK')
	if (webhook) {
		try {
			const resp = await fetch(webhook, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			})
			if (!resp.ok) {
				const r: SendMailResult = {
					ok: false,
					mode: 'webhook-error',
					error: `HTTP ${resp.status}`,
					to,
					isTestInbox: false
				}
				await logMail({
					to,
					subject: payload.subject,
					body: payload.text,
					mode: r.mode,
					ok: false,
					error: r.error,
					requestId: payload.requestId,
					kind
				})
				return r
			}
			const r: SendMailResult = {
				ok: true,
				mode: 'webhook',
				to,
				isTestInbox: false
			}
			await logMail({
				to,
				subject: payload.subject,
				body: payload.text,
				mode: 'webhook',
				ok: true,
				requestId: payload.requestId,
				kind
			})
			return r
		} catch (e: unknown) {
			return {
				ok: false,
				mode: 'webhook-error',
				error: String((e as Error)?.message || e),
				to,
				isTestInbox: false
			}
		}
	}

	log.warn(
		'LEAVE_EMAIL not sent: set SMTP_USER/SMTP_PASS (Gmail App Password) or LEAVE_MAIL_DEV=true'
	)
	const r: SendMailResult = {
		ok: false,
		mode: 'not-configured',
		error: 'Chưa cấu hình SMTP thật. Điền SMTP_USER + SMTP_PASS (App Password Gmail) trong apps/api/.env, đặt LEAVE_MAIL_DEV=false, rồi restart encore. Hiện LEAVE_MAIL_DEV chỉ gửi vào hộp test Ethereal (không vào Gmail).',
		to,
		isTestInbox: false
	}
	await logMail({
		to,
		subject: payload.subject,
		body: payload.text,
		mode: r.mode,
		ok: false,
		error: r.error,
		requestId: payload.requestId,
		kind
	})
	return r
}

export function buildLeaveDecisionMail(opts: {
	personnelName: string
	leaveType: string
	status: 'APPROVED' | 'RETURNED'
	totalDays: number
	adminNote?: string | null
	actorName?: string | null
	startDate?: string | null
	endDate?: string | null
}): { subject: string; text: string } {
	const typeLabel =
		opts.leaveType === 'SPECIAL' ? 'phép đặc biệt' : 'phép hằng năm'
	const result =
		opts.status === 'APPROVED' ? 'đã được DUYỆT' : 'đã bị TRẢ LẠI'
	const subject = `[Quản lý phép] Đơn ${typeLabel} của ${opts.personnelName} ${result}`
	const lines = [
		`Xin chào ${opts.personnelName},`,
		``,
		`Đơn đề xuất ${typeLabel} (${opts.totalDays} ngày) của bạn ${result}.`,
		opts.startDate || opts.endDate
			? `Thời gian: ${opts.startDate || '—'} → ${opts.endDate || '—'}`
			: '',
		opts.actorName ? `Người xử lý: ${opts.actorName}` : '',
		opts.adminNote ? `Ghi chú: ${opts.adminNote}` : '',
		``,
		`Vui lòng đăng nhập hệ thống → Quản lý phép để xem chi tiết.`,
		`— Hệ thống quản lý học viên / phép`
	].filter(Boolean)
	return { subject, text: lines.join('\n') }
}

export function buildLeaveSubmittedMail(opts: {
	personnelName: string
	personnelCode?: string | null
	totalDays: number
	leaveType: string
	startDate?: string | null
	endDate?: string | null
	localityPath?: string | null
	toRole: 'commander' | 'agency' | 'proposer'
}): { subject: string; text: string } {
	const typeLabel =
		opts.leaveType === 'SPECIAL' ? 'phép đặc biệt' : 'phép hằng năm'
	const code = opts.personnelCode ? ` (${opts.personnelCode})` : ''
	if (opts.toRole === 'proposer') {
		return {
			subject: `[Quản lý phép] Đã gửi đề xuất ${typeLabel}`,
			text: [
				`Xin chào ${opts.personnelName},`,
				``,
				`Đơn đề xuất ${typeLabel} (${opts.totalDays} ngày) đã được gửi và đang chờ duyệt.`,
				opts.startDate
					? `Thời gian: ${opts.startDate} → ${opts.endDate || '—'}`
					: '',
				opts.localityPath ? `Nơi nghỉ: ${opts.localityPath}` : '',
				``,
				`Bạn sẽ nhận email khi đơn được duyệt hoặc trả lại.`,
				`— Hệ thống quản lý phép`
			]
				.filter(Boolean)
				.join('\n')
		}
	}
	const roleHint =
		opts.toRole === 'commander'
			? 'Vui lòng đăng nhập → Quản lý phép → Duyệt đề xuất để xử lý (bước chỉ huy CQ).'
			: 'Vui lòng đăng nhập → Quản lý phép → Duyệt đề xuất để ký / duyệt cuối (CQQL).'
	return {
		subject: `[Quản lý phép] Có đơn ${typeLabel} chờ duyệt — ${opts.personnelName}${code}`,
		text: [
			`Kính gửi đồng chí,`,
			``,
			`Có đơn đề xuất ${typeLabel} cần xử lý:`,
			`• Họ tên: ${opts.personnelName}${code}`,
			`• Số ngày: ${opts.totalDays}`,
			opts.startDate
				? `• Thời gian: ${opts.startDate} → ${opts.endDate || '—'}`
				: '',
			opts.localityPath ? `• Nơi nghỉ: ${opts.localityPath}` : '',
			``,
			roleHint,
			`— Hệ thống quản lý phép`
		]
			.filter(Boolean)
			.join('\n')
	}
}

/** Resolve email: personnel.email hoặc username dạng email */
export function looksLikeEmail(s: string | null | undefined): boolean {
	if (!s) return false
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}
