/**
 * Phân hệ Quản lý đề thi tự luận
 *
 * Danh mục đào tạo (khớp sheet Tổng hợp mã môn):
 *   Hệ (chỉ 2: Quân sự A / Dân sự B)
 *     → Ngành (cột: Y sĩ đa khoa TC/CD/LT, Điều dưỡng, Dược…)
 *   Khoa (K1…K8) → Môn học dùng chung
 *   Ngành ↔ Môn học là quan hệ nhiều-nhiều.
 *
 * Mã ngành: {A|B}_{TC|CD|LT}{viết_tắt} — vd B_CDDD
 * Mã môn: {mã_ngành}_{mã_gốc} — vd B_CDDD_M009K2
 */
import { sql } from 'drizzle-orm'
import {
	index,
	int,
	sqliteTable,
	text,
	uniqueIndex
} from 'drizzle-orm/sqlite-core'
import { baseSchema } from './base'

/** DRAFT | PENDING_DEPT | PENDING_EXAM_OFFICE | PENDING_BGH | APPROVED | RETURNED | REJECTED */
export type ExamStatus =
	| 'DRAFT'
	| 'PENDING_DEPT'
	| 'PENDING_EXAM_OFFICE'
	| 'PENDING_BGH'
	| 'APPROVED'
	| 'RETURNED'
	| 'REJECTED'

/** EVEN | ODD — loại đề chẵn/lẻ khi bốc */
export type ExamDrawType = 'EVEN' | 'ODD'

/**
 * Hệ đào tạo — chỉ 2 cấp trên đầu sheet:
 *   QS / letter A = Hệ quân sự
 *   DS / letter B = Hệ dân sự
 */
export const examSystems = sqliteTable('exam_systems', {
	...baseSchema,
	/** QS | DS */
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	/** A | B — prefix mã ngành */
	letter: text('letter').notNull().unique(),
	/** Tương thích DB hiện tại: exam_systems.training_type_id là NOT NULL */
	trainingTypeId: int('training_type_id').notNull(),
	description: text('description')
})

/**
 * Ngành đào tạo thuộc một hệ (cột trên sheet tổng hợp).
 * Tên vd «Y sĩ đa khoa (trung cấp)»; trình độ gắn trong ngành (levelCode).
 * Mã nội bộ dùng chính mã số duy nhất — vd B.6720301. Mã ngành quốc gia
 * có thể trùng giữa nhiều chương trình trong cùng một hệ.
 */
export const examMajors = sqliteTable(
	'exam_majors',
	{
		...baseSchema,
		code: text('code').notNull().unique(),
		name: text('name').notNull(),
		systemId: int('system_id').notNull(),
		/** TC | CD | LT — trình độ trong tên ngành */
		levelCode: text('level_code'),
		/** Viết tắt ngành (DD, YSDK, DUOC…) */
		shortCode: text('short_code'),
		/** Mã số chương trình hiển thị, vd A.6720101 */
		catalogNumber: text('catalog_number'),
		/** Mã ngành theo danh mục Bộ GDĐT, vd 6720101; được phép trùng. */
		nationalMajorCode: text('national_major_code'),
		qualification: text('qualification'),
		trainingDuration: text('training_duration'),
		trainingForm: text('training_form'),
		description: text('description')
	},
	(t) => ({
		catalogNumberUnique: uniqueIndex(
			'exam_majors_catalog_number_unique'
		).on(t.catalogNumber)
	})
)

/**
 * Khoa là danh mục độc lập. Mỗi môn thuộc một khoa; ngành chọn môn
 * thông qua examMajorSubjects và không sở hữu khoa.
 */
export const examFaculties = sqliteTable(
	'exam_faculties',
	{
		...baseSchema,
		code: text('code').notNull(),
		shortCode: text('short_code'),
		name: text('name').notNull(),
		majorId: int('major_id'),
		description: text('description')
	},
	(t) => ({
		codeIdx: uniqueIndex('exam_faculties_code_unique').on(t.code)
	})
)

/** Môn học dùng trong một hoặc nhiều ngành đào tạo. */
export const examMajorSubjects = sqliteTable(
	'exam_major_subjects',
	{
		majorId: int('major_id').notNull(),
		subjectId: int('subject_id').notNull()
	},
	(t) => ({
		pk: uniqueIndex('exam_major_subjects_unique').on(
			t.majorId,
			t.subjectId
		),
		majorIdx: index('exam_major_subjects_major_idx').on(t.majorId),
		subjectIdx: index('exam_major_subjects_subject_idx').on(t.subjectId)
	})
)

/**
 * Danh mục lớp thi — không dùng bảng `classes` (học viên).
 */
export const examClasses = sqliteTable('exam_classes', {
	...baseSchema,
	code: text('code').notNull().unique(),
	name: text('name').notNull(),
	majorId: int('major_id'),
	facultyId: int('faculty_id'),
	cohort: text('cohort'),
	description: text('description')
})

/**
 * Môn học thuộc khoa.
 * code = full (B.6720301_M009K2), baseCode = mã gốc file (M009K2)
 * majorId denormalized từ faculty để join đề thi / CNK.
 */
