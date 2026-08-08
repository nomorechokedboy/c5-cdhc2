/**
 * Phân quyền đề thi theo đặc tả:
 *
 * 1) Giảng viên (exam_lecturer): soạn đề theo phân công, đẩy file CH+ĐA, gửi CNK
 * 2) Chủ nhiệm khoa = user ngành (user_nganh): kiểm duyệt bước 1; trả lại / chuyển Ban KT
 * 3) Ban Khảo thí = Trưởng phòng Đào tạo (exam_office): thẩm định bước 2; rút đề; tra cứu/xuất
 *    - Không đạt → trả CNK
 * 4) Thủ trưởng BGH (admin): phê duyệt cuối, ngày/người duyệt, tạo QR, khóa
 *
 * Super admin (admin.cdhc2): full (vận hành hệ thống).
 * Không cấp quyền ngoài đặc tả.
 */
import { APIError } from 'encore.dev/api'
import { getAuthData } from '~encore/auth'
import { eq, inArray, sql } from 'drizzle-orm'
import orm from '../database'
import { users } from '../schema/users'
import { userRoles } from '../schema/user-roles'
import { roles } from '../schema/roles'
import {
	examFaculties,
	examFacultyHeads,
	examMajorHeads,
	examMajorSubjects,
	examMajors,
	examSubjects,
	type ExamStatus
} from '../schema/exam-bank'

export interface Actor {
	userId: number
	username: string
	displayName: string
	isSuperAdmin: boolean
	permissions: string[]
	roleNames: string[]
}

export async function getActor(): Promise<Actor> {
	const auth = getAuthData()
	if (!auth?.userID) {
		throw APIError.unauthenticated('Chưa đăng nhập')
	}
	const userId = Number(auth.userID)
	const [user] = await orm
		.select()
		.from(users)
		.where(eq(users.id, userId))
		.limit(1)
	if (!user) throw APIError.unauthenticated('User không tồn tại')

	const roleRows = await orm
		.select({ name: roles.name })
		.from(userRoles)
		.innerJoin(roles, eq(userRoles.roleId, roles.id))
		.where(eq(userRoles.userId, userId))

	return {
		userId,
		username: user.username,
		displayName: user.displayName || user.username,
		isSuperAdmin: !!auth.isSuperAdmin || !!user.isSuperUser,
		permissions: auth.permissions || [],
		roleNames: roleRows.map((r) => r.name)
	}
}

function hasPerm(actor: Actor, name: string) {
	return actor.permissions.includes(name)
}

function roleHit(actor: Actor, pred: (r: string) => boolean) {
	return actor.roleNames.some((r) => pred(r.toLowerCase()))
}

/** Chủ nhiệm khoa = user ngành */
export function isNganhOperator(actor: Actor) {
	if (actor.isSuperAdmin) return true
	return roleHit(
		actor,
		(r) =>
			r === 'user_nganh' ||
			r === 'exam_dept_head' ||
			r.includes('nganh') ||
			r.includes('ngành') ||
			r.includes('chu_nhiem') ||
			r.includes('cnk')
	)
}

/**
 * Giảng viên soạn đề (đặc tả).
 * Super + exam_lecturer. CNK có thể soạn nếu cần vận hành.
 */
export function isLecturer(actor: Actor) {
	if (actor.isSuperAdmin) return true
	if (
		roleHit(actor, (r) => r === 'exam_lecturer' || r.includes('giang_vien'))
	)
		return true
	// CNK soạn/đôn đốc đề ngành mình (vẫn trong phạm vi kho đề)
	if (isNganhOperator(actor)) return true
	return hasPerm(actor, 'exams:create')
}

/** CNK — duyệt PENDING_DEPT */
export function isDeptHead(actor: Actor) {
	if (actor.isSuperAdmin) return true
	return isNganhOperator(actor)
}

/**
 * CNK thuần (không super / không Ban KT / không BGH):
 * chỉ xem & duyệt đề thuộc khoa (ưu tiên) / ngành được gán.
 * Super / Ban KT / BGH: không giới hạn.
 */
export function isScopedDeptHead(actor: Actor): boolean {
	if (actor.isSuperAdmin) return false
	if (!isDeptHead(actor)) return false
	// Ban KT / BGH xem full — không ép scope ngành
	if (isExamOffice(actor) || isBgh(actor)) return false
	return true
}

/**
 * Mã khoa (K1…K8) CNK phụ trách — 1 CNK / khoa dùng chung mọi ngành.
 * - `null` = không giới hạn
 * - `[]` = không gán khoa (có thể vẫn gán ngành legacy)
 * - string[] = các mã khoa
 */
