/**
 * Quyền UI đề thi — bám đặc tả (không cấp thừa):
 *
 * GV (exam_lecturer): soạn đề, đẩy file, gửi CNK
 * CNK (user_nganh): duyệt bước 1
 * Ban KT (exam_office / TP Đào tạo): thẩm định bước 2 → chuyển BGH; rút đề
 *   → KHÔNG phê duyệt cuối, KHÔNG tạo QR, KHÔNG khóa đề
 * BGH (admin / bgh.cdhc2): phê duyệt cuối + QR + khóa
 * Super (admin.cdhc2): full — cũng được phê duyệt cuối + QR + khóa
 */
import {
	getTokenPermissions,
	getTokenRoles,
	isBghAdminUser,
	isNganhUser,
	isSuperAdmin
} from '@/lib/utils'

function rolesLower() {
	return getTokenRoles().map((r) => r.toLowerCase())
}

type ExamPermissionResource =
	| 'exam-systems'
	| 'exam-majors'
	| 'exam-faculties'
	| 'exam-subjects'
	| 'exam-classes'
	| 'exam-teachers'
	| 'exam-assignments'
	| 'exam-approvals'

function hasExamPermission(
	resource: ExamPermissionResource,
	actions: string[] = ['read']
): boolean {
	const permissions = getTokenPermissions()
	return actions.some((action) =>
		permissions.includes(`${resource}:${action}`)
	)
}

function hasAnyGranularExamPermission(): boolean {
	return getTokenPermissions().some((permission) =>
		permission.startsWith('exam-')
	)
}

/** CNK = user ngành */
export function isExamNganhOperator(): boolean {
	if (isSuperAdmin()) return true
	if (isNganhUser()) return true
	const roles = rolesLower()
	return roles.some(
		(r) =>
			r === 'user_nganh' ||
			r === 'exam_dept_head' ||
			r.includes('nganh') ||
			r.includes('ngành') ||
			r.includes('chu_nhiem') ||
			r.includes('cnk')
	)
}

/** Role GV soạn đề thuần (không gộp CNK/super — dùng khi siết menu) */
export function isExamLecturerRoleOnly(): boolean {
	const roles = rolesLower()
	return roles.some((r) => r === 'exam_lecturer' || r.includes('giang_vien'))
}

/**
 * GV soạn đề thuần (vd. gv.cntt) — không CNK / Ban KT / BGH / super.
 * Chỉ menu: Trang chủ + Đề thi (tổng quan, đề của tôi).
 */
export function isPureExamLecturer(): boolean {
	if (isSuperAdmin()) return false
	if (!isExamLecturerRoleOnly()) return false
	if (isExamNganhOperator()) return false
	if (isExamOffice()) return false
	if (isExamBgh()) return false
	return true
}

/** Path GV soạn đề được phép */
export function isExamLecturerAllowedPath(pathname: string): boolean {
	const path = (pathname.split('?')[0] || pathname).replace(/\/$/, '') || '/'
	if (path === '/' || path === '') return true
	// Trang cá nhân (chữ ký số, đổi mật khẩu, thông tin)
	if (path === '/profile' || path.startsWith('/profile/')) return true
	if (path === '/de-thi') return true
	if (path === '/de-thi/cua-toi') return true
	if (path.startsWith('/de-thi/soan/')) return true
	if (path.startsWith('/de-thi/chi-tiet/')) return true
	if (path === '/de-thi/qr' || path.startsWith('/de-thi/qr')) return true
	// Cấm vật tư / học viên / duyệt / ngân hàng / rút đề / danh mục
	return false
}

/** Giảng viên soạn đề (gồm CNK/super khi vận hành soạn) */
export function isExamLecturer(): boolean {
	if (isSuperAdmin()) return true
	if (isExamLecturerRoleOnly()) return true
	// CNK có thể soạn đề ngành (vận hành)
	if (isExamNganhOperator()) return true
	// Không suy quyền chỉ từ exams:create — tránh nhầm Ban KT/BGH thành GV menu
	return false
}

export function isExamDeptHead(): boolean {
	return isExamNganhOperator()
}

/** Ban Khảo thí — chỉ role, không suy từ permission (tránh GV bị cấp nhầm exam-draw) */
export function isExamOffice(): boolean {
	if (isSuperAdmin()) return true
	const roles = rolesLower()
	return roles.some(
		(r) =>
			r === 'exam_office' ||
			r.includes('khao_thi') ||
			r.includes('khảo thí') ||
			r.includes('dao_tao') ||
			r.includes('đào tạo') ||
			r.includes('tpdt')
	)
}

export function isExamBgh(): boolean {
	return isBghAdminUser() || isSuperAdmin()
}

export function canAccessExamModule(): boolean {
	return (
		isSuperAdmin() ||
		hasAnyGranularExamPermission() ||
		isExamLecturer() ||
		isExamNganhOperator() ||
		isExamOffice() ||
		isExamBgh()
	)
}

