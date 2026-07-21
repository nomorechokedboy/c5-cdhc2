import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/vi'
import weekOfYear from 'dayjs/plugin/weekOfYear'
import quarterOfYear from 'dayjs/plugin/quarterOfYear'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { type students } from '@/api/client'
import type { UnitPoliticsQualitySummary, Unit } from '@/types'
import { ApiUrl } from '@/lib/const'

dayjs.locale('vi')
dayjs.extend(relativeTime)
dayjs.extend(weekOfYear)
dayjs.extend(quarterOfYear)
dayjs.extend(utc)
dayjs.extend(timezone)

dayjs.tz.setDefault('Asia/Ho_Chi_Minh')

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}

export function formatTimestamp(timestamp: string) {
	return dayjs(timestamp).fromNow()
}

export function getCurrentWeekNumber() {
	return dayjs().week()
}

export function getCurrentQuarter() {
	return dayjs().quarter()
}

export function toVNTz(utcTimestamp: string) {
	return dayjs.utc(utcTimestamp).format('DD-MM-YYYY')
}

/** Giờ VN hiện tại cho input datetime-local (tới phút). */
export function nowVNDateTimeLocal() {
	return dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DDTHH:mm')
}

/** Giờ VN hiện tại lưu DB: YYYY-MM-DD HH:mm:ss */
export function nowVNStoredDateTime() {
	return dayjs().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
}

/**
 * Chuẩn hoá ngày/giờ form → lưu DB (YYYY-MM-DD HH:mm:ss, múi VN).
 * - Rỗng: giờ hiện tại chính xác
 * - Chỉ ngày (hôm nay): ghép giờ phút giây hiện tại
 * - Chỉ ngày (khác hôm nay): 00:00:00
 * - datetime-local (HH:mm): nếu cùng phút với hiện tại → giây thực, không thì :00
 * - Đã có giây: giữ nguyên
 */
export function toStoredDateTime(v?: string | null): string {
	const s = (v || '').trim()
	if (!s) return nowVNStoredDateTime()

	const now = dayjs().tz('Asia/Ho_Chi_Minh')

	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
		if (s === now.format('YYYY-MM-DD')) return nowVNStoredDateTime()
		return `${s} 00:00:00`
	}

	const normalized = s.replace('T', ' ')
	const m = normalized.match(
		/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/
	)
	if (!m) return s

	const date = m[1]!
	const hh = m[2]!.padStart(2, '0')
	const mi = m[3]!
	let ss = m[4]
	if (!ss) {
		if (
			date === now.format('YYYY-MM-DD') &&
			hh === now.format('HH') &&
			mi === now.format('mm')
		) {
			ss = now.format('ss')
		} else {
			ss = '00'
		}
	}
	return `${date} ${hh}:${mi}:${ss}`
}

/**
 * Hiển thị ngày giờ nhật ký cập nhật (dd/mm/yyyy HH:mm:ss).
 * - executedAt có giờ → hiện literal (đã lưu theo giờ VN)
 * - executedAt chỉ ngày + createdAt (SQLite UTC) → ghép ngày TH + giờ tạo (đổi sang VN)
 */
export function formatMovementDateTime(
	executedAt?: string | null,
	createdAt?: string | null
): string {
	const ex = (executedAt || '').trim()
	const cr = (createdAt || '').trim()
	const hasTime = (s: string) =>
		/\d{1,2}:\d{2}/.test(s) && !/^\d{4}-\d{2}-\d{2}$/.test(s)

	const parseParts = (s: string) => {
		const m = s.match(
			/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
		)
		if (!m) return null
		return {
			y: m[1]!,
			mo: m[2]!,
			d: m[3]!,
			h: m[4] || '00',
			mi: m[5] || '00',
			s: m[6] || '00'
		}
	}

	const fmt = (p: {
		y: string
		mo: string
		d: string
		h: string
		mi: string
		s: string
	}) => `${p.d}/${p.mo}/${p.y} ${p.h}:${p.mi}:${p.s}`

	if (ex && hasTime(ex)) {
		const p = parseParts(ex)
		if (p) return fmt(p)
	}

	// createdAt từ SQLite CURRENT_TIMESTAMP = UTC → đổi sang VN
	let pc: ReturnType<typeof parseParts> = null
	if (cr) {
		const asUtc = dayjs.utc(cr.replace(' ', 'T'))
		if (asUtc.isValid()) {
			const vn = asUtc.tz('Asia/Ho_Chi_Minh')
			pc = {
				y: vn.format('YYYY'),
				mo: vn.format('MM'),
				d: vn.format('DD'),
				h: vn.format('HH'),
				mi: vn.format('mm'),
				s: vn.format('ss')
			}
		} else {
			pc = parseParts(cr)
		}
	}

	const pe = parseParts(ex)
	if (pe && pc) {
		return fmt({ ...pe, h: pc.h, mi: pc.mi, s: pc.s })
	}
	if (pc) return fmt(pc)
	if (pe) return `${pe.d}/${pe.mo}/${pe.y}`
	if (ex) return ex
	if (cr) return cr
	return '—'
}