export async function getDeptHeadFacultyCodes(
	actor: Actor
): Promise<string[] | null> {
	if (!isScopedDeptHead(actor)) return null
	const rows = await orm
		.select({ code: examFacultyHeads.facultyCode })
		.from(examFacultyHeads)
		.where(eq(examFacultyHeads.userId, actor.userId))
	return [
		...new Set(
			rows.map((r) => String(r.code || '').toUpperCase()).filter(Boolean)
		)
	]
}

/**
 * Danh sách majorId CNK được duyệt.
 * - `null` = không giới hạn (super / KT / BGH / không phải CNK scope)
 * - `[]` = CNK chưa được gán khoa/ngành → không thấy đề nào
 * - number[] = ngành từ (1) exam_faculty_heads → môn thuộc khoa
 *             + (2) exam_major_heads (legacy)
 *
 * Ưu tiên gán theo **khoa**: 1 CNK Khoa Điều dưỡng (K7) duyệt mọi ngành/môn khoa đó.
 */
export async function getDeptHeadMajorIds(
	actor: Actor
): Promise<number[] | null> {
	if (!isScopedDeptHead(actor)) return null

	const majorIds = new Set<number>()

	// 1) Theo khoa (chính): mọi ngành có môn thuộc khoa CNK phụ trách
	const facCodes = await getDeptHeadFacultyCodes(actor)
	if (facCodes && facCodes.length) {
		const fromFac = await orm
			.selectDistinct({ majorId: examMajorSubjects.majorId })
			.from(examSubjects)
			.innerJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.innerJoin(
				examMajorSubjects,
				eq(examMajorSubjects.subjectId, examSubjects.id)
			)
			.where(inArray(examFaculties.code, facCodes))
		for (const r of fromFac) {
			if (r.majorId != null) majorIds.add(r.majorId)
		}
	}

	// 2) Theo ngành (legacy / bổ sung)
	const assigns = await orm
		.select({ majorId: examMajorHeads.majorId })
		.from(examMajorHeads)
		.where(eq(examMajorHeads.userId, actor.userId))
	for (const a of assigns) {
		if (a.majorId != null) majorIds.add(a.majorId)
	}

	if (majorIds.size) {
		return [...majorIds]
	}

	// Fallback: username cnk.a_cddd / cnk.dieuduong — không map ngành
	// cnk.{majorCode} → 1 ngành
	const un = (actor.username || '').toLowerCase().trim()
	const m = un.match(/^(?:cnk|user)\.([a-z0-9_-]+)$/i)
	if (m?.[1]) {
		const code = m[1].toUpperCase()
		// username kiểu cnk.dieuduong / cnk.k7 → coi là khoa
		if (/^K\d+$/i.test(code) || code === 'DIEUDUONG' || code === 'DD') {
			const facCode = /^K\d+$/i.test(code) ? code.toUpperCase() : 'K7'
			const fromFac = await orm
				.selectDistinct({ majorId: examMajorSubjects.majorId })
				.from(examSubjects)
				.innerJoin(
					examFaculties,
					eq(examSubjects.facultyId, examFaculties.id)
				)
				.innerJoin(
					examMajorSubjects,
					eq(examMajorSubjects.subjectId, examSubjects.id)
				)
				.where(eq(examFaculties.code, facCode))
			for (const r of fromFac) {
				if (r.majorId != null) majorIds.add(r.majorId)
			}
			if (majorIds.size) return [...majorIds]
		}
		const [maj] = await orm
			.select({ id: examMajors.id })
			.from(examMajors)
			.where(sql`upper(${examMajors.code}) = ${code}`)
			.limit(1)
		if (maj) return [maj.id]
	}

	// CNK không gán khoa/ngành → không thấy gì (an toàn)
	return []
}

/** true nếu actor (CNK scoped) được duyệt đề thuộc majorId */
export async function canDeptHeadAccessMajor(
	actor: Actor,
	majorId: number | null | undefined
): Promise<boolean> {
	const scope = await getDeptHeadMajorIds(actor)
	if (scope === null) return true
	if (majorId == null) return false
	return scope.includes(majorId)
}

/**
 * true nếu CNK được duyệt đề theo môn (khoa của môn ∈ khoa CNK phụ trách,
 * hoặc ngành môn ∈ major heads).
 */
