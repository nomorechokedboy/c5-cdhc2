import { int, sqliteTable, text } from 'drizzle-orm/sqlite-core'
import { Base, baseSchema } from './base'

/**
 * Mã đối tượng theo quy định (Ma_DT):
 * SQ | QNCN | CNQP | VCQP | HSQBS | HV | KHAC
 * Legacy (map khi đọc/ghi): QN→SQ, CN→CNQP, HSQ|BS→HSQBS
 */
export type LeaveObjectType =
	| 'SQ'
	| 'QNCN'
	| 'CNQP'
	| 'VCQP'
	| 'HSQBS'
	| 'HV'
	| 'KHAC'
	/** @deprecated dùng SQ */
	| 'QN'
	/** @deprecated dùng CNQP */
	| 'CN'
	/** @deprecated dùng HSQBS */
	| 'HSQ'
	/** @deprecated dùng HSQBS */
	| 'BS'

/** ANNUAL = phép hằng năm | SPECIAL = phép đặc biệt */
export type LeaveType = 'ANNUAL' | 'SPECIAL'

/** Cấp địa phương */
export type LeaveLocalityLevel = 'province' | 'ward' | 'village'

/**
 * DRAFT — nháp
 * PENDING_COMMANDER — chờ chỉ huy cơ quan duyệt
 * PENDING_AGENCY — chờ cơ quan quản lý (in / BGH–quân lực ký)
 * PENDING — legacy (= chờ duyệt, map như PENDING_COMMANDER)
 * APPROVED — đã duyệt (sau khi ký)
 * RETURNED — trả lại
 * REJECTED — từ chối (legacy, map như RETURNED)
 * CANCELLED — đã hủy
 */
export type LeaveRequestStatus =
	| 'DRAFT'
	| 'PENDING'
	| 'PENDING_COMMANDER'
	| 'PENDING_AGENCY'
	| 'APPROVED'
	| 'RETURNED'
	| 'REJECTED'
	| 'CANCELLED'

/** Bảng đối tượng (Ma_DT, Tên_ĐT) */
export const leaveObjectTypes = sqliteTable('leave_object_types', {
	...baseSchema,
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: int('is_active', { mode: 'boolean' }).notNull().default(true)
})

/** Danh mục đơn vị / đầu mối đơn vị trực thuộc */
export const leaveUnits = sqliteTable('leave_units', {
	...baseSchema,
	code: text('code'),
	name: text('name').notNull(),
	level: text('level'),
	parentId: int('parent_id'),
	isActive: int('is_active', { mode: 'boolean' }).notNull().default(true),
	commanderUserId: int('commander_user_id'),
	commanderName: text('commander_name'),
	managementArea: text('management_area').notNull().default('cán_bộ')
})

/** Lớp học viên thuộc đại đội (mỗi đại đội tối đa 2 lớp A1–A10). */
export const leaveClasses = sqliteTable('leave_classes', {
	...baseSchema,
	unitId: int('unit_id').notNull(),
	name: text('name').notNull(),
	isActive: int('is_active', { mode: 'boolean' }).notNull().default(true)
})

/** Tiêu chuẩn phép thêm (MS 01–06) */
export const leaveExtraStandards = sqliteTable('leave_extra_standards', {
	...baseSchema,
	code: text('code').notNull().unique(),
	label: text('label').notNull(),
	days: int('days').notNull(),
	sortOrder: int('sort_order').notNull().default(0),
	isActive: int('is_active', { mode: 'boolean' }).notNull().default(true)
})

/** Danh sách quân nhân (catalog phép) */
export const leavePersonnel = sqliteTable('leave_personnel', {
	...baseSchema,
	code: text('code').notNull().unique(),
	fullName: text('full_name').notNull(),
	/** Ngày nhập ngũ YYYY-MM-DD */
	enlistmentDate: text('enlistment_date'),
	/** Tuyển dụng (đợt / hình thức) */
	recruitment: text('recruitment'),
	objectType: text('object_type').notNull().$type<LeaveObjectType>(),
	rank: text('rank'),
	position: text('position'),
	classId: int('class_id'),
	/** FK leave_units.id (ưu tiên) hoặc units.id */
	unitId: int('unit_id'),
	unitName: text('unit_name'),
	hometown: text('hometown'),
	permanentResidence: text('permanent_residence'),
	/** Liên kết user đăng nhập (optional) */
	userId: int('user_id'),
	/** Email nhận thông báo duyệt / trả đơn */
	email: text('email'),
	/** Chỉ huy cơ quan (user id) — nhận đơn đề xuất bước 1 */
	commanderUserId: int('commander_user_id'),
	/** Tên chỉ huy (cache) */
	commanderName: text('commander_name'),
	className: text('class_name'),
	managementArea: text('management_area').notNull().default('cán_bộ')
})