/**
 * Chỉ ngày nhật ký cập nhật (dd/mm/yyyy) — dùng xuất Word báo cáo.
 */
export function formatMovementDate(
	executedAt?: string | null,
	createdAt?: string | null
): string {
	const full = formatMovementDateTime(executedAt, createdAt)
	if (!full || full === '—') return '—'
	// dd/mm/yyyy … → lấy phần ngày
	const m = full.match(/^(\d{1,2}\/\d{1,2}\/\d{4})/)
	if (m) return m[1]!
	const iso = (executedAt || createdAt || '').trim()
	const d = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
	if (d) return `${d[3]}/${d[2]}/${d[1]}`
	return full.split(/\s+/)[0] || full
}

/**
 * Hiển thị timestamp server (SQLite CURRENT_TIMESTAMP = UTC, hoặc ISO)
 * theo giờ Việt Nam: dd/mm/yyyy HH:mm:ss
 */
export function formatVNDateTime(iso?: string | null): string {
	const raw = (iso || '').trim()
	if (!raw) return '—'
	const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
	const d = dayjs.utc(normalized)
	if (!d.isValid()) {
		const d2 = dayjs(raw)
		if (!d2.isValid()) return raw
		return d2.tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')
	}
	return d.tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')
}

export function transformPoliticsQualityData(
	params: students.GetPoliticsQualityReportResponse | undefined
) {
	if (params === undefined) {
		return []
	}

	const { data, units } = params

	function mergeReports(
		target: Record<string, any>,
		source: Record<string, any>
	) {
		for (const [key, value] of Object.entries(source)) {
			if (typeof value === 'number') {
				target[key] = (target[key] ?? 0) + value
			} else if (typeof value === 'object' && value !== null) {
				target[key] = mergeReports(target[key] ?? {}, value)
			}
		}
		return target
	}

	function traverse(unitNode: Unit): UnitPoliticsQualitySummary {
		let unitReport: Record<string, any> = {}
		const classesReport: UnitPoliticsQualitySummary[] = []
		const childrenReport: UnitPoliticsQualitySummary[] = []

		// collect class reports
		if (unitNode.classes && unitNode.classes.length > 0) {
			for (const cls of unitNode.classes) {
				const clsReport = data[cls.id] ?? null
				classesReport.push({
					name: cls.name,
					politicsQualityReport: clsReport
				})
				if (clsReport) {
					unitReport = mergeReports(unitReport, clsReport)
				}
			}
		}

		// collect children reports recursively
		if (unitNode.children && unitNode.children.length > 0) {
			for (const child of unitNode.children) {
				const childSummary = traverse(child)
				childrenReport.push(childSummary)
				if (childSummary.politicsQualityReport) {
					unitReport = mergeReports(
						unitReport,
						childSummary.politicsQualityReport
					)
				}
			}
		}

		const unitSummary: UnitPoliticsQualitySummary = {
			name: unitNode.name,
			politicsQualityReport:
				Object.keys(unitReport).length > 0 ? unitReport : null
		}

		if (classesReport.length > 0) {
			unitSummary.classes = classesReport
		}
		if (childrenReport.length > 0) {
			unitSummary.children = childrenReport
		}

		return unitSummary
	}

	return units.map((unit) => traverse(unit as unknown as Unit))
}

export function convertToIso(dateStr: string): string {
	const [day, month, year] = dateStr.split('/')
	return `${year}-${month}-${day}`
}

export function getMediaUri(uri: string) {
	const mediaUrl = 'media'

	return `${ApiUrl}/${mediaUrl}/${uri}`
}

function readJwtPayload(): Record<string, unknown> | null {
	try {
		const token = localStorage.getItem('qlhvAccessToken')
		if (!token) return null
		const parts = token.split('.')
		if (parts.length !== 3) return null
		// JWT dùng base64url (- _) — chuyển sang base64 chuẩn trước atob
		const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/')
		const pad = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
		return JSON.parse(atob(pad)) as Record<string, unknown>
	} catch {
		return null
	}
}

export const isSuperAdmin = (): boolean => {
	const payload = readJwtPayload()
	return payload?.isSuperUser === true
}