export async function canDeptHeadAccessSubject(
	actor: Actor,
	opts: {
		majorId?: number | null
		facultyCode?: string | null
	}
): Promise<boolean> {
	if (!isScopedDeptHead(actor)) return true
	const facCodes = await getDeptHeadFacultyCodes(actor)
	const code = (opts.facultyCode || '').trim().toUpperCase()
	if (facCodes && facCodes.length && code && facCodes.includes(code)) {
		return true
	}
	return canDeptHeadAccessMajor(actor, opts.majorId)
}

/**
 * Ban Khảo thí = TP Đào tạo (exam_office).
 * Không gộp user ngành.
 * Thẩm định + rút đề + tra cứu/xuất.
 */
export function isExamOffice(actor: Actor) {
	if (actor.isSuperAdmin) return true
	// Chặn user_nganh thuần
	if (isNganhOperator(actor) && !actor.isSuperAdmin) {
		const alsoKt = roleHit(
			actor,
			(r) =>
				r === 'exam_office' ||
				r.includes('khao_thi') ||
				r.includes('khảo thí') ||
				r.includes('dao_tao') ||
				r.includes('đào tạo') ||
				r.includes('tpdt')
		)
		if (!alsoKt) return false
	}
	return roleHit(
		actor,
		(r) =>
			r === 'exam_office' ||
			r.includes('khao_thi') ||
			r.includes('khảo thí') ||
			r.includes('dao_tao') ||
			r.includes('đào tạo') ||
			r.includes('tpdt')
	)
}

/**
 * Thủ trưởng BGH / super admin — cấp cuối:
 * phê duyệt cuối + tạo QR + khóa đề.
 * Ban Khảo thí (exam_office) KHÔNG phải BGH.
 */
export function isBgh(actor: Actor) {
	// Super = admin.cdhc2
	if (actor.isSuperAdmin) return true
	// Không bao giờ coi Ban KT là BGH dù lỡ gán role lẫn
	if (isExamOffice(actor) && !actor.isSuperAdmin) {
		const alsoBgh = roleHit(
			actor,
			(r) =>
				r === 'admin' ||
				r === 'admin_bgh' ||
				r.includes('bgh') ||
				r.includes('giam_hieu') ||
				r.includes('giám hiệu')
		)
		if (!alsoBgh) return false
	}
	return roleHit(
		actor,
		(r) =>
			r === 'admin' ||
			r === 'admin_bgh' ||
			r.includes('bgh') ||
			r.includes('giam_hieu') ||
			r.includes('giám hiệu')
	)
}

/** Chỉ rút đề: Ban KT (+ super) */
export function canDrawExamsApi(actor: Actor) {
	return actor.isSuperAdmin || isExamOffice(actor)
}

/**
 * Quy trình 3 cấp (bắt buộc tuần tự, không bỏ cấp):
 *
 *   GV soạn (DRAFT/RETURNED)
 *     │ submit
 *     ▼
 *   PENDING_DEPT  ← Chủ nhiệm khoa: duyệt → Ban KT | trả → RETURNED (GV)
 *     │
 *     ▼
 *   PENDING_EXAM_OFFICE ← Ban Khảo thí: duyệt → BGH | trả → PENDING_DEPT (CNK)
 *     │
 *     ▼
 *   PENDING_BGH ← BGH: duyệt → APPROVED+QR+khóa | trả → PENDING_EXAM_OFFICE (Ban KT)
 *
 * Không ai (trừ super vận hành) được duyệt ngoài cấp của mình.
 */
export type ExamDecision = 'APPROVE' | 'RETURN'

export function canApproveAtStatus(actor: Actor, status: ExamStatus): boolean {
	switch (status) {
		case 'PENDING_DEPT':
			// Chỉ CNK (user ngành) — Ban KT / BGH không duyệt hộ bước 1
			// Super: được (vận hành)
			return isDeptHead(actor)
		case 'PENDING_EXAM_OFFICE':
			// Chỉ Ban Khảo thí — CNK / BGH không thẩm định hộ bước 2
			return isExamOffice(actor)
		case 'PENDING_BGH':
			// Chỉ BGH — Ban KT không phê duyệt cuối
			return isBgh(actor)
		default:
			return false
	}
}

/**
 * Chuyển trạng thái sau quyết định.
 * Trả null nếu status/decision không hợp lệ.
 */