/** Cây địa phương: Tỉnh → Xã/Phường → Thôn */
export const leaveLocalities = sqliteTable('leave_localities', {
	...baseSchema,
	name: text('name').notNull(),
	level: text('level').notNull().$type<LeaveLocalityLevel>(),
	parentId: int('parent_id'),
	code: text('code')
})

/**
 * Quy định / tiêu chuẩn phép hằng năm (và SPECIAL).
 * ANNUAL: object_type + min/max service years → base days
 * SPECIAL: rule riêng (base_days cấu hình)
 */
export const leaveRegulations = sqliteTable('leave_regulations', {
	...baseSchema,
	leaveType: text('leave_type').notNull().$type<LeaveType>(),
	objectType: text('object_type').$type<LeaveObjectType | null>(),
	/** Thâm niên từ (năm), inclusive; null = không giới hạn dưới */
	minYears: int('min_years'),
	/** Thâm niên đến (năm), exclusive; null = không giới hạn trên */
	maxYears: int('max_years'),
	baseDays: int('base_days').notNull(),
	label: text('label'),
	description: text('description'),
	isActive: int('is_active', { mode: 'boolean' }).notNull().default(true)
})

/** Đơn / danh sách phép (workflow) */
export const leaveRequests = sqliteTable('leave_requests', {
	...baseSchema,
	leaveType: text('leave_type').notNull().$type<LeaveType>(),
	requestScope: text('request_scope').notNull().default('OTHER'),
	classId: int('class_id'),
	className: text('class_name'),
	status: text('status')
		.notNull()
		.default('PENDING')
		.$type<LeaveRequestStatus>(),
	personnelId: int('personnel_id'),
	personnelCode: text('personnel_code'),
	personnelName: text('personnel_name'),
	objectType: text('object_type').notNull().$type<LeaveObjectType>(),
	rank: text('rank'),
	/** Snapshot chức vụ từ hồ sơ QN */
	position: text('position'),
	/** Snapshot ngày nhập ngũ / tuyển dụng */
	enlistmentDate: text('enlistment_date'),
	unitId: int('unit_id'),
	unitName: text('unit_name'),
	/** Thâm niên (năm) tại thời điểm đề xuất (theo ngày bắt đầu nghỉ) */
	serviceYears: int('service_years').notNull().default(0),
	baseDays: int('base_days').notNull().default(0),
	/** Ngày đi đường */
	travelDays: int('travel_days').notNull().default(0),
	/** 0 | 5 | 10 */
	extraDays: int('extra_days').notNull().default(0),
	/** JSON string[] reason codes */
	extraReasons: text('extra_reasons').default('[]'),
	totalDays: int('total_days').notNull().default(0),
	startDate: text('start_date'),
	endDate: text('end_date'),
	leaveYear: text('leave_year'),
	/** Nơi đăng ký nghỉ phép (thôn / xã / tỉnh) */
	localityId: int('locality_id'),
	localityPath: text('locality_path'),
	note: text('note'),
	proposedByUserId: int('proposed_by_user_id'),
	proposedByUsername: text('proposed_by_username'),
	proposedByDisplayName: text('proposed_by_display_name'),
	/** Email người đề xuất (snapshot) */
	proposerEmail: text('proposer_email'),
	/** Chỉ huy cơ quan phụ trách đơn này */
	commanderUserId: int('commander_user_id'),
	commanderName: text('commander_name'),
	adminNote: text('admin_note'),
	decidedByUserId: int('decided_by_user_id'),
	decidedByUsername: text('decided_by_username'),
	decidedAt: text('decided_at')
})

/** Nhật ký gửi mail (để kiểm tra khi SMTP dev / lỗi) */
export const leaveMailLog = sqliteTable('leave_mail_log', {
	...baseSchema,
	requestId: int('request_id'),
	toEmail: text('to_email').notNull(),
	subject: text('subject').notNull(),
	body: text('body'),
	mode: text('mode'),
	ok: int('ok', { mode: 'boolean' }).notNull().default(false),
	error: text('error'),
	previewUrl: text('preview_url'),
	/** DECISION | SUBMITTED | TEST | ... */
	kind: text('kind')
})

/**
 * Thông báo in-app cho chỉ huy / CQQL / người đề xuất (duyệt phép).
 */