/**
 * Chỉ super admin (admin.cdhc2) được xem tên đăng nhập (username).
 * Mọi tài khoản khác chỉ thấy họ tên hiển thị.
 */
export function canSeeUsernames(): boolean {
	return isSuperAdmin()
}

/** Nhãn người dùng: luôn ưu tiên displayName; username chỉ khi admin */
export function userDisplayLabel(
	displayName?: string | null,
	username?: string | null
): string {
	const name = (displayName || '').trim()
	if (name) return name
	if (canSeeUsernames() && username) return username
	return name || '—'
}

/**
 * Ban Giám Hiệu: role `admin` — phê duyệt đề xuất trước khi đẩy xuống ngành.
 * Super admin cũng được coi là có quyền BGH trên UI (duyệt).
 */
export function isBghAdminUser(): boolean {
	if (isSuperAdmin()) return true
	const roles = getTokenRoles().map((r) => r.toLowerCase())
	return roles.some(
		(r) =>
			r === 'admin' ||
			r === 'admin_bgh' ||
			r.includes('giam_hieu') ||
			r.includes('giám hiệu') ||
			r.includes('giam hieu') ||
			r.includes('bgh')
	)
}

/**
 * BGH thuần (không phải super): chỉ xem + phê duyệt đề xuất,
 * không menu thêm/sửa danh mục / học viên / user.
 */
export function isBghOnlyUser(): boolean {
	return isBghAdminUser() && !isSuperAdmin()
}

/** Path BGH được phép */
export function isBghUserAllowedPath(pathname: string): boolean {
	const path = (pathname.split('?')[0] || pathname).replace(/\/$/, '') || '/'
	if (path === '/' || path === '') return true
	// Phân hệ đề thi: BGH duyệt + ngân hàng
	if (path === '/de-thi' || path.startsWith('/de-thi/')) return true
	const allowed = [
		'/vat-tu/de-xuat',
		'/vat-tu/danh-muc-nganh',
		'/vat-tu/bao-cao'
	]
	if (allowed.some((a) => path === a || path.startsWith(a + '/'))) {
		return true
	}
	// Xem tòa / phòng (không tài khoản, không cập nhật)
	if (path === '/vat-tu') return true
	if (path.startsWith('/vat-tu/toa-nha/')) return true
	if (path.startsWith('/vat-tu/phong/')) return true
	if (path === '/vat-tu' || path.startsWith('/vat-tu/')) return false
	// Cấm quản lý user / học viên / import
	const blocked = [
		'/list-user',
		'/vai-tro',
		'/import-students',
		'/cpv',
		'/hcyu',
		'/birthday',
		'/chuyen-dang-chinh-thuc',
		'/ethnic-minority',
		'/religion',
		'/hoan-canh-kho-khan',
		'/thong-ke-chinh-tri',
		'/tieu-doan',
		'/dai-doi',
		'/classes',
		'/phong-day'
	]
	if (blocked.some((b) => path === b || path.startsWith(b + '/'))) {
		return false
	}
	return true
}

/** Quyền trong JWT access token */
export function getTokenPermissions(): string[] {
	const payload = readJwtPayload()
	const perms = payload?.permissions
	return Array.isArray(perms) ? (perms as string[]) : []
}

/** Ngành gán trong JWT */
export function getTokenNganhCodes(): string[] {
	const payload = readJwtPayload()
	const codes = payload?.nganhCodes
	if (!Array.isArray(codes)) return []
	return codes
		.map((c) =>
			String(c || '')
				.trim()
				.toUpperCase()
		)
		.filter(Boolean)
}

/** Tên role trong JWT */
export function getTokenRoles(): string[] {
	const payload = readJwtPayload()
	const roles = payload?.roles
	if (!Array.isArray(roles)) return []
	return roles.map((r) => String(r || '')).filter(Boolean)
}

/**
 * Role room_teacher: chỉ phòng dạy (xem HV + thiết bị + báo hỏng).
 */
export function isRoomTeacherUser(): boolean {
	if (isSuperAdmin()) return false
	const p = getTokenPermissions()
	if (!p.length) return false
	const has = (k: string) => p.includes(k)
	return (
		has('repair-requests:create') &&
		has('students:read') &&
		has('rooms:read') &&
		!has('students:create') &&
		!has('repair-requests:update')
	)
}

/**
 * User ngành: chỉ danh mục ngành (+ nhật ký / cập nhật VT).
 * Ưu tiên JWT isNganhScoped / roles / nganhCodes.
 */