export function nextExamStatus(
	current: ExamStatus,
	decision: ExamDecision
): ExamStatus | null {
	if (decision === 'APPROVE') {
		switch (current) {
			case 'PENDING_DEPT':
				return 'PENDING_EXAM_OFFICE' // CNK → Ban KT
			case 'PENDING_EXAM_OFFICE':
				return 'PENDING_BGH' // Ban KT → BGH
			case 'PENDING_BGH':
				return 'APPROVED' // BGH → ngân hàng (QR+khóa ở applyBgh)
			default:
				return null
		}
	}
	// RETURN — trả về cấp trước
	switch (current) {
		case 'PENDING_DEPT':
			return 'RETURNED' // → GV soạn lại
		case 'PENDING_EXAM_OFFICE':
			return 'PENDING_DEPT' // → CNK
		case 'PENDING_BGH':
			return 'PENDING_EXAM_OFFICE' // → Ban KT
		default:
			return null
	}
}

export function examDecisionSummary(
	from: ExamStatus,
	to: ExamStatus,
	decision: ExamDecision
): string {
	if (decision === 'APPROVE') {
		if (from === 'PENDING_DEPT' && to === 'PENDING_EXAM_OFFICE')
			return 'CNK duyệt đạt → chuyển Ban Khảo thí thẩm định'
		if (from === 'PENDING_EXAM_OFFICE' && to === 'PENDING_BGH')
			return 'Ban KT thẩm định đạt → chuyển BGH phê duyệt'
		if (from === 'PENDING_BGH' && to === 'APPROVED')
			return 'BGH phê duyệt cuối → QR + khóa → ngân hàng đề'
	}
	if (decision === 'RETURN') {
		if (from === 'PENDING_DEPT' && to === 'RETURNED')
			return 'CNK trả lại người soạn (GV)'
		if (from === 'PENDING_EXAM_OFFICE' && to === 'PENDING_DEPT')
			return 'Ban KT trả về Chủ nhiệm khoa'
		if (from === 'PENDING_BGH' && to === 'PENDING_EXAM_OFFICE')
			return 'BGH trả về Ban Khảo thí'
	}
	return `${decision}: ${from} → ${to}`
}

/** QR + khóa chỉ BGH / admin.cdhc2 (không phải Ban KT) */
export function canGenerateExamQr(actor: Actor): boolean {
	return isBgh(actor)
}

/** Phê duyệt cuối (APPROVED + QR + lock) */
export function canFinalApproveExam(actor: Actor): boolean {
	return isBgh(actor)
}

/**
 * Phân công môn học (GV dạy môn nào):
 * - Xem: super, khoa/CNK, BGH
 * - Sửa: super, khoa/CNK (BGH chỉ xem)
 */
export function canViewTeachingAssignments(actor: Actor) {
	return (
		actor.isSuperAdmin ||
		hasPerm(actor, 'exam-assignments:read') ||
		isNganhOperator(actor) ||
		isBgh(actor) ||
		isExamOffice(actor)
	)
}

export function canManageTeachingAssignments(actor: Actor) {
	// BGH chỉ xem — không chỉnh
	if (isBgh(actor) && !actor.isSuperAdmin) return false
	return (
		actor.isSuperAdmin ||
		isNganhOperator(actor) ||
		['create', 'update', 'delete'].some((action) =>
			hasPerm(actor, `exam-assignments:${action}`)
		)
	)
}

/** Danh mục ngành/môn: super + CNK (quản môn ngành) + Ban KT xem/vận hành */
export function canManageCatalogApi(actor: Actor): boolean {
	if (actor.isSuperAdmin || isNganhOperator(actor)) return true
	const resources = [
		'exam-systems',
		'exam-majors',
		'exam-faculties',
		'exam-subjects',
		'exam-classes'
	]
	return resources.some((resource) =>
		['create', 'update', 'delete'].some((action) =>
			hasPerm(actor, `${resource}:${action}`)
		)
	)
}

export function statusLabel(s: string): string {
	switch (s) {
		case 'DRAFT':
			return 'Nháp'
		case 'PENDING_DEPT':
			return 'Chờ Chủ nhiệm khoa (ngành)'
		case 'PENDING_EXAM_OFFICE':
			return 'Chờ Ban Khảo thí (TP Đào tạo)'
		case 'PENDING_BGH':
			return 'Chờ BGH phê duyệt'
		case 'APPROVED':
			return 'Đã phê duyệt'
		case 'RETURNED':
			return 'Trả lại người soạn'
		case 'REJECTED':
			return 'Từ chối'
		default:
			return s
	}
}

/** ACTIVE = còn trong niên khóa; EXPIRED = đã qua tháng/năm kết thúc khóa */
export type ExamClassLifecycleStatus = 'ACTIVE' | 'EXPIRED'

/**
 * Parse mốc kết thúc khóa từ `cohort`.
 * Chuẩn mới: «MM/YYYY - MM/YYYY» hoặc «YYYY-MM/YYYY-MM» (tháng/năm).
 * Legacy: «2024-2027» / «2024» → hết = tháng 12 năm cuối.
 * Trả về endKey «YYYY-MM» hoặc null.
 */