export const leaveAlerts = sqliteTable('leave_alerts', {
	...baseSchema,
	userId: int('user_id').notNull(),
	requestId: int('request_id').notNull(),
	/** NEED_COMMANDER | NEED_AGENCY | DECIDED | RETURNED */
	kind: text('kind').notNull(),
	title: text('title').notNull(),
	message: text('message').notNull(),
	readAt: text('read_at')
})

/**
 * Bảng lưu thông tin nghỉ phép (lưu trữ / tra cứu).
 * Khi giải quyết phép (ký phê duyệt) → đẩy snapshot vào đây.
 */
export const leaveRecords = sqliteTable('leave_records', {
	...baseSchema,
	requestId: int('request_id').notNull(),
	/** Snapshot trạng thái đơn (ghi khi gửi duyệt, cập nhật khi xử lý) */
	status: text('status')
		.notNull()
		.default('PENDING')
		.$type<LeaveRequestStatus>(),
	leaveType: text('leave_type').notNull().$type<LeaveType>(),
	personnelId: int('personnel_id'),
	personnelCode: text('personnel_code'),
	personnelName: text('personnel_name'),
	objectType: text('object_type').notNull().$type<LeaveObjectType>(),
	rank: text('rank'),
	position: text('position'),
	enlistmentDate: text('enlistment_date'),
	unitId: int('unit_id'),
	unitName: text('unit_name'),
	serviceYears: int('service_years').notNull().default(0),
	baseDays: int('base_days').notNull().default(0),
	travelDays: int('travel_days').notNull().default(0),
	extraDays: int('extra_days').notNull().default(0),
	extraReasons: text('extra_reasons').default('[]'),
	totalDays: int('total_days').notNull().default(0),
	startDate: text('start_date'),
	endDate: text('end_date'),
	leaveYear: text('leave_year'),
	localityId: int('locality_id'),
	localityPath: text('locality_path'),
	note: text('note'),
	adminNote: text('admin_note'),
	proposedByUserId: int('proposed_by_user_id'),
	proposedByUsername: text('proposed_by_username'),
	proposedByDisplayName: text('proposed_by_display_name'),
	decidedByUserId: int('decided_by_user_id'),
	decidedByUsername: text('decided_by_username'),
	decidedAt: text('decided_at'),
	archivedAt: text('archived_at').notNull()
})

export interface LeaveObjectTypeDB extends Base {
	code: string
	name: string
	sortOrder: number
	isActive: boolean
}

export interface LeaveUnitDB extends Base {
	code: string | null
	name: string
	parentId: number | null
	isActive: boolean
}

export interface LeaveExtraStandardDB extends Base {
	code: string
	label: string
	days: number
	sortOrder: number
	isActive: boolean
}

export interface LeavePersonnelDB extends Base {
	code: string
	fullName: string
	enlistmentDate: string | null
	recruitment: string | null
	objectType: LeaveObjectType
	rank: string | null
	position: string | null
	unitId: number | null
	unitName: string | null
	hometown: string | null
	permanentResidence: string | null
	userId: number | null
	email: string | null
	commanderUserId: number | null
	commanderName: string | null
}

export interface LeaveLocalityDB extends Base {
	name: string
	level: LeaveLocalityLevel
	parentId: number | null
	code: string | null
}

export interface LeaveRegulationDB extends Base {
	leaveType: LeaveType
	objectType: LeaveObjectType | null
	minYears: number | null
	maxYears: number | null
	baseDays: number
	label: string | null
	description: string | null
	isActive: boolean
}

export interface LeaveRequestDB extends Base {
	leaveType: LeaveType
	status: LeaveRequestStatus
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: LeaveObjectType
	rank: string | null
	position: string | null
	enlistmentDate: string | null
	unitId: number | null
	unitName: string | null
	serviceYears: number
	baseDays: number
	travelDays: number
	extraDays: number
	extraReasons: string | null
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
	adminNote: string | null
	decidedByUserId: number | null
	decidedByUsername: string | null
	decidedAt: string | null
}

export interface LeaveRecordDB extends Base {
	requestId: number
	status: LeaveRequestStatus
	leaveType: LeaveType
	personnelId: number | null
	personnelCode: string | null
	personnelName: string | null
	objectType: LeaveObjectType
	rank: string | null
	position: string | null
	enlistmentDate: string | null
	unitId: number | null
	unitName: string | null
	serviceYears: number
	baseDays: number
	travelDays: number
	extraDays: number
	extraReasons: string | null
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
}