export const examSubjects = sqliteTable('exam_subjects', {
	...baseSchema,
	code: text('code').notNull().unique(),
	/** Mã gốc trong khung (M009K2) */
	baseCode: text('base_code'),
	name: text('name').notNull(),
	creditHours: int('credit_hours').default(0),
	lessonHours: int('lesson_hours').default(0),
	facultyId: int('faculty_id').notNull(),
	/** Denormalized — ngành (từ khoa) để lọc / CNK */
	majorId: int('major_id'),
	description: text('description')
})

/** Phân công giảng dạy: GV – môn – lớp (do khoa / admin quản) */
export const examTeachingAssignments = sqliteTable(
	'exam_teaching_assignments',
	{
		...baseSchema,
		subjectId: int('subject_id').notNull(),
		/** Lớp thi (exam_classes) — tùy chọn */
		classId: int('class_id'),
		userId: int('user_id').notNull(),
		username: text('username'),
		displayName: text('display_name'),
		note: text('note'),
		/** Thời gian giảng dạy (YYYY-MM-DD) — hết hạn → không import đề lớp này */
		teachingStart: text('teaching_start'),
		teachingEnd: text('teaching_end'),
		/** Ai phân công */
		assignedByUserId: int('assigned_by_user_id'),
		assignedByUsername: text('assigned_by_username'),
		assignedByDisplayName: text('assigned_by_display_name')
	}
)

/** Log phân công / gỡ / sửa phân công môn học */
export const examTeachingAssignmentLogs = sqliteTable(
	'exam_teaching_assignment_logs',
	{
		...baseSchema,
		/** ASSIGN | UNASSIGN | UPDATE */
		action: text('action').notNull(),
		subjectId: int('subject_id'),
		subjectCode: text('subject_code'),
		subjectName: text('subject_name'),
		majorId: int('major_id'),
		majorCode: text('major_code'),
		facultyId: int('faculty_id'),
		facultyCode: text('faculty_code'),
		classId: int('class_id'),
		classCode: text('class_code'),
		className: text('class_name'),
		teacherUserId: int('teacher_user_id'),
		teacherUsername: text('teacher_username'),
		teacherDisplayName: text('teacher_display_name'),
		note: text('note'),
		actorUserId: int('actor_user_id'),
		actorUsername: text('actor_username'),
		actorDisplayName: text('actor_display_name'),
		summary: text('summary').notNull()
	}
)

/**
 * Danh mục giáo viên theo khoa (K1…K8).
 * Mỗi user chỉ 1 dòng (không trùng) — thuộc đúng 1 khoa.
 */
export const examTeachers = sqliteTable(
	'exam_teachers',
	{
		...baseSchema,
		userId: int('user_id').notNull(),
		username: text('username'),
		displayName: text('display_name'),
		/** Mã khoa trong DMĐT: K1…K8 (không dùng faculty_id vì lặp theo ngành) */
		facultyCode: text('faculty_code').notNull(),
		facultyName: text('faculty_name'),
		/** Chức danh giảng dạy, tham chiếu exam_academic_titles */
		academicTitleId: int('academic_title_id'),
		note: text('note'),
		createdByUserId: int('created_by_user_id'),
		createdByUsername: text('created_by_username'),
		createdByDisplayName: text('created_by_display_name')
	},
	(t) => ({
		uqUser: uniqueIndex('exam_teachers_user_uq').on(t.userId)
	})
)

/** Danh mục chức danh giảng dạy và định mức quy đổi (%). */
export const examAcademicTitles = sqliteTable(
	'exam_academic_titles',
	{
		...baseSchema,
		name: text('name').notNull(),
		percentage: int('percentage').notNull(),
		sortOrder: int('sort_order').notNull().default(0)
	},
	(t) => ({ uqName: uniqueIndex('exam_academic_titles_name_uq').on(t.name) })
)

/**
 * Phân công Chủ nhiệm khoa (CNK) — theo ngành (legacy / bổ sung).
 * Ưu tiên: exam_faculty_heads (1 CNK / khoa dùng chung nhiều ngành).
 * Cột timestamp theo migration 0032 (snake_case), khác baseSchema camelCase.
 */