export function parseCohortEndMonth(
	cohort: string | null | undefined
): string | null {
	const raw = String(cohort || '').trim()
	if (!raw) return null

	// MM/YYYY ... MM/YYYY  (ưu tiên cặp cuối)
	const mmYyyy = [...raw.matchAll(/(?:^|[^\d])(\d{1,2})\s*\/\s*(\d{4})/g)]
	if (mmYyyy.length >= 1) {
		const last = mmYyyy[mmYyyy.length - 1]!
		const m = Math.min(12, Math.max(1, Number(last[1])))
		const y = Number(last[2])
		if (y >= 1990 && y <= 2100) {
			return `${y}-${String(m).padStart(2, '0')}`
		}
	}

	// YYYY-MM ... YYYY-MM
	const yyyyMm = [...raw.matchAll(/(\d{4})-(\d{2})/g)]
	if (yyyyMm.length >= 1) {
		const last = yyyyMm[yyyyMm.length - 1]!
		const y = Number(last[1])
		const m = Number(last[2])
		if (y >= 1990 && y <= 2100 && m >= 1 && m <= 12) {
			return `${y}-${String(m).padStart(2, '0')}`
		}
	}

	// Chỉ năm: 2024-2027 hoặc 2024 → hết 12/năm cuối
	const years = raw.match(/\d{4}/g)?.map((y) => Number(y)) || []
	const endYear =
		years.length > 0
			? Math.max(...years.filter((y) => y >= 1990 && y <= 2100))
			: null
	if (endYear != null && Number.isFinite(endYear)) {
		return `${endYear}-12`
	}
	return null
}

/**
 * Chuẩn hoá chuỗi khóa từ 2 mốc YYYY-MM (input type=month).
 * → «MM/YYYY - MM/YYYY»
 */
export function formatCohortFromMonths(
	startYm: string | null | undefined,
	endYm: string | null | undefined
): string {
	const fmt = (ym: string) => {
		const m = String(ym)
			.trim()
			.match(/^(\d{4})-(\d{2})$/)
		if (!m) return ''
		return `${m[2]}/${m[1]}`
	}
	const a = fmt(startYm || '')
	const b = fmt(endYm || '')
	if (a && b) return `${a} - ${b}`
	if (b) return b
	if (a) return a
	return ''
}

/**
 * Trạng thái lớp theo cột `cohort` (tháng/năm kết thúc).
 * - Hết niên khóa khi tháng-năm hiện tại (VN) > tháng-năm kết thúc khóa.
 * - Cohort rỗng / không parse được → ACTIVE (không chặn vận hành).
 */
export function getClassCohortStatus(
	cohort: string | null | undefined,
	now: Date = new Date()
): {
	status: ExamClassLifecycleStatus
	statusLabel: string
	endYear: number | null
	/** YYYY-MM kết thúc khóa */
	endMonth: string | null
} {
	const endMonth = parseCohortEndMonth(cohort)
	if (!endMonth) {
		return {
			status: 'ACTIVE',
			statusLabel: 'Hoạt động',
			endYear: null,
			endMonth: null
		}
	}
	const endYear = Number(endMonth.slice(0, 4))
	// Tháng-năm hiện tại theo giờ VN
	const ymVn = now.toLocaleString('sv-SE', {
		timeZone: 'Asia/Ho_Chi_Minh',
		year: 'numeric',
		month: '2-digit'
	}) // "2026-07"
	const currentYm = ymVn.slice(0, 7)

	if (currentYm > endMonth) {
		return {
			status: 'EXPIRED',
			statusLabel: 'Hết niên khóa',
			endYear,
			endMonth
		}
	}
	return {
		status: 'ACTIVE',
		statusLabel: 'Hoạt động',
		endYear,
		endMonth
	}
}

export function isClassCohortExpired(
	cohort: string | null | undefined,
	now?: Date
): boolean {
	return getClassCohortStatus(cohort, now).status === 'EXPIRED'
}

/**
 * Khóa lớp bắt buộc có tháng/năm kết thúc (parse được end month).
 * Chuẩn: «MM/YYYY - MM/YYYY».
 */