export function isNganhUser(): boolean {
	if (isSuperAdmin()) return false
	if (isRoomTeacherUser()) return false
	if (isDonViUser()) return false
	// BGH (role admin) không phải user ngành
	if (isBghAdminUser() && !isSuperAdmin()) return false
	const rolesOnly = getTokenRoles().map((r) => r.toLowerCase())
	if (
		rolesOnly.some(
			(r) => r === 'admin' || r === 'admin_bgh' || r.includes('bgh')
		)
	) {
		return false
	}

	const payload = readJwtPayload()
	if (payload?.isNganhScoped === true) return true

	const roles = getTokenRoles().map((r) => r.toLowerCase())
	if (
		roles.some(
			(r) =>
				r === 'user_nganh' ||
				r === 'exam_dept_head' ||
				r.includes('ngành') ||
				r.includes('nganh') ||
				r.includes('chu_nhiem') ||
				r.includes('cnk')
		)
	) {
		return true
	}

	const nganhCodes = getTokenNganhCodes()
	const p = getTokenPermissions()
	const has = (k: string) => p.includes(k)

	// Có gán ngành + không đọc/sửa tòa → user ngành
	if (
		nganhCodes.length > 0 &&
		!has('buildings:read') &&
		!has('buildings:create')
	) {
		return true
	}

	// Fallback: catalog + không quản tòa (chỉ đọc tòa/phòng để form cap-nhat)
	if (!p.length) return false
	const hasCatalog =
		has('asset-catalog:read') ||
		has('catalog-stock:read') ||
		has('catalog-stock:create') ||
		has('asset-catalog:create')
	return (
		hasCatalog &&
		!has('buildings:create') &&
		!has('buildings:update') &&
		!has('buildings:delete')
	)
}

/**
 * User đơn vị sử dụng: role user_don_vi — xem tòa/danh mục, tạo đề xuất cho ngành.
 */
export function isDonViUser(): boolean {
	if (isSuperAdmin()) return false
	if (isRoomTeacherUser()) return false
	const roles = getTokenRoles().map((r) => r.toLowerCase())
	if (
		roles.some(
			(r) =>
				r === 'user_don_vi' ||
				r.includes('đơn vị sử dụng') ||
				r.includes('don_vi') ||
				r.includes('donvi')
		)
	) {
		return true
	}
	// Fallback: có proposals:create + buildings:read, không catalog create/update
	const p = getTokenPermissions()
	const has = (k: string) => p.includes(k)
	return (
		has('asset-proposals:create') &&
		has('buildings:read') &&
		!has('asset-catalog:create') &&
		!has('buildings:create') &&
		!has('asset-proposals:update')
	)
}

/** Path user đơn vị sử dụng được phép */
export function isDonViUserAllowedPath(pathname: string): boolean {
	const path = (pathname.split('?')[0] || pathname).replace(/\/$/, '') || '/'
	const allowed = ['/vat-tu/danh-muc-nganh', '/vat-tu/de-xuat']
	if (allowed.some((a) => path === a || path.startsWith(a + '/'))) {
		return true
	}
	if (path === '/vat-tu') return true
	if (path.startsWith('/vat-tu/toa-nha/')) return true
	if (path.startsWith('/vat-tu/phong/')) return true
	if (path === '/vat-tu' || path.startsWith('/vat-tu/')) return false
	return true
}

/** Path user ngành được phép trong /vat-tu (không nhật ký / thanh lý admin…) */
export function isNganhUserAllowedPath(pathname: string): boolean {
	const path = (pathname.split('?')[0] || pathname).replace(/\/$/, '') || '/'
	// Phân hệ đề thi tự luận — user ngành vận hành chính
	if (path === '/de-thi' || path.startsWith('/de-thi/')) return true
	// Danh mục ngành + cập nhật VT + đề xuất
	const allowed = [
		'/vat-tu/danh-muc-nganh',
		'/vat-tu/cap-nhat',
		'/vat-tu/de-xuat'
	]
	if (allowed.some((a) => path === a || path.startsWith(a + '/'))) {
		return true
	}
	// Danh mục tòa nhà: tòa / phòng / đơn vị (xem); chi tiết tòa + phòng
	// (không «Tài khoản» — chặn bằng view ở UI/guard)
	if (path === '/vat-tu') return true
	if (path.startsWith('/vat-tu/toa-nha/')) return true
	if (path.startsWith('/vat-tu/phong/')) return true
	// Cấm còn lại (nhật ký, thanh lý, phân công, điều động, báo cáo…)
	if (path === '/vat-tu' || path.startsWith('/vat-tu/')) return false
	return true
}

export function canLinkRoomClass(): boolean {
	if (isSuperAdmin()) return true
	return getTokenPermissions().includes('rooms:update')
}