export const examMajorHeads = sqliteTable('exam_major_heads', {
	id: int('id').primaryKey({ autoIncrement: true }),
	createdAt: text('created_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text('updated_at')
		.notNull()
		.default(sql`(datetime('now'))`),
	majorId: int('major_id').notNull(),
	userId: int('user_id').notNull(),
	username: text('username'),
	displayName: text('display_name'),
	note: text('note')
})

/**
 * Phân công Chủ nhiệm khoa theo mã khoa (K1…K8).
 * 1 CNK / khoa — duyệt mọi môn thuộc khoa đó (mọi ngành/hệ).
 */
export const examFacultyHeads = sqliteTable(
	'exam_faculty_heads',
	{
		id: int('id').primaryKey({ autoIncrement: true }),
		createdAt: text('created_at')
			.notNull()
			.default(sql`(datetime('now'))`),
		updatedAt: text('updated_at')
			.notNull()
			.default(sql`(datetime('now'))`),
		/** Mã khoa DMĐT: K1…K8 */
		facultyCode: text('faculty_code').notNull(),
		facultyName: text('faculty_name'),
		userId: int('user_id').notNull(),
		username: text('username'),
		displayName: text('display_name'),
		note: text('note')
	},
	(t) => ({
		uq: uniqueIndex('exam_faculty_heads_user_fac_uq').on(
			t.userId,
			t.facultyCode
		)
	})
)

/**
 * Đề thi
 * status: DRAFT → PENDING_DEPT → PENDING_EXAM_OFFICE → PENDING_BGH → APPROVED
 */
export const exams = sqliteTable('exams', {
	...baseSchema,
	code: text('code').notNull().unique(),
	title: text('title').notNull(),
	subjectId: int('subject_id').notNull(),
	paperNumber: int('paper_number'),
	status: text('status').notNull().default('DRAFT'),
	createdByUserId: int('created_by_user_id'),
	createdByUsername: text('created_by_username'),
	createdByDisplayName: text('created_by_display_name'),
	approvedByUserId: int('approved_by_user_id'),
	approvedByUsername: text('approved_by_username'),
	approvedByDisplayName: text('approved_by_display_name'),
	approvedAt: text('approved_at'),
	/** Cấp bậc người ký BGH (vd Thượng tá) */
	approvedByRank: text('approved_by_rank'),
	/** Chức vụ (Hiệu trưởng / Phó hiệu trưởng …) */
	approvedByPosition: text('approved_by_position'),
	/** Ảnh chữ ký số lúc phê duyệt */
	approvedBySignatureUrl: text('approved_by_signature_url'),
	/** Nhãn ký: HIỆU TRƯỞNG | PHÓ HIỆU TRƯỞNG | KT. HIỆU TRƯỞNG */
	approvedByTitle: text('approved_by_title'),
	/** CNK duyệt bước 1 — chèn chữ ký «CHỦ NHIỆM KHOA» trên bộ đề */
	deptHeadUserId: int('dept_head_user_id'),
	deptHeadUsername: text('dept_head_username'),
	deptHeadDisplayName: text('dept_head_display_name'),
	deptHeadRank: text('dept_head_rank'),
	deptHeadSignatureUrl: text('dept_head_signature_url'),
	deptHeadApprovedAt: text('dept_head_approved_at'),
	qrCode: text('qr_code'),
	locked: int('locked', { mode: 'boolean' }).notNull().default(false),
	/** Lớp thi khi GV import đề */
	classId: int('class_id'),
	className: text('class_name'),
	/** Thời gian thi (phút) — mặc định 60 */
	durationMinutes: int('duration_minutes').default(60),
	questionFileUrl: text('question_file_url'),
	questionFileName: text('question_file_name'),
	answerFileUrl: text('answer_file_url'),
	answerFileName: text('answer_file_name'),
	note: text('note'),
	returnNote: text('return_note')
})

export const examQuestions = sqliteTable('exam_questions', {
	...baseSchema,
	examId: int('exam_id').notNull(),
	questionNumber: int('question_number').notNull().default(1),
	content: text('content').notNull(),
	answer: text('answer'),
	points: int('points').notNull().default(1)
})

export const examWorkflowLogs = sqliteTable('exam_workflow_logs', {
	...baseSchema,
	examId: int('exam_id').notNull(),
	action: text('action').notNull(),
	fromStatus: text('from_status'),
	toStatus: text('to_status'),
	note: text('note'),
	actorUserId: int('actor_user_id'),
	actorUsername: text('actor_username'),
	actorDisplayName: text('actor_display_name')
})

export const examDraws = sqliteTable('exam_draws', {
	...baseSchema,
	drawCode: text('draw_code').notNull().unique(),
	examId: int('exam_id').notNull(),
	examCode: text('exam_code'),
	paperNumber: int('paper_number'),
	subjectId: int('subject_id'),
	majorId: int('major_id'),
	drawType: text('draw_type').notNull(),
	classId: int('class_id'),
	className: text('class_name'),
	drawnByUserId: int('drawn_by_user_id'),
	drawnByUsername: text('drawn_by_username'),
	drawnByDisplayName: text('drawn_by_display_name'),
	drawnAt: text('drawn_at').notNull(),
	printedAt: text('printed_at'),
	printedByUserId: int('printed_by_user_id'),
	printedByUsername: text('printed_by_username'),
	/** true = quá 3 ngày kể từ ngày rút → không cho in */
	printBlocked: int('print_blocked', { mode: 'boolean' })
		.notNull()
		.default(false),
	printBlockedAt: text('print_blocked_at'),
	printBlockedReason: text('print_blocked_reason'),
	examDate: text('exam_date'),
	examTime: text('exam_time'),
	location: text('location'),
	note: text('note')
})

export const examDrawLogs = sqliteTable('exam_draw_logs', {
	...baseSchema,
	drawId: int('draw_id'),
	action: text('action').notNull(),
	summary: text('summary').notNull(),
	details: text('details'),
	actorUserId: int('actor_user_id'),
	actorUsername: text('actor_username'),
	actorDisplayName: text('actor_display_name')
})