export function assertCohortHasMonthYear(
	cohort: string | null | undefined
): string {
	const raw = String(cohort || '').trim()
	if (!raw) {
		throw APIError.invalidArgument(
			'Khóa / niên khóa bắt buộc — nhập tháng/năm bắt đầu và kết thúc (vd 09/2024 - 06/2027)'
		)
	}
	// Bắt buộc có ít nhất một cặp tháng/năm (không chỉ năm)
	const hasMmYyyy = /(?:^|[^\d])\d{1,2}\s*\/\s*\d{4}/.test(raw)
	const hasYyyyMm = /\d{4}-\d{2}/.test(raw)
	if (!hasMmYyyy && !hasYyyyMm) {
		throw APIError.invalidArgument(
			'Khóa phải gồm tháng và năm (vd 09/2024 - 06/2027), không chỉ năm'
		)
	}
	const end = parseCohortEndMonth(raw)
	if (!end) {
		throw APIError.invalidArgument(
			'Khóa không hợp lệ — kiểm tra tháng/năm bắt đầu và kết thúc'
		)
	}
	return raw
}

/** Trạng thái thời gian giảng dạy trên phân công */
export type TeachingPeriodStatus = 'ACTIVE' | 'EXPIRED' | 'UPCOMING'

/**
 * Thời gian giảng dạy (YYYY-MM-DD):
 * - EXPIRED: đã qua teachingEnd
 * - UPCOMING: chưa tới teachingStart (vẫn chặn import nếu muốn strict — hiện coi như chưa active)
 * - ACTIVE: trong khoảng [start, end]; thiếu end → ACTIVE
 */
export function getTeachingPeriodStatus(
	teachingStart: string | null | undefined,
	teachingEnd: string | null | undefined,
	now: Date = new Date()
): {
	status: TeachingPeriodStatus
	statusLabel: string
} {
	const today = now
		.toLocaleString('sv-SE', {
			timeZone: 'Asia/Ho_Chi_Minh',
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		})
		.slice(0, 10) // YYYY-MM-DD

	const start = String(teachingStart || '')
		.trim()
		.slice(0, 10)
	const end = String(teachingEnd || '')
		.trim()
		.slice(0, 10)
	const startOk = /^\d{4}-\d{2}-\d{2}$/.test(start) ? start : null
	const endOk = /^\d{4}-\d{2}-\d{2}$/.test(end) ? end : null

	if (endOk && today > endOk) {
		return {
			status: 'EXPIRED',
			statusLabel: 'Hết thời gian giảng dạy'
		}
	}
	if (startOk && today < startOk) {
		return {
			status: 'UPCOMING',
			statusLabel: 'Chưa đến thời gian giảng dạy'
		}
	}
	return {
		status: 'ACTIVE',
		statusLabel: 'Đang hoạt động'
	}
}

/** true nếu GV không được import đề theo khoảng thời gian phân công */
export function isTeachingPeriodInactive(
	teachingStart: string | null | undefined,
	teachingEnd: string | null | undefined,
	now?: Date
): boolean {
	const s = getTeachingPeriodStatus(teachingStart, teachingEnd, now).status
	return s === 'EXPIRED' || s === 'UPCOMING'
}

/**
 * true nếu đã kết thúc thời gian giảng dạy (qua teachingEnd).
 * GV chỉ được xuất/tải đề về sau khi hết khóa dạy lớp đó.
 */
export function isTeachingPeriodEnded(
	teachingStart: string | null | undefined,
	teachingEnd: string | null | undefined,
	now?: Date
): boolean {
	return (
		getTeachingPeriodStatus(teachingStart, teachingEnd, now).status ===
		'EXPIRED'
	)
}

/**
 * Thời điểm hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7).
 * Format lưu DB / hiển thị: `YYYY-MM-DD HH:mm:ss`
 *
 * Không dùng `toISOString()` (luôn UTC) — sẽ lệch −7 giờ so với giờ VN.
 */
export function nowIso() {
	// sv-SE → 2026-07-17 20:30:00 (local-like, không có T)
	return new Date().toLocaleString('sv-SE', {
		timeZone: 'Asia/Ho_Chi_Minh',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hour12: false
	})
}

/** Ngày VN dạng YYYY-MM-DD */
export function todayVnDate(): string {
	return nowIso().slice(0, 10)
}

/**
 * Chênh lệch ngày lịch (VN) giữa 2 chuỗi YYYY-MM-DD hoặc datetime.
 * |a − b| theo calendar days.
 */
export function daysBetweenDates(
	a: string | null | undefined,
	b: string | null | undefined
): number | null {
	const da = String(a || '')
		.trim()
		.slice(0, 10)
	const db = String(b || '')
		.trim()
		.slice(0, 10)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(da) || !/^\d{4}-\d{2}-\d{2}$/.test(db)) {
		return null
	}
	const ta = Date.parse(`${da}T00:00:00+07:00`)
	const tb = Date.parse(`${db}T00:00:00+07:00`)
	if (Number.isNaN(ta) || Number.isNaN(tb)) return null
	return Math.round(Math.abs(ta - tb) / 86_400_000)
}