/** Có bước duyệt nào đó — GV thuần KHÔNG duyệt */
export function canApproveExams(): boolean {
	if (isSuperAdmin()) return true
	if (hasExamPermission('exam-approvals', ['read', 'update'])) return true
	// GV thuần: không menu duyệt
	if (
		isExamLecturerRoleOnly() &&
		!isExamNganhOperator() &&
		!isExamOffice() &&
		!isExamBgh()
	) {
		return false
	}
	return isExamNganhOperator() || isExamOffice() || isExamBgh()
}

/** Chỉ BGH + admin.cdhc2 — Ban KT không được */
export function canFinalApproveAndQr(): boolean {
	return isExamBgh()
}

/** Chỉ Ban KT (+ super) — GV không rút đề */
export function canDrawExams(): boolean {
	return isExamOffice() || isSuperAdmin()
}

/** Danh mục đào tạo (khoa / ngành ĐT / lớp / môn) — GV không quản */
export function canManageExamCatalog(
	resource?: ExamPermissionResource
): boolean {
	if (isSuperAdmin()) return true
	const actions = ['create', 'update', 'delete']
	if (resource)
		return hasExamPermission(resource, actions) || isExamNganhOperator()
	return (
		isExamNganhOperator() ||
		(
			[
				'exam-systems',
				'exam-majors',
				'exam-faculties',
				'exam-subjects',
				'exam-classes'
			] as ExamPermissionResource[]
		).some((item) => hasExamPermission(item, actions))
	)
}

/**
 * Phân công môn học:
 * - Xem: khoa/CNK, admin, BGH, Ban KT
 * - Chỉnh: khoa/CNK + admin.cdhc2 (BGH chỉ xem)
 */
export function canViewTeachingAssignments(): boolean {
	return (
		isSuperAdmin() ||
		hasExamPermission('exam-assignments') ||
		isExamNganhOperator() ||
		isExamBgh() ||
		isExamOffice()
	)
}

export function canManageTeachingAssignments(): boolean {
	if (isExamBgh() && !isSuperAdmin()) return false
	return (
		isSuperAdmin() ||
		hasExamPermission('exam-assignments', ['create', 'update', 'delete']) ||
		isExamNganhOperator()
	)
}

export function canDecideExamStatus(status: string): boolean {
	if (status === 'PENDING_BGH') return canFinalApproveAndQr()
	if (status === 'PENDING_DEPT') return isExamDeptHead() || isSuperAdmin()
	if (status === 'PENDING_EXAM_OFFICE')
		return isExamOffice() || isSuperAdmin()
	return false
}

/** Menu items theo quyền đặc tả */
export type ExamNavKey =
	| 'overview'
	| 'catalog'
	| 'classes'
	| 'faculties'
	| 'teachers'
	| 'assign'
	| 'mine'
	| 'approve'
	| 'bank'
	| 'draw'

export function examNavAllowed(key: ExamNavKey): boolean {
	if (isSuperAdmin()) return true
	// CNK được cấp tự động từ chức danh: chỉ các màn hình phục vụ quản lý/duyệt khoa.
	if (rolesLower().includes('exam_dept_head')) {
		return [
			'overview',
			'catalog',
			'classes',
			'faculties',
			'teachers',
			'assign',
			'approve',
			'bank'
		].includes(key)
	}
	// Ban Khảo thí chỉ xem danh mục; vận hành duyệt, ngân hàng và rút đề.
	if (isExamOffice()) {
		return [
			'overview',
			'catalog',
			'classes',
			'teachers',
			'approve',
			'bank',
			'draw'
		].includes(key)
	}
	// GV thuần: chỉ Tổng quan + Đề của tôi
	const pureLecturer =
		isExamLecturerRoleOnly() &&
		!isExamNganhOperator() &&
		!isExamOffice() &&
		!isExamBgh()

	switch (key) {
		case 'overview':
			return canAccessExamModule()
		case 'catalog':
			return (
				canManageExamCatalog() ||
				hasExamPermission('exam-systems') ||
				hasExamPermission('exam-majors') ||
				hasExamPermission('exam-subjects')
			)
		case 'classes':
			// Danh mục lớp (Hệ + Ngành) — admin/CNK/KT quản; BGH xem qua catalog scope
			return (
				canManageExamCatalog('exam-classes') ||
				hasExamPermission('exam-classes') ||
				isExamBgh() ||
				isExamOffice()
			)
		case 'faculties':
			return (
				canManageExamCatalog('exam-faculties') ||
				hasExamPermission('exam-faculties')
			)
		case 'teachers':
			// Danh mục GV theo khoa — CNK/admin/BGH/KT (như phân công)
			return (
				canViewTeachingAssignments() ||
				hasExamPermission('exam-teachers')
			)
		case 'assign':
			// Khoa + admin + BGH (xem) + Ban KT xem
			return canViewTeachingAssignments()
		case 'mine':
			return isExamLecturer() || isExamLecturerRoleOnly()
		case 'approve':
			return canApproveExams()
		case 'bank':
			// Xem ngân hàng: CNK, Ban KT, BGH — không cho GV
			if (pureLecturer) return false
			return isExamNganhOperator() || isExamOffice() || isExamBgh()
		case 'draw':
			return canDrawExams()
		default:
			return false
	}
}