/** true nếu |ngày thi − ngày rút| > 3 */
export function isExamDrawDateOverLimit(
	examDate: string | null | undefined,
	drawnAt: string | null | undefined,
	maxDays = 3
): boolean {
	const d = daysBetweenDates(examDate, drawnAt)
	if (d == null) return false
	return d > maxDays
}

/** true nếu |ngày thi − ngày hiện tại| quá maxDays (không cho in) */
export function isDrawPrintOverdue(
	examDate: string | null | undefined,
	now = todayVnDate(),
	maxDays = 3
): boolean {
	const d = daysBetweenDates(examDate, now)
	if (d == null) return false
	return d > maxDays
}

/**
 * Nhãn ký BGH từ position / alias / username.
 * ht / hieu_truong → HIỆU TRƯỞNG
 * pht / pho → PHÓ HIỆU TRƯỞNG
 */
export function resolveBghSignTitle(user: {
	username?: string | null
	position?: string | null
	alias?: string | null
	displayName?: string | null
}): string {
	const blob = [user.alias, user.position, user.username, user.displayName]
		.filter(Boolean)
		.join(' ')
		.toLowerCase()
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
	if (
		blob.includes('pho hieu') ||
		blob.includes('pho_hieu') ||
		blob.includes('pht') ||
		/\bpht\b/.test(blob) ||
		blob.startsWith('pht.') ||
		blob.includes('phó hiệu')
	) {
		return 'PHÓ HIỆU TRƯỞNG'
	}
	if (
		blob.includes('hieu truong') ||
		blob.includes('hieu_truong') ||
		blob.includes('ht.cdhc') ||
		blob.startsWith('ht.') ||
		/\bht\b/.test(user.username || '')
	) {
		return 'HIỆU TRƯỞNG'
	}
	// Mặc định BGH: KT. HIỆU TRƯỞNG (ủy quyền)
	return 'KT. HIỆU TRƯỞNG'
}

/** Dòng dưới chữ ký: "Thượng tá, ThS Nguyễn Văn A" */
export function formatSignerLine(opts: {
	rank?: string | null
	displayName?: string | null
	position?: string | null
}): string {
	const parts: string[] = []
	if (opts.rank?.trim()) parts.push(opts.rank.trim())
	if (
		opts.position?.trim() &&
		!parts.some((p) => p.includes(opts.position!))
	) {
		// không nhét position vào nếu đã là title lớn
	}
	const name = (opts.displayName || '').trim()
	if (parts.length && name) return `${parts.join(', ')} ${name}`
	if (name) return name
	return parts.join(', ') || '—'
}

export function genExamCode(subjectCode: string, paperNumber?: number | null) {
	if (paperNumber != null && paperNumber > 0) {
		const n = String(paperNumber).padStart(2, '0')
		const r = Math.random().toString(36).slice(2, 5).toUpperCase()
		return `DT-${subjectCode || 'MH'}-DE${n}-${r}`.slice(0, 40)
	}
	const t = Date.now().toString(36).toUpperCase()
	const r = Math.random().toString(36).slice(2, 6).toUpperCase()
	return `DT-${subjectCode || 'MH'}-${t}-${r}`.slice(0, 40)
}

/**
 * Mã phiếu bốc gắn số đề import:
 * BD-DE09-CHAN-xxx / BD-DE03-LE-xxx
 */
export function genDrawCode(
	paperNumber?: number | null,
	drawType?: 'EVEN' | 'ODD' | string
) {
	const parity =
		drawType === 'EVEN' ? 'CHAN' : drawType === 'ODD' ? 'LE' : 'X'
	const r = Math.random().toString(36).slice(2, 6).toUpperCase()
	if (paperNumber != null && paperNumber > 0) {
		const n = String(paperNumber).padStart(2, '0')
		return `BD-DE${n}-${parity}-${r}`
	}
	const t = Date.now().toString(36).toUpperCase()
	return `BD-${t}-${parity}-${r}`
}

/**
 * Token QR lưu DB (ổn định):
 * EXAM:{examId}:{examCode}[:DE{nn}]
 *
 * Ảnh QR trên web mã hóa URL trang xem thông tin:
 * {WEB}/de-thi/qr?c=EXAM%3A...
 */
export function genQrPayload(
	examCode: string,
	examId: number,
	paperNumber?: number | null
) {
	const de =
		paperNumber != null && paperNumber > 0
			? `:DE${String(paperNumber).padStart(2, '0')}`
			: ''
	return `EXAM:${examId}:${examCode}${de}`
}

/** Parse nội dung QR (token EXAM:… hoặc URL /de-thi/qr?c=…) */
export function parseExamQrPayload(raw: string): {
	examId: number | null
	examCode: string | null
	paperNumber: number | null
	raw: string
} {
	let text = String(raw || '').trim()
	if (!text) {
		return { examId: null, examCode: null, paperNumber: null, raw: text }
	}

	// URL trang quét: https://host/de-thi/qr?c=EXAM%3A12%3A... hoặc /de-thi/qr/12
	try {
		const asUrl = text.includes('://')
			? new URL(text)
			: text.startsWith('/de-thi/qr')
				? new URL(text, 'http://local.invalid')
				: null
		if (asUrl) {
			const c =
				asUrl.searchParams.get('c') ||
				asUrl.searchParams.get('code') ||
				asUrl.searchParams.get('q')
			if (c) text = decodeURIComponent(c)
			else {
				const mPath = asUrl.pathname.match(/\/de-thi\/qr\/(\d+)\/?/i)
				if (mPath) {
					return {
						examId: Number(mPath[1]),
						examCode: null,
						paperNumber: null,
						raw: String(raw || '').trim()
					}
				}
			}
		}
	} catch {
		/* not a URL */
	}

	// EXAM:{id}:{code}[:DE09][:timestamp cũ]
	const m = text.match(/^EXAM:(\d+):(.+)$/i)
	if (m) {
		const examId = Number(m[1])
		let rest = m[2] || ''
		// Bỏ timestamp ms ở cuối (payload cũ)
		rest = rest.replace(/:\d{10,}$/g, '')
		let paperNumber: number | null = null
		const deTail = rest.match(/:DE(\d+)$/i)
		if (deTail) {
			paperNumber = Number(deTail[1])
			rest = rest.slice(0, -deTail[0].length)
		}
		const examCode = rest || null
		const fromCode = examCode?.match(/DE0*(\d+)/i)
		if (paperNumber == null && fromCode) {
			paperNumber = Number(fromCode[1])
		}
		return {
			examId: Number.isFinite(examId) ? examId : null,
			examCode,
			paperNumber:
				paperNumber != null && Number.isFinite(paperNumber)
					? paperNumber
					: null,
			raw: text
		}
	}
	// Chỉ dán mã đề DT-...
	if (/^DT-/i.test(text)) {
		const fromCode = text.match(/DE0*(\d+)/i)
		return {
			examId: null,
			examCode: text,
			paperNumber: fromCode ? Number(fromCode[1]) : null,
			raw: text
		}
	}
	// BD-DE09-CHAN-...
	const bd = text.match(/BD-DE0*(\d+)/i)
	if (bd) {
		return {
			examId: null,
			examCode: null,
			paperNumber: Number(bd[1]),
			raw: text
		}
	}
	return { examId: null, examCode: null, paperNumber: null, raw: text }
}

/**
 * Suy ra số đề từ tiêu đề / mã.
 * Hỗ trợ: «Đề thi số 9», «Đề số 3», «Đề 1», «Đề mẫu 2», DE09 trong mã.
 */
export function inferPaperNumber(
	title?: string | null,
	code?: string | null
): number | null {
	const t = String(title || '').normalize('NFC')
	const patterns = [
		// Đề thi số 9 / Đề số 9 / Đề 9
		/đề\s*thi\s*số\s*(\d+)\b/i,
		/đề\s*số\s*(\d+)\b/i,
		/đề\s*mẫu\s*(\d+)\b/i,
		/đề\s*#?\s*(\d+)\b/i,
		/\bde\s*thi\s*so\s*(\d+)\b/i,
		/\bde\s*so\s*(\d+)\b/i,
		/\bde\s*(\d+)\b/i,
		// «— 3» / «số 3» cuối tiêu đề
		/\bsố\s*(\d+)\s*$/i,
		/\b#\s*(\d+)\b/
	]
	for (const re of patterns) {
		const m = t.match(re)
		if (m) {
			const n = Number(m[1])
			if (Number.isFinite(n) && n > 0 && n < 10000) return n
		}
	}
	const c = String(code || '')
	const mc = c.match(/DE0*(\d+)/i)
	if (mc) {
		const n = Number(mc[1])
		if (Number.isFinite(n) && n > 0) return n
	}
	return null
}
