/**
 * Phân công môn học + danh mục giáo viên theo khoa.
 * Khoa/CNK + admin.cdhc2: xem & chỉnh.
 * BGH: chỉ xem.
 *
 * Danh mục GV: mỗi user 1 dòng (không trùng), thuộc 1 khoa (K1…K8).
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, asc, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm'
import orm from '../database'
import {
	examAcademicTitles,
	examClasses,
	examFaculties,
	examFacultyHeads,
	examMajors,
	examSubjects,
	examSystems,
	examTeachers,
	examTeachingAssignmentLogs,
	examTeachingAssignments
} from '../schema/exam-bank'
import { users } from '../schema/users'
import { userRoles } from '../schema/user-roles'
import { roles } from '../schema/roles'
import {
	canDeptHeadAccessSubject,
	canManageTeachingAssignments,
	canViewTeachingAssignments,
	getActor,
	getDeptHeadFacultyCodes,
	getDeptHeadMajorIds,
	getTeachingPeriodStatus,
	isClassCohortExpired,
	isLecturer,
	isScopedDeptHead,
	isTeachingPeriodInactive,
	type TeachingPeriodStatus
} from './helpers'

/**
 * Mã khoa CNK được quản — null = không giới hạn (super / KT / BGH).
 * Ưu tiên exam_faculty_heads (K1…K8), không lấy mọi khoa của ngành
 * (tránh CNK K7 thấy GV/phân công K1…K8).
 * Fallback legacy: major_heads → các mã khoa thuộc ngành đó.
 */
async function getScopedFacultyCodes(
	actor: Awaited<ReturnType<typeof getActor>>
): Promise<string[] | null> {
	if (!isScopedDeptHead(actor)) return null

	const facCodes = await getDeptHeadFacultyCodes(actor)
	if (facCodes && facCodes.length) {
		return facCodes
			.map((c) => String(c).trim().toUpperCase())
			.filter(Boolean)
	}

	// Legacy: chỉ gán theo ngành → mọi khoa thuộc các ngành đó
	const majorIds = await getDeptHeadMajorIds(actor)
	if (majorIds === null) return null
	if (!majorIds.length) return []
	const facs = await orm
		.select({ code: examFaculties.code })
		.from(examFaculties)
		.where(inArray(examFaculties.majorId, majorIds))
	return [
		...new Set(
			facs
				.map((f) =>
					String(f.code || '')
						.trim()
						.toUpperCase()
				)
				.filter(Boolean)
		)
	]
}

async function resolveFacultyName(facultyCode: string): Promise<string | null> {
	const [row] = await orm
		.select({ name: examFaculties.name })
		.from(examFaculties)
		.where(eq(examFaculties.code, facultyCode))
		.limit(1)
	return row?.name ?? null
}

async function ensureLecturerRole(userId: number) {
	const [role] = await orm
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.name, 'exam_lecturer'))
		.limit(1)
	if (!role) return
	const [has] = await orm
		.select({ userId: userRoles.userId })
		.from(userRoles)
		.where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
		.limit(1)
	if (!has) {
		await orm.insert(userRoles).values({ userId, roleId: role.id })
	}
}

/** Role CNK (exam_dept_head) — gắn tài khoản Chủ nhiệm khoa */
async function ensureDeptHeadRole(userId: number) {
	const [role] = await orm
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.name, 'exam_dept_head'))
		.limit(1)
	if (!role) return
	const [has] = await orm
		.select({ userId: userRoles.userId })
		.from(userRoles)
		.where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
		.limit(1)
	if (!has) {
		await orm.insert(userRoles).values({ userId, roleId: role.id })
	}
}

async function releaseDeptHeadRoleIfUnused(userId: number) {
	const [stillHead] = await orm
		.select({ id: examFacultyHeads.id })
		.from(examFacultyHeads)
		.where(eq(examFacultyHeads.userId, userId))
		.limit(1)
	if (stillHead) return
	const [role] = await orm
		.select({ id: roles.id })
		.from(roles)
		.where(eq(roles.name, 'exam_dept_head'))
		.limit(1)
	if (role) {
		await orm
			.delete(userRoles)
			.where(
				and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id))
			)
	}
	const [teacher] = await orm
		.select({ id: examTeachers.id })
		.from(examTeachers)
		.where(eq(examTeachers.userId, userId))
		.limit(1)
	if (teacher) {
		await orm
			.update(users)
			.set({ position: 'Giáo viên' })
			.where(eq(users.id, userId))
	}
}

function isFacultyHeadTitle(name: string) {
	return /^Chủ nhiệm khoa(?:,|$)/i.test(name.trim())
}

/** Đồng bộ phân công CNK từ chức danh của giáo viên. */
async function assignFacultyHeadFromTeacher(
	user: typeof users.$inferSelect,
	facultyCode: string,
	facultyName: string
) {
	await ensureDeptHeadRole(user.id)
	const displaced = await orm
		.select({ userId: examFacultyHeads.userId })
		.from(examFacultyHeads)
		.where(
			and(
				eq(examFacultyHeads.facultyCode, facultyCode),
				ne(examFacultyHeads.userId, user.id)
			)
		)
	await orm
		.delete(examFacultyHeads)
		.where(
			or(
				and(
					eq(examFacultyHeads.facultyCode, facultyCode),
					ne(examFacultyHeads.userId, user.id)
				),
				and(
					eq(examFacultyHeads.userId, user.id),
					ne(examFacultyHeads.facultyCode, facultyCode)
				)
			)!
		)
	const [existing] = await orm
		.select()
		.from(examFacultyHeads)
		.where(
			and(
				eq(examFacultyHeads.userId, user.id),
				eq(examFacultyHeads.facultyCode, facultyCode)
			)
		)
		.limit(1)
	if (existing) {
		await orm
			.update(examFacultyHeads)
			.set({
				username: user.username,
				displayName: user.displayName,
				facultyName,
				updatedAt: sql`(datetime('now'))`
			})
			.where(eq(examFacultyHeads.id, existing.id))
	} else {
		await orm.insert(examFacultyHeads).values({
			facultyCode,
			facultyName,
			userId: user.id,
			username: user.username,
			displayName: user.displayName
		})
	}
	for (const old of displaced) await releaseDeptHeadRoleIfUnused(old.userId)
}

async function removeFacultyHeadAssignment(userId: number) {
	await orm
		.delete(examFacultyHeads)
		.where(eq(examFacultyHeads.userId, userId))
	await releaseDeptHeadRoleIfUnused(userId)
}

/** Chức vụ gắn TK đào tạo — khóa đổi lung tung */
const LOCKED_TRAINING_POSITIONS = ['Chủ nhiệm khoa', 'Giáo viên'] as const

async function lockTrainingUserProfile(
	userId: number,
	position: (typeof LOCKED_TRAINING_POSITIONS)[number]
) {
	await orm
		.update(users)
		.set({
			position,
			unitId: null
		})
		.where(eq(users.id, userId))
}

export interface AssignmentRow {
	id: number
	createdAt: string
	updatedAt: string
	subjectId: number
	subjectCode: string | null
	subjectName: string | null
	baseCode: string | null
	/** Hệ → Ngành → Khoa → Môn → Lớp */
	systemId: number | null
	systemCode: string | null
	systemName: string | null
	majorId: number | null
	majorCode: string | null
	majorName: string | null
	facultyId: number | null
	facultyCode: string | null
	facultyName: string | null
	classId: number | null
	classCode: string | null
	className: string | null
	/** YYYY-MM-DD */
	teachingStart: string | null
	/** YYYY-MM-DD */
	teachingEnd: string | null
	/** ACTIVE | EXPIRED | UPCOMING */
	teachingStatus: TeachingPeriodStatus
	teachingStatusLabel: string
	userId: number
	username: string | null
	displayName: string | null
	/** Khoa trong danh mục GV (exam_teachers) — để UI chỉ hiện đúng khoa */
	teacherFacultyCode: string | null
	teacherFacultyName: string | null
	note: string | null
	assignedByUserId: number | null
	assignedByUsername: string | null
	assignedByDisplayName: string | null
}

export interface AssignmentLogRow {
	id: number
	createdAt: string
	action: string
	subjectId: number | null
	subjectCode: string | null
	subjectName: string | null
	majorCode: string | null
	facultyCode: string | null
	classId: number | null
	classCode: string | null
	className: string | null
	teacherUserId: number | null
	teacherUsername: string | null
	teacherDisplayName: string | null
	note: string | null
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	summary: string
}

export interface TeacherOption {
	id: number
	username: string
	displayName: string | null
}

export const ListExamAssignments = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/assignments' },
	async (q: {
		subjectId?: Query<number>
		userId?: Query<number>
		majorId?: Query<number>
		facultyId?: Query<number>
		classId?: Query<number>
		/** GV: chỉ phân công của mình (soạn đề theo hệ/ngành/khoa/lớp) */
		mine?: Query<boolean>
		q?: Query<string>
	}): Promise<{ data: AssignmentRow[] }> => {
		const actor = await getActor()
		const wantMine =
			q.mine === true ||
			String(q.mine) === 'true' ||
			(!canViewTeachingAssignments(actor) && isLecturer(actor))

		if (!canViewTeachingAssignments(actor) && !wantMine) {
			throw APIError.permissionDenied('Không có quyền xem phân công môn')
		}
		// GV thuần chỉ được xem phân công của chính mình
		if (
			wantMine &&
			!canViewTeachingAssignments(actor) &&
			!isLecturer(actor)
		) {
			throw APIError.permissionDenied('Không có quyền xem phân công môn')
		}

		const conditions = []
		if (wantMine && !canManageTeachingAssignments(actor)) {
			// GV / BGH xem «mine» → khóa userId
			conditions.push(eq(examTeachingAssignments.userId, actor.userId))
		} else if (q.userId) {
			conditions.push(
				eq(examTeachingAssignments.userId, Number(q.userId))
			)
		}
		if (q.subjectId)
			conditions.push(
				eq(examTeachingAssignments.subjectId, Number(q.subjectId))
			)
		if (q.classId)
			conditions.push(
				eq(examTeachingAssignments.classId, Number(q.classId))
			)
		if (q.majorId)
			conditions.push(eq(examSubjects.majorId, Number(q.majorId)))
		if (q.facultyId)
			conditions.push(eq(examSubjects.facultyId, Number(q.facultyId)))

		const kw = (q.q || '').trim()
		if (kw) {
			conditions.push(
				or(
					like(examSubjects.code, `%${kw}%`),
					like(examSubjects.name, `%${kw}%`),
					like(examTeachingAssignments.username, `%${kw}%`),
					like(examTeachingAssignments.displayName, `%${kw}%`),
					like(examMajors.code, `%${kw}%`),
					like(examClasses.code, `%${kw}%`),
					like(examClasses.name, `%${kw}%`)
				)!
			)
		}

		// CNK scoped: ưu tiên lọc theo KHOA phụ trách (không lộ khoa khác trong ngành)
		const facScope = await getScopedFacultyCodes(actor)
		if (facScope !== null) {
			if (!facScope.length) return { data: [] }
			conditions.push(
				sql`upper(${examFaculties.code}) in (${sql.join(
					facScope.map((c) => sql`${c}`),
					sql`, `
				)})`
			)
		}

		const where = conditions.length ? and(...conditions) : undefined
		const rows = await orm
			.select({
				id: examTeachingAssignments.id,
				createdAt: examTeachingAssignments.createdAt,
				updatedAt: examTeachingAssignments.updatedAt,
				subjectId: examTeachingAssignments.subjectId,
				classId: examTeachingAssignments.classId,
				userId: examTeachingAssignments.userId,
				username: examTeachingAssignments.username,
				displayName: examTeachingAssignments.displayName,
				note: examTeachingAssignments.note,
				teachingStart: examTeachingAssignments.teachingStart,
				teachingEnd: examTeachingAssignments.teachingEnd,
				assignedByUserId: examTeachingAssignments.assignedByUserId,
				assignedByUsername: examTeachingAssignments.assignedByUsername,
				assignedByDisplayName:
					examTeachingAssignments.assignedByDisplayName,
				subjectCode: examSubjects.code,
				subjectName: examSubjects.name,
				baseCode: examSubjects.baseCode,
				majorId: examSubjects.majorId,
				facultyId: examSubjects.facultyId,
				majorCode: examMajors.code,
				majorName: examMajors.name,
				systemId: examMajors.systemId,
				systemCode: examSystems.code,
				systemName: examSystems.name,
				facultyCode: examFaculties.code,
				facultyName: examFaculties.name,
				classCode: examClasses.code,
				className: examClasses.name,
				teacherFacultyCode: examTeachers.facultyCode,
				teacherFacultyName: examTeachers.facultyName
			})
			.from(examTeachingAssignments)
			.leftJoin(
				examSubjects,
				eq(examTeachingAssignments.subjectId, examSubjects.id)
			)
			.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
			.leftJoin(examSystems, eq(examMajors.systemId, examSystems.id))
			.leftJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.leftJoin(
				examClasses,
				eq(examTeachingAssignments.classId, examClasses.id)
			)
			.leftJoin(
				examTeachers,
				eq(examTeachingAssignments.userId, examTeachers.userId)
			)
			.where(where)
			.orderBy(
				asc(examSystems.name),
				asc(examMajors.name),
				asc(examFaculties.name),
				asc(examSubjects.name),
				asc(examClasses.name)
			)

		return {
			data: rows
				.filter((r) => {
					const subFac = (r.facultyCode || '').trim().toUpperCase()
					const teaFac = (r.teacherFacultyCode || '')
						.trim()
						.toUpperCase()
					// CNK scope: chỉ khoa phụ trách
					if (
						facScope !== null &&
						facScope.length &&
						subFac &&
						!facScope.includes(subFac)
					) {
						return false
					}
					// GV xem «mine»: luôn trả phân công của mình (để cascade Hệ/Ngành/Lớp)
					// — không ẩn vì thiếu/lệch khoa catalog (tránh đổ sai/ trống hệ ngành)
					if (wantMine) return true
					// List quản trị: chỉ giữ GV đúng khoa môn
					if (!subFac || !teaFac) return false
					if (subFac !== teaFac) return false
					return true
				})
				.map((r) => {
					const period = getTeachingPeriodStatus(
						r.teachingStart,
						r.teachingEnd
					)
					return {
						id: r.id,
						createdAt: r.createdAt,
						updatedAt: r.updatedAt,
						subjectId: r.subjectId,
						subjectCode: r.subjectCode ?? null,
						subjectName: r.subjectName ?? null,
						baseCode: r.baseCode ?? null,
						systemId: r.systemId ?? null,
						systemCode: r.systemCode ?? null,
						systemName: r.systemName ?? null,
						majorId: r.majorId ?? null,
						majorCode: r.majorCode ?? null,
						majorName: r.majorName ?? null,
						facultyId: r.facultyId ?? null,
						facultyCode: r.facultyCode ?? null,
						facultyName: r.facultyName ?? null,
						classId: r.classId ?? null,
						classCode: r.classCode ?? null,
						className: r.className ?? null,
						teachingStart: r.teachingStart ?? null,
						teachingEnd: r.teachingEnd ?? null,
						teachingStatus: period.status,
						teachingStatusLabel: period.statusLabel,
						userId: r.userId,
						username: r.username,
						displayName: r.displayName,
						teacherFacultyCode: r.teacherFacultyCode ?? null,
						teacherFacultyName: r.teacherFacultyName ?? null,
						note: r.note,
						assignedByUserId: r.assignedByUserId ?? null,
						assignedByUsername: r.assignedByUsername ?? null,
						assignedByDisplayName: r.assignedByDisplayName ?? null
					}
				})
		}
	}
)

/**
 * Lớp bắt buộc khi phân công — phải thuộc đúng ngành của môn.
 */
async function resolveClassForMajor(
	classId: number | null | undefined,
	majorId: number | null
): Promise<{ id: number; code: string; name: string }> {
	if (classId == null || !Number.isFinite(Number(classId))) {
		throw APIError.invalidArgument(
			'Phải chọn lớp khi phân công giảng dạy (Hệ → Ngành → Khoa → Môn → Lớp)'
		)
	}
	const [cls] = await orm
		.select({
			id: examClasses.id,
			code: examClasses.code,
			name: examClasses.name,
			majorId: examClasses.majorId,
			cohort: examClasses.cohort
		})
		.from(examClasses)
		.where(eq(examClasses.id, Number(classId)))
		.limit(1)
	if (!cls) throw APIError.notFound('Lớp không tồn tại trong danh mục')
	if (majorId == null) {
		throw APIError.failedPrecondition(
			'Môn chưa gắn ngành — không phân công được'
		)
	}
	if (cls.majorId != null && cls.majorId !== majorId) {
		throw APIError.invalidArgument('Lớp không thuộc ngành của môn đã chọn')
	}
	if (cls.majorId == null) {
		throw APIError.invalidArgument(
			'Lớp chưa gắn ngành — cập nhật danh mục lớp trước'
		)
	}
	if (isClassCohortExpired(cls.cohort)) {
		throw APIError.failedPrecondition(
			`Lớp «${cls.name}» đã hết niên khóa (${cls.cohort || '—'}) — không phân công giáo viên / gán môn cho lớp này`
		)
	}
	return { id: cls.id, code: cls.code, name: cls.name }
}

/**
 * GV phải có trong danh mục giáo viên và đúng khoa của môn.
 * - 1 GV → nhiều môn trong khoa, nhiều lớp: được phép
 * - 1 môn + 1 lớp → nhiều GV: được phép
 * - Chỉ chặn: cùng 1 người trùng đúng cặp (môn + lớp)
 */
async function assertTeacherMatchesFaculty(
	userId: number,
	facultyCode: string | null | undefined
): Promise<void> {
	const [t] = await orm
		.select({
			userId: examTeachers.userId,
			facultyCode: examTeachers.facultyCode,
			facultyName: examTeachers.facultyName,
			displayName: examTeachers.displayName
		})
		.from(examTeachers)
		.where(eq(examTeachers.userId, userId))
		.limit(1)
	if (!t) {
		throw APIError.failedPrecondition(
			'Giáo viên chưa có trong danh mục khoa — thêm tại «Danh mục giáo viên» trước khi phân công'
		)
	}
	const want = (facultyCode || '').trim().toUpperCase()
	const got = (t.facultyCode || '').trim().toUpperCase()
	if (!want) {
		throw APIError.failedPrecondition(
			'Môn chưa gán khoa — không thể phân công giáo viên'
		)
	}
	if (!got || want !== got) {
		throw APIError.invalidArgument(
			`Giáo viên thuộc ${t.facultyCode || '—'}${t.facultyName ? ` (${t.facultyName})` : ''}, ` +
				`không khớp khoa ${want} của môn — chỉ phân công GV đúng khoa`
		)
	}
}

function normalizeDateInput(
	v: string | null | undefined,
	field: string
): string | null {
	if (v == null || String(v).trim() === '') return null
	const d = String(v).trim().slice(0, 10)
	if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
		throw APIError.invalidArgument(
			`${field} phải dạng YYYY-MM-DD (vd 2025-09-01)`
		)
	}
	return d
}

function mapAssignmentRow(
	row: typeof examTeachingAssignments.$inferSelect,
	subj: {
		code: string | null
		name: string | null
		baseCode: string | null
		majorId: number | null
		majorCode: string | null
		majorName: string | null
		systemId: number | null
		systemCode: string | null
		systemName: string | null
		facultyId: number | null
		facultyCode: string | null
		facultyName: string | null
	},
	cls: { id: number; code: string; name: string },
	teacherFac?: { facultyCode: string | null; facultyName: string | null }
): AssignmentRow {
	const period = getTeachingPeriodStatus(row.teachingStart, row.teachingEnd)
	return {
		id: row.id,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		subjectId: row.subjectId,
		subjectCode: subj.code,
		subjectName: subj.name,
		baseCode: subj.baseCode,
		systemId: subj.systemId ?? null,
		systemCode: subj.systemCode ?? null,
		systemName: subj.systemName ?? null,
		majorId: subj.majorId,
		majorCode: subj.majorCode,
		majorName: subj.majorName,
		facultyId: subj.facultyId,
		facultyCode: subj.facultyCode,
		facultyName: subj.facultyName,
		classId: cls.id,
		classCode: cls.code,
		className: cls.name,
		teachingStart: row.teachingStart ?? null,
		teachingEnd: row.teachingEnd ?? null,
		teachingStatus: period.status,
		teachingStatusLabel: period.statusLabel,
		userId: row.userId,
		username: row.username,
		displayName: row.displayName,
		teacherFacultyCode: teacherFac?.facultyCode ?? subj.facultyCode ?? null,
		teacherFacultyName: teacherFac?.facultyName ?? subj.facultyName ?? null,
		note: row.note,
		assignedByUserId: row.assignedByUserId ?? null,
		assignedByUsername: row.assignedByUsername ?? null,
		assignedByDisplayName: row.assignedByDisplayName ?? null
	}
}

async function loadTeacherFaculty(userId: number): Promise<{
	facultyCode: string | null
	facultyName: string | null
}> {
	const [t] = await orm
		.select({
			facultyCode: examTeachers.facultyCode,
			facultyName: examTeachers.facultyName
		})
		.from(examTeachers)
		.where(eq(examTeachers.userId, userId))
		.limit(1)
	return {
		facultyCode: t?.facultyCode ?? null,
		facultyName: t?.facultyName ?? null
	}
}

export const CreateExamAssignment = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/assignments' },
	async (body: {
		subjectId: number
		userId: number
		/** Bắt buộc — phân công theo lớp */
		classId: number
		/** YYYY-MM-DD — bắt đầu giảng dạy */
		teachingStart?: string | null
		/** YYYY-MM-DD — kết thúc; hết hạn → không import đề lớp này */
		teachingEnd?: string | null
		note?: string
	}): Promise<{ data: AssignmentRow }> => {
		const actor = await getActor()
		if (!canManageTeachingAssignments(actor)) {
			throw APIError.permissionDenied(
				'Không có quyền phân công môn (BGH chỉ xem)'
			)
		}

		const [subj] = await orm
			.select({
				id: examSubjects.id,
				code: examSubjects.code,
				name: examSubjects.name,
				baseCode: examSubjects.baseCode,
				majorId: examSubjects.majorId,
				facultyId: examSubjects.facultyId,
				majorCode: examMajors.code,
				majorName: examMajors.name,
				systemId: examMajors.systemId,
				systemCode: examSystems.code,
				systemName: examSystems.name,
				facultyCode: examFaculties.code,
				facultyName: examFaculties.name
			})
			.from(examSubjects)
			.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
			.leftJoin(examSystems, eq(examMajors.systemId, examSystems.id))
			.leftJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.where(eq(examSubjects.id, body.subjectId))
			.limit(1)
		if (!subj) throw APIError.notFound('Môn học không tồn tại')

		// CNK chỉ phân công môn thuộc khoa (ưu tiên) / ngành mình
		if (isScopedDeptHead(actor)) {
			const ok = await canDeptHeadAccessSubject(actor, {
				majorId: subj.majorId,
				facultyCode: subj.facultyCode
			})
			if (!ok) {
				throw APIError.permissionDenied(
					'Môn không thuộc khoa/ngành bạn phụ trách'
				)
			}
		}

		const [u] = await orm
			.select()
			.from(users)
			.where(eq(users.id, body.userId))
			.limit(1)
		if (!u) throw APIError.notFound('Giáo viên không tồn tại')

		// Bắt buộc: đúng khoa (danh mục GV) + đúng lớp (ngành)
		await assertTeacherMatchesFaculty(body.userId, subj.facultyCode)
		const cls = await resolveClassForMajor(body.classId, subj.majorId)

		// 1 GV nhiều môn/lớp OK; nhiều GV cùng môn+lớp OK.
		// Chỉ chặn: cùng 1 GV + cùng môn + cùng lớp (trùng bản ghi).
		const [dup] = await orm
			.select({ id: examTeachingAssignments.id })
			.from(examTeachingAssignments)
			.where(
				and(
					eq(examTeachingAssignments.subjectId, body.subjectId),
					eq(examTeachingAssignments.userId, body.userId),
					eq(examTeachingAssignments.classId, cls.id)
				)
			)
			.limit(1)
		if (dup) {
			throw APIError.failedPrecondition(
				'GV này đã được phân công đúng môn + lớp này. Có thể gán cùng GV sang môn khác / lớp khác, hoặc thêm GV khác cho slot này.'
			)
		}

		const teachingStart = normalizeDateInput(
			body.teachingStart,
			'Ngày bắt đầu giảng dạy'
		)
		const teachingEnd = normalizeDateInput(
			body.teachingEnd,
			'Ngày kết thúc giảng dạy'
		)
		if (teachingStart && teachingEnd && teachingStart > teachingEnd) {
			throw APIError.invalidArgument(
				'Ngày bắt đầu không được sau ngày kết thúc giảng dạy'
			)
		}
		if (!teachingEnd) {
			throw APIError.invalidArgument(
				'Phải chọn ngày kết thúc thời gian giảng dạy'
			)
		}

		const [row] = await orm
			.insert(examTeachingAssignments)
			.values({
				subjectId: body.subjectId,
				classId: cls.id,
				userId: body.userId,
				username: u.username,
				displayName: u.displayName,
				note: body.note || null,
				teachingStart,
				teachingEnd,
				assignedByUserId: actor.userId,
				assignedByUsername: actor.username,
				assignedByDisplayName: actor.displayName
			})
			.returning()

		const classLabel = ` · lớp ${cls.name || cls.code}`
		const periodLabel = teachingEnd
			? ` · ${teachingStart || '…'}→${teachingEnd}`
			: ''
		const summary = `Phân công ${u.displayName || u.username} dạy ${subj.code} — ${subj.name}${classLabel}${periodLabel} (${subj.systemName || subj.systemCode || ''} / ${subj.majorName || subj.majorCode || ''} / ${subj.facultyName || subj.facultyCode || ''})`
		await orm.insert(examTeachingAssignmentLogs).values({
			action: 'ASSIGN',
			subjectId: subj.id,
			subjectCode: subj.code,
			subjectName: subj.name,
			majorId: subj.majorId,
			majorCode: subj.majorCode,
			facultyId: subj.facultyId,
			facultyCode: subj.facultyCode,
			classId: cls.id,
			classCode: cls.code,
			className: cls.name,
			teacherUserId: u.id,
			teacherUsername: u.username,
			teacherDisplayName: u.displayName,
			note: body.note || null,
			actorUserId: actor.userId,
			actorUsername: actor.username,
			actorDisplayName: actor.displayName,
			summary
		})

		const teacherFac = await loadTeacherFaculty(u.id)
		return {
			data: mapAssignmentRow(
				row!,
				{
					code: subj.code,
					name: subj.name,
					baseCode: subj.baseCode,
					majorId: subj.majorId,
					majorCode: subj.majorCode,
					majorName: subj.majorName,
					systemId: subj.systemId ?? null,
					systemCode: subj.systemCode ?? null,
					systemName: subj.systemName ?? null,
					facultyId: subj.facultyId,
					facultyCode: subj.facultyCode,
					facultyName: subj.facultyName
				},
				cls,
				teacherFac
			)
		}
	}
)

export const UpdateExamAssignment = api(
	{
		auth: true,
		expose: true,
		method: 'PUT',
		path: '/exam/assignments/:id'
	},
	async (params: {
		id: number
		subjectId?: number
		userId?: number
		classId?: number | null
		teachingStart?: string | null
		teachingEnd?: string | null
		note?: string | null
	}): Promise<{ data: AssignmentRow }> => {
		const actor = await getActor()
		if (!canManageTeachingAssignments(actor)) {
			throw APIError.permissionDenied(
				'Không có quyền sửa phân công (BGH chỉ xem)'
			)
		}

		const [existing] = await orm
			.select({
				id: examTeachingAssignments.id,
				subjectId: examTeachingAssignments.subjectId,
				classId: examTeachingAssignments.classId,
				userId: examTeachingAssignments.userId,
				username: examTeachingAssignments.username,
				displayName: examTeachingAssignments.displayName,
				note: examTeachingAssignments.note,
				teachingStart: examTeachingAssignments.teachingStart,
				teachingEnd: examTeachingAssignments.teachingEnd,
				assignedByUserId: examTeachingAssignments.assignedByUserId,
				assignedByUsername: examTeachingAssignments.assignedByUsername,
				assignedByDisplayName:
					examTeachingAssignments.assignedByDisplayName,
				createdAt: examTeachingAssignments.createdAt,
				updatedAt: examTeachingAssignments.updatedAt,
				majorId: examSubjects.majorId
			})
			.from(examTeachingAssignments)
			.leftJoin(
				examSubjects,
				eq(examTeachingAssignments.subjectId, examSubjects.id)
			)
			.where(eq(examTeachingAssignments.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Phân công không tồn tại')

		const subjectId = params.subjectId ?? existing.subjectId
		const userId = params.userId ?? existing.userId
		const classId =
			params.classId !== undefined ? params.classId : existing.classId
		const note = params.note !== undefined ? params.note : existing.note
		const teachingStart =
			params.teachingStart !== undefined
				? normalizeDateInput(
						params.teachingStart,
						'Ngày bắt đầu giảng dạy'
					)
				: (existing.teachingStart ?? null)
		const teachingEnd =
			params.teachingEnd !== undefined
				? normalizeDateInput(
						params.teachingEnd,
						'Ngày kết thúc giảng dạy'
					)
				: (existing.teachingEnd ?? null)
		if (teachingStart && teachingEnd && teachingStart > teachingEnd) {
			throw APIError.invalidArgument(
				'Ngày bắt đầu không được sau ngày kết thúc giảng dạy'
			)
		}
		if (!teachingEnd) {
			throw APIError.invalidArgument(
				'Phải chọn ngày kết thúc thời gian giảng dạy'
			)
		}

		const [subj] = await orm
			.select({
				id: examSubjects.id,
				code: examSubjects.code,
				name: examSubjects.name,
				baseCode: examSubjects.baseCode,
				majorId: examSubjects.majorId,
				facultyId: examSubjects.facultyId,
				majorCode: examMajors.code,
				majorName: examMajors.name,
				systemId: examMajors.systemId,
				systemCode: examSystems.code,
				systemName: examSystems.name,
				facultyCode: examFaculties.code,
				facultyName: examFaculties.name
			})
			.from(examSubjects)
			.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
			.leftJoin(examSystems, eq(examMajors.systemId, examSystems.id))
			.leftJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.where(eq(examSubjects.id, subjectId))
			.limit(1)
		if (!subj) throw APIError.notFound('Môn học không tồn tại')

		if (isScopedDeptHead(actor)) {
			const ok = await canDeptHeadAccessSubject(actor, {
				majorId: subj.majorId,
				facultyCode: subj.facultyCode
			})
			if (!ok) {
				throw APIError.permissionDenied(
					'Môn không thuộc khoa/ngành bạn phụ trách'
				)
			}
		}

		const [u] = await orm
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)
		if (!u) throw APIError.notFound('Giáo viên không tồn tại')

		await assertTeacherMatchesFaculty(userId, subj.facultyCode)
		const cls = await resolveClassForMajor(classId, subj.majorId)

		const [dup] = await orm
			.select({ id: examTeachingAssignments.id })
			.from(examTeachingAssignments)
			.where(
				and(
					eq(examTeachingAssignments.subjectId, subjectId),
					eq(examTeachingAssignments.userId, userId),
					eq(examTeachingAssignments.classId, cls.id),
					sql`${examTeachingAssignments.id} != ${params.id}`
				)
			)
			.limit(1)
		if (dup) {
			throw APIError.failedPrecondition(
				'Đã có phân công trùng (cùng GV + môn + lớp) — có thể gán GV khác cho cùng môn/lớp'
			)
		}

		const [row] = await orm
			.update(examTeachingAssignments)
			.set({
				subjectId,
				classId: cls.id,
				userId,
				username: u.username,
				displayName: u.displayName,
				note: note || null,
				teachingStart,
				teachingEnd
			})
			.where(eq(examTeachingAssignments.id, params.id))
			.returning()

		const classLabel = ` · lớp ${cls.name || cls.code}`
		const periodLabel = teachingEnd
			? ` · ${teachingStart || '…'}→${teachingEnd}`
			: ''
		const summary = `Sửa phân công ${u.displayName || u.username} → ${subj.code} — ${subj.name}${classLabel}${periodLabel}`
		await orm.insert(examTeachingAssignmentLogs).values({
			action: 'UPDATE',
			subjectId: subj.id,
			subjectCode: subj.code,
			subjectName: subj.name,
			majorId: subj.majorId,
			majorCode: subj.majorCode,
			facultyId: subj.facultyId,
			facultyCode: subj.facultyCode,
			classId: cls.id,
			classCode: cls.code,
			className: cls.name,
			teacherUserId: u.id,
			teacherUsername: u.username,
			teacherDisplayName: u.displayName,
			note: note || null,
			actorUserId: actor.userId,
			actorUsername: actor.username,
			actorDisplayName: actor.displayName,
			summary
		})

		const teacherFac = await loadTeacherFaculty(u.id)
		return {
			data: mapAssignmentRow(
				row!,
				{
					code: subj.code,
					name: subj.name,
					baseCode: subj.baseCode,
					majorId: subj.majorId,
					majorCode: subj.majorCode,
					majorName: subj.majorName,
					systemId: subj.systemId ?? null,
					systemCode: subj.systemCode ?? null,
					systemName: subj.systemName ?? null,
					facultyId: subj.facultyId,
					facultyCode: subj.facultyCode,
					facultyName: subj.facultyName
				},
				cls,
				teacherFac
			)
		}
	}
)

export const DeleteExamAssignment = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/exam/assignments/:id'
	},
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!canManageTeachingAssignments(actor)) {
			throw APIError.permissionDenied(
				'Không có quyền gỡ phân công (BGH chỉ xem)'
			)
		}

		const [existing] = await orm
			.select({
				id: examTeachingAssignments.id,
				subjectId: examTeachingAssignments.subjectId,
				classId: examTeachingAssignments.classId,
				userId: examTeachingAssignments.userId,
				username: examTeachingAssignments.username,
				displayName: examTeachingAssignments.displayName,
				note: examTeachingAssignments.note,
				subjectCode: examSubjects.code,
				subjectName: examSubjects.name,
				majorId: examSubjects.majorId,
				facultyId: examSubjects.facultyId,
				majorCode: examMajors.code,
				facultyCode: examFaculties.code,
				classCode: examClasses.code,
				className: examClasses.name
			})
			.from(examTeachingAssignments)
			.leftJoin(
				examSubjects,
				eq(examTeachingAssignments.subjectId, examSubjects.id)
			)
			.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
			.leftJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.leftJoin(
				examClasses,
				eq(examTeachingAssignments.classId, examClasses.id)
			)
			.where(eq(examTeachingAssignments.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Phân công không tồn tại')

		if (isScopedDeptHead(actor)) {
			const ok = await canDeptHeadAccessSubject(actor, {
				majorId: existing.majorId,
				facultyCode: existing.facultyCode
			})
			if (!ok) {
				throw APIError.permissionDenied(
					'Môn không thuộc khoa/ngành bạn phụ trách'
				)
			}
		}

		await orm
			.delete(examTeachingAssignments)
			.where(eq(examTeachingAssignments.id, params.id))

		const teacher =
			existing.displayName || existing.username || `#${existing.userId}`
		const subjLabel =
			existing.subjectCode && existing.subjectName
				? `${existing.subjectCode} — ${existing.subjectName}`
				: `môn#${existing.subjectId}`
		const classLabel =
			existing.className || existing.classCode
				? ` · lớp ${existing.className || existing.classCode}`
				: ''

		await orm.insert(examTeachingAssignmentLogs).values({
			action: 'UNASSIGN',
			subjectId: existing.subjectId,
			subjectCode: existing.subjectCode,
			subjectName: existing.subjectName,
			majorId: existing.majorId,
			majorCode: existing.majorCode,
			facultyId: existing.facultyId,
			facultyCode: existing.facultyCode,
			classId: existing.classId ?? null,
			classCode: existing.classCode ?? null,
			className: existing.className ?? null,
			teacherUserId: existing.userId,
			teacherUsername: existing.username,
			teacherDisplayName: existing.displayName,
			note: existing.note,
			actorUserId: actor.userId,
			actorUsername: actor.username,
			actorDisplayName: actor.displayName,
			summary: `Gỡ phân công ${teacher} khỏi ${subjLabel}${classLabel}`
		})

		return { ok: true }
	}
)

export const ListExamAssignmentLogs = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/assignment-logs'
	},
	async (q: {
		limit?: Query<number>
		subjectId?: Query<number>
		userId?: Query<number>
	}): Promise<{ data: AssignmentLogRow[] }> => {
		const actor = await getActor()
		if (!canViewTeachingAssignments(actor)) {
			throw APIError.permissionDenied('Không có quyền xem log phân công')
		}
		const limit = Math.min(Number(q.limit) || 100, 500)
		const conditions = []
		if (q.subjectId)
			conditions.push(
				eq(examTeachingAssignmentLogs.subjectId, Number(q.subjectId))
			)
		if (q.userId)
			conditions.push(
				eq(examTeachingAssignmentLogs.teacherUserId, Number(q.userId))
			)

		// CNK: ưu tiên lọc log theo khoa phụ trách
		const facScope = await getScopedFacultyCodes(actor)
		if (facScope !== null) {
			if (!facScope.length) return { data: [] }
			conditions.push(
				sql`upper(${examTeachingAssignmentLogs.facultyCode}) in (${sql.join(
					facScope.map((c) => sql`${c}`),
					sql`, `
				)})`
			)
		}

		const where = conditions.length ? and(...conditions) : undefined
		const rows = await orm
			.select()
			.from(examTeachingAssignmentLogs)
			.where(where)
			.orderBy(desc(examTeachingAssignmentLogs.createdAt))
			.limit(limit)

		return {
			data: rows.map((r) => ({
				id: r.id,
				createdAt: r.createdAt,
				action: r.action,
				subjectId: r.subjectId ?? null,
				subjectCode: r.subjectCode ?? null,
				subjectName: r.subjectName ?? null,
				majorCode: r.majorCode ?? null,
				facultyCode: r.facultyCode ?? null,
				classId: r.classId ?? null,
				classCode: r.classCode ?? null,
				className: r.className ?? null,
				teacherUserId: r.teacherUserId ?? null,
				teacherUsername: r.teacherUsername ?? null,
				teacherDisplayName: r.teacherDisplayName ?? null,
				note: r.note ?? null,
				actorUserId: r.actorUserId ?? null,
				actorUsername: r.actorUsername ?? null,
				actorDisplayName: r.actorDisplayName ?? null,
				summary: r.summary
			}))
		}
	}
)

export interface TeacherCatalogRow {
	id: number
	createdAt: string
	updatedAt: string
	userId: number
	username: string | null
	displayName: string | null
	facultyCode: string
	facultyName: string | null
	academicTitleId: number | null
	academicTitleName: string | null
	academicTitlePercentage: number | null
	note: string | null
	createdByUserId: number | null
	createdByUsername: string | null
	createdByDisplayName: string | null
}

export interface AcademicTitleRow {
	id: number
	createdAt: string
	updatedAt: string
	name: string
	percentage: number
	sortOrder: number
}

function academicTitleDto(
	row: typeof examAcademicTitles.$inferSelect
): AcademicTitleRow {
	return {
		id: row.id,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		name: row.name,
		percentage: row.percentage,
		sortOrder: row.sortOrder
	}
}

async function requireAcademicTitle(id: number) {
	const [row] = await orm
		.select()
		.from(examAcademicTitles)
		.where(eq(examAcademicTitles.id, id))
		.limit(1)
	if (!row) throw APIError.invalidArgument('Chức danh không tồn tại')
	return row
}

/** Danh mục chức danh dùng khi khai báo giáo viên. */
export const ListExamAcademicTitles = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/academic-titles' },
	async (): Promise<{ data: AcademicTitleRow[] }> => {
		const actor = await getActor()
		if (!canViewTeachingAssignments(actor)) {
			throw APIError.permissionDenied(
				'Không có quyền xem danh mục chức danh'
			)
		}
		const rows = await orm
			.select()
			.from(examAcademicTitles)
			.orderBy(
				asc(examAcademicTitles.sortOrder),
				asc(examAcademicTitles.percentage),
				asc(examAcademicTitles.name)
			)
		return { data: rows.map(academicTitleDto) }
	}
)

export const CreateExamAcademicTitle = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/academic-titles' },
	async (body: {
		name: string
		percentage: number
		sortOrder?: number
	}): Promise<{ data: AcademicTitleRow }> => {
		const actor = await getActor()
		if (!actor.isSuperAdmin)
			throw APIError.permissionDenied('Chỉ admin được thêm chức danh')
		const name = (body.name || '').trim()
		if (!name) throw APIError.invalidArgument('Nhập tên chức danh')
		if (
			!Number.isFinite(body.percentage) ||
			body.percentage < 0 ||
			body.percentage > 100
		) {
			throw APIError.invalidArgument('Tỷ lệ phải từ 0 đến 100%')
		}
		const [row] = await orm
			.insert(examAcademicTitles)
			.values({
				name,
				percentage: Math.round(body.percentage),
				sortOrder: body.sortOrder ?? 0
			})
			.returning()
		return { data: academicTitleDto(row!) }
	}
)

export const UpdateExamAcademicTitle = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/exam/academic-titles/:id'
	},
	async (body: {
		id: number
		name: string
		percentage: number
		sortOrder?: number
	}): Promise<{ data: AcademicTitleRow }> => {
		const actor = await getActor()
		if (!actor.isSuperAdmin)
			throw APIError.permissionDenied('Chỉ admin được sửa chức danh')
		const existing = await requireAcademicTitle(body.id)
		const name = (body.name || '').trim()
		if (!name) throw APIError.invalidArgument('Nhập tên chức danh')
		if (
			!Number.isFinite(body.percentage) ||
			body.percentage < 0 ||
			body.percentage > 100
		) {
			throw APIError.invalidArgument('Tỷ lệ phải từ 0 đến 100%')
		}
		const [row] = await orm
			.update(examAcademicTitles)
			.set({
				name,
				percentage: Math.round(body.percentage),
				sortOrder: body.sortOrder ?? existing.sortOrder,
				updatedAt: sql`(datetime('now'))`
			})
			.where(eq(examAcademicTitles.id, body.id))
			.returning()
		return { data: academicTitleDto(row!) }
	}
)

export const DeleteExamAcademicTitle = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/exam/academic-titles/:id'
	},
	async ({ id }: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!actor.isSuperAdmin)
			throw APIError.permissionDenied('Chỉ admin được xóa chức danh')
		const [used] = await orm
			.select({ id: examTeachers.id })
			.from(examTeachers)
			.where(eq(examTeachers.academicTitleId, id))
			.limit(1)
		if (used)
			throw APIError.failedPrecondition(
				'Chức danh đang được giáo viên sử dụng'
			)
		await orm
			.delete(examAcademicTitles)
			.where(eq(examAcademicTitles.id, id))
		return { ok: true }
	}
)

export interface FacultyOption {
	code: string
	name: string
}

/** Danh sách mã khoa (unique K1…K8) từ DMĐT */
export const ListExamFacultyOptions = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/faculty-options'
	},
	async (): Promise<{ data: FacultyOption[] }> => {
		const actor = await getActor()
		if (!canViewTeachingAssignments(actor)) {
			throw APIError.permissionDenied('Không có quyền')
		}
		const rows = await orm
			.select({
				code: examFaculties.code,
				name: examFaculties.name
			})
			.from(examFaculties)
			.orderBy(examFaculties.code)

		const map = new Map<string, string>()
		for (const r of rows) {
			if (!r.code) continue
			if (!map.has(r.code)) map.set(r.code, r.name)
		}

		let list = [...map.entries()].map(([code, name]) => ({ code, name }))
		const scope = await getScopedFacultyCodes(actor)
		if (scope !== null) {
			if (!scope.length) return { data: [] }
			list = list.filter((f) => scope.includes(f.code))
		}
		list.sort((a, b) => a.code.localeCompare(b.code, 'vi'))
		return { data: list }
	}
)

export interface FacultyHeadRow {
	id: number
	createdAt: string
	updatedAt: string
	facultyCode: string
	facultyName: string | null
	userId: number
	username: string | null
	displayName: string | null
	note: string | null
}

/** Danh sách Chủ nhiệm khoa hiện tại để hiển thị trong danh mục khoa. */
export const ListExamFacultyHeads = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/faculty-heads'
	},
	async (): Promise<{ data: FacultyHeadRow[] }> => {
		const actor = await getActor()
		if (!canViewTeachingAssignments(actor)) {
			throw APIError.permissionDenied('Không có quyền xem Chủ nhiệm khoa')
		}
		const scope = await getScopedFacultyCodes(actor)
		const rows = await orm
			.select()
			.from(examFacultyHeads)
			.orderBy(examFacultyHeads.facultyCode)
		const visible =
			scope === null
				? rows
				: rows.filter((row) => scope.includes(row.facultyCode))
		return {
			data: visible.map((row) => ({
				id: row.id,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				facultyCode: row.facultyCode,
				facultyName: row.facultyName,
				userId: row.userId,
				username: row.username,
				displayName: row.displayName,
				note: row.note
			}))
		}
	}
)

/**
 * Gán / cập nhật Chủ nhiệm khoa theo mã khoa (K1…K8).
 * 1 khoa = 1 CNK chính. Chức vụ «Chủ nhiệm khoa» gắn tài khoản — không đơn vị.
 * Chỉ super admin (tạo TK từ danh sách user).
 */
export const UpsertExamFacultyHead = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/exam/faculty-heads'
	},
	async (body: {
		userId: number
		facultyCode: string
		note?: string
	}): Promise<{ data: FacultyHeadRow }> => {
		const actor = await getActor()
		if (!actor.isSuperAdmin) {
			throw APIError.permissionDenied(
				'Chỉ admin được gán Chủ nhiệm khoa theo khoa'
			)
		}

		const facultyCode = (body.facultyCode || '').trim().toUpperCase()
		if (!facultyCode) {
			throw APIError.invalidArgument('Chọn khoa cho Chủ nhiệm khoa')
		}
		if (!body.userId || !Number.isFinite(body.userId)) {
			throw APIError.invalidArgument('Thiếu tài khoản CNK')
		}

		const facultyName = await resolveFacultyName(facultyCode)
		if (!facultyName) {
			throw APIError.invalidArgument(
				`Khoa ${facultyCode} không có trong danh mục đào tạo`
			)
		}

		const [u] = await orm
			.select()
			.from(users)
			.where(eq(users.id, body.userId))
			.limit(1)
		if (!u) throw APIError.notFound('Tài khoản không tồn tại')

		await ensureDeptHeadRole(u.id)
		const displaced = await orm
			.select({ userId: examFacultyHeads.userId })
			.from(examFacultyHeads)
			.where(
				and(
					eq(examFacultyHeads.facultyCode, facultyCode),
					ne(examFacultyHeads.userId, u.id)
				)
			)

		// 1 khoa = 1 CNK: gỡ head khác trên cùng mã khoa
		await orm
			.delete(examFacultyHeads)
			.where(
				and(
					eq(examFacultyHeads.facultyCode, facultyCode),
					ne(examFacultyHeads.userId, u.id)
				)
			)

		const [existing] = await orm
			.select()
			.from(examFacultyHeads)
			.where(
				and(
					eq(examFacultyHeads.userId, u.id),
					eq(examFacultyHeads.facultyCode, facultyCode)
				)
			)
			.limit(1)

		const note = body.note?.trim() || null
		let row: typeof examFacultyHeads.$inferSelect

		if (existing) {
			const [updated] = await orm
				.update(examFacultyHeads)
				.set({
					username: u.username,
					displayName: u.displayName,
					facultyName,
					note: note ?? existing.note,
					updatedAt: sql`(datetime('now'))`
				})
				.where(eq(examFacultyHeads.id, existing.id))
				.returning()
			row = updated!
		} else {
			// Gỡ gán khoa khác của cùng user (1 CNK / 1 khoa chính)
			await orm
				.delete(examFacultyHeads)
				.where(eq(examFacultyHeads.userId, u.id))

			const [created] = await orm
				.insert(examFacultyHeads)
				.values({
					facultyCode,
					facultyName,
					userId: u.id,
					username: u.username,
					displayName: u.displayName,
					note
				})
				.returning()
			row = created!
		}
		for (const old of displaced)
			await releaseDeptHeadRoleIfUnused(old.userId)

		return {
			data: {
				id: row.id,
				createdAt: row.createdAt,
				updatedAt: row.updatedAt,
				facultyCode: row.facultyCode,
				facultyName: row.facultyName,
				userId: row.userId,
				username: row.username,
				displayName: row.displayName,
				note: row.note
			}
		}
	}
)

export const DeleteExamFacultyHead = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/exam/faculty-heads/:facultyCode'
	},
	async ({
		facultyCode
	}: {
		facultyCode: string
	}): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!actor.isSuperAdmin)
			throw APIError.permissionDenied(
				'Chỉ admin được bỏ phân công Chủ nhiệm khoa'
			)
		const code = facultyCode.trim().toUpperCase()
		const rows = await orm
			.select({ userId: examFacultyHeads.userId })
			.from(examFacultyHeads)
			.where(eq(examFacultyHeads.facultyCode, code))
		await orm
			.delete(examFacultyHeads)
			.where(eq(examFacultyHeads.facultyCode, code))
		for (const row of rows) await releaseDeptHeadRoleIfUnused(row.userId)
		return { ok: true }
	}
)

/**
 * Danh mục giáo viên theo khoa — mỗi user 1 dòng (không trùng).
 * Lọc theo khoa / từ khóa. CNK chỉ thấy GV thuộc khoa trong ngành mình.
 */
export const ListExamTeacherCatalog = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/teacher-catalog' },
	async (q: {
		facultyCode?: Query<string>
		q?: Query<string>
	}): Promise<{ data: TeacherCatalogRow[] }> => {
		const actor = await getActor()
		if (!canViewTeachingAssignments(actor)) {
			throw APIError.permissionDenied('Không có quyền xem danh mục GV')
		}

		const conditions = []
		const facFilter = (q.facultyCode || '').trim().toUpperCase()
		if (facFilter) {
			conditions.push(
				sql`upper(${examTeachers.facultyCode}) = ${facFilter}`
			)
		}

		const scope = await getScopedFacultyCodes(actor)
		if (scope !== null) {
			if (!scope.length) return { data: [] }
			conditions.push(inArray(examTeachers.facultyCode, scope))
		}

		const kw = (q.q || '').trim()
		if (kw) {
			conditions.push(
				or(
					like(examTeachers.displayName, `%${kw}%`),
					like(examTeachers.username, `%${kw}%`),
					like(examTeachers.facultyName, `%${kw}%`),
					like(examTeachers.facultyCode, `%${kw}%`)
				)!
			)
		}

		const where = conditions.length ? and(...conditions) : undefined
		const rows = await orm
			.select()
			.from(examTeachers)
			.where(where)
			.orderBy(
				asc(examTeachers.facultyCode),
				asc(examTeachers.displayName)
			)
		const titleRows = await orm.select().from(examAcademicTitles)
		const titleById = new Map(titleRows.map((title) => [title.id, title]))

		// Dedup theo userId (phòng khi DB thiếu unique)
		const seen = new Set<number>()
		const data: TeacherCatalogRow[] = []
		for (const r of rows) {
			if (seen.has(r.userId)) continue
			seen.add(r.userId)
			const title = r.academicTitleId
				? titleById.get(r.academicTitleId)
				: null
			data.push({
				id: r.id,
				createdAt: r.createdAt,
				updatedAt: r.updatedAt,
				userId: r.userId,
				username: r.username,
				displayName: r.displayName,
				facultyCode: r.facultyCode,
				facultyName: r.facultyName,
				academicTitleId: r.academicTitleId ?? null,
				academicTitleName: title?.name ?? null,
				academicTitlePercentage: title?.percentage ?? null,
				note: r.note,
				createdByUserId: r.createdByUserId ?? null,
				createdByUsername: r.createdByUsername ?? null,
				createdByDisplayName: r.createdByDisplayName ?? null
			})
		}
		return { data }
	}
)

/**
 * Thêm GV vào danh mục khoa — mỗi người 1 tài khoản riêng (user_id unique).
 *
 * Cách 1: gắn tài khoản có sẵn (`userId`)
 * Cách 2: tạo tài khoản mới (`username` + `password` + `displayName`) rồi gắn khoa
 */
export const CreateExamTeacherCatalog = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/teacher-catalog' },
	async (body: {
		/** Gắn user đã có */
		userId?: number
		/** Tạo tài khoản mới (mỗi GV 1 TK) */
		username?: string
		password?: string
		displayName?: string
		facultyCode: string
		academicTitleId: number
		note?: string
	}): Promise<{ data: TeacherCatalogRow }> => {
		const actor = await getActor()
		if (!canManageTeachingAssignments(actor)) {
			throw APIError.permissionDenied(
				'Không có quyền thêm giáo viên vào danh mục'
			)
		}

		const facultyCode = (body.facultyCode || '').trim().toUpperCase()
		if (!facultyCode) {
			throw APIError.invalidArgument('Chọn khoa cho giáo viên')
		}

		const scope = await getScopedFacultyCodes(actor)
		if (scope !== null && !scope.includes(facultyCode)) {
			throw APIError.permissionDenied(
				`Khoa ${facultyCode} không thuộc ngành bạn phụ trách`
			)
		}

		const facultyName = await resolveFacultyName(facultyCode)
		if (!facultyName) {
			throw APIError.invalidArgument(
				`Khoa ${facultyCode} không có trong danh mục đào tạo`
			)
		}
		const academicTitle = await requireAcademicTitle(body.academicTitleId)

		let u: typeof users.$inferSelect | undefined

		if (body.userId) {
			const [found] = await orm
				.select()
				.from(users)
				.where(eq(users.id, body.userId))
				.limit(1)
			if (!found) throw APIError.notFound('Tài khoản không tồn tại')
			u = found
		} else {
			// Tạo tài khoản riêng cho giáo viên
			const username = (body.username || '').trim().toLowerCase()
			const password = body.password || ''
			const displayName = (body.displayName || '').trim()
			if (!username || username.length < 3) {
				throw APIError.invalidArgument(
					'Username đăng nhập ít nhất 3 ký tự (vd. gv.nguyenvanan)'
				)
			}
			if (!password || password.length < 6) {
				throw APIError.invalidArgument(
					'Mật khẩu tài khoản GV tối thiểu 6 ký tự'
				)
			}
			if (!displayName) {
				throw APIError.invalidArgument(
					'Nhập họ tên giáo viên (vd. Nguyễn Văn An)'
				)
			}
			const [exUser] = await orm
				.select({ id: users.id })
				.from(users)
				.where(eq(users.username, username))
				.limit(1)
			if (exUser) {
				throw APIError.alreadyExists(
					`Username «${username}» đã có — mỗi GV một tài khoản riêng, chọn username khác hoặc gắn user có sẵn`
				)
			}

			const argon2 = (await import('argon2')).default
			const { appConfig } = await import('../configs')
			const hashPassword = await argon2.hash(password, {
				secret: Buffer.from(appConfig.HASH_SECRET)
			})
			const fullDisplay = displayName.startsWith('GV')
				? displayName
				: `GV — ${displayName}`
			const [created] = await orm
				.insert(users)
				.values({
					username,
					password: hashPassword,
					displayName: fullDisplay,
					isSuperUser: false,
					status: 'approved',
					position: 'Giáo viên',
					unitId: null
				})
				.returning()
			u = created
		}

		if (!u) throw APIError.internal('Không tạo/lấy được tài khoản GV')

		const [dup] = await orm
			.select({ id: examTeachers.id })
			.from(examTeachers)
			.where(eq(examTeachers.userId, u.id))
			.limit(1)
		if (dup) {
			throw APIError.failedPrecondition(
				'Giáo viên này đã có trong danh mục (mỗi người chỉ 1 khoa — không trùng). Sửa khoa nếu cần chuyển.'
			)
		}

		const displayName =
			(body.displayName || '').trim() || u.displayName || u.username
		const finalName = displayName.startsWith('GV')
			? displayName
			: displayName.includes('—')
				? displayName
				: `GV — ${displayName}`

		await ensureLecturerRole(u.id)
		// Chức vụ Giáo viên gắn TK — không đơn vị
		await lockTrainingUserProfile(u.id, 'Giáo viên')

		if (body.displayName?.trim() || finalName !== u.displayName) {
			await orm
				.update(users)
				.set({ displayName: finalName })
				.where(eq(users.id, u.id))
		}

		const [row] = await orm
			.insert(examTeachers)
			.values({
				userId: u.id,
				username: u.username,
				displayName: finalName,
				facultyCode,
				facultyName,
				academicTitleId: academicTitle.id,
				note: body.note || null,
				createdByUserId: actor.userId,
				createdByUsername: actor.username,
				createdByDisplayName: actor.displayName
			})
			.returning()

		if (isFacultyHeadTitle(academicTitle.name)) {
			await assignFacultyHeadFromTeacher(
				{ ...u, displayName: finalName },
				facultyCode,
				facultyName
			)
		}

		return {
			data: {
				id: row!.id,
				createdAt: row!.createdAt,
				updatedAt: row!.updatedAt,
				userId: row!.userId,
				username: row!.username,
				displayName: row!.displayName,
				facultyCode: row!.facultyCode,
				facultyName: row!.facultyName,
				academicTitleId: row!.academicTitleId ?? null,
				academicTitleName: academicTitle.name,
				academicTitlePercentage: academicTitle.percentage,
				note: row!.note,
				createdByUserId: row!.createdByUserId ?? null,
				createdByUsername: row!.createdByUsername ?? null,
				createdByDisplayName: row!.createdByDisplayName ?? null
			}
		}
	}
)

/** Cập nhật khoa / tên hiển thị GV trong danh mục */
export const UpdateExamTeacherCatalog = api(
	{
		auth: true,
		expose: true,
		method: 'PATCH',
		path: '/exam/teacher-catalog/:id'
	},
	async (params: {
		id: number
		facultyCode?: string
		academicTitleId?: number
		displayName?: string
		note?: string | null
	}): Promise<{ data: TeacherCatalogRow }> => {
		const actor = await getActor()
		if (!canManageTeachingAssignments(actor)) {
			throw APIError.permissionDenied('Không có quyền sửa danh mục GV')
		}

		const [existing] = await orm
			.select()
			.from(examTeachers)
			.where(eq(examTeachers.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Không tìm thấy giáo viên')

		const scope = await getScopedFacultyCodes(actor)
		if (scope !== null && !scope.includes(existing.facultyCode)) {
			throw APIError.permissionDenied(
				'Giáo viên không thuộc khoa trong phạm vi bạn quản lý'
			)
		}

		const patch: Partial<typeof examTeachers.$inferInsert> = {}
		if (params.facultyCode !== undefined) {
			const facultyCode = params.facultyCode.trim().toUpperCase()
			if (!facultyCode) {
				throw APIError.invalidArgument('Mã khoa không hợp lệ')
			}
			if (scope !== null && !scope.includes(facultyCode)) {
				throw APIError.permissionDenied(
					`Khoa ${facultyCode} không thuộc ngành bạn phụ trách`
				)
			}
			const facultyName = await resolveFacultyName(facultyCode)
			if (!facultyName) {
				throw APIError.invalidArgument(
					`Khoa ${facultyCode} không có trong danh mục đào tạo`
				)
			}
			patch.facultyCode = facultyCode
			patch.facultyName = facultyName
		}
		if (params.displayName !== undefined) {
			const dn = params.displayName.trim()
			if (!dn) throw APIError.invalidArgument('Tên giáo viên bắt buộc')
			patch.displayName = dn
			await orm
				.update(users)
				.set({ displayName: dn })
				.where(eq(users.id, existing.userId))
		}
		if (params.note !== undefined) {
			patch.note = params.note
		}
		if (params.academicTitleId !== undefined) {
			const title = await requireAcademicTitle(params.academicTitleId)
			patch.academicTitleId = title.id
		}

		const [row] = await orm
			.update(examTeachers)
			.set(patch)
			.where(eq(examTeachers.id, params.id))
			.returning()

		const title = row!.academicTitleId
			? await requireAcademicTitle(row!.academicTitleId)
			: null
		const [teacherUser] = await orm
			.select()
			.from(users)
			.where(eq(users.id, row!.userId))
			.limit(1)
		if (teacherUser && title && isFacultyHeadTitle(title.name)) {
			await assignFacultyHeadFromTeacher(
				teacherUser,
				row!.facultyCode,
				row!.facultyName ||
					(await resolveFacultyName(row!.facultyCode)) ||
					row!.facultyCode
			)
		} else {
			await removeFacultyHeadAssignment(row!.userId)
		}
		return {
			data: {
				id: row!.id,
				createdAt: row!.createdAt,
				updatedAt: row!.updatedAt,
				userId: row!.userId,
				username: row!.username,
				displayName: row!.displayName,
				facultyCode: row!.facultyCode,
				facultyName: row!.facultyName,
				academicTitleId: row!.academicTitleId ?? null,
				academicTitleName: title?.name ?? null,
				academicTitlePercentage: title?.percentage ?? null,
				note: row!.note,
				createdByUserId: row!.createdByUserId ?? null,
				createdByUsername: row!.createdByUsername ?? null,
				createdByDisplayName: row!.createdByDisplayName ?? null
			}
		}
	}
)

/** Gỡ GV khỏi danh mục khoa (không xóa user) */
export const DeleteExamTeacherCatalog = api(
	{
		auth: true,
		expose: true,
		method: 'DELETE',
		path: '/exam/teacher-catalog/:id'
	},
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		if (!canManageTeachingAssignments(actor)) {
			throw APIError.permissionDenied('Không có quyền xóa khỏi danh mục')
		}
		const [existing] = await orm
			.select()
			.from(examTeachers)
			.where(eq(examTeachers.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Không tìm thấy giáo viên')

		const scope = await getScopedFacultyCodes(actor)
		if (scope !== null && !scope.includes(existing.facultyCode)) {
			throw APIError.permissionDenied(
				'Giáo viên không thuộc khoa trong phạm vi bạn quản lý'
			)
		}

		await orm.delete(examTeachers).where(eq(examTeachers.id, params.id))
		return { ok: true }
	}
)

/**
 * Danh sách GV để chọn khi phân công — lấy từ danh mục (unique).
 * Fallback: role exam_lecturer nếu danh mục trống (admin).
 */
export const ListExamTeachers = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/teachers' },
	async (q: {
		q?: Query<string>
		facultyCode?: Query<string>
	}): Promise<{
		data: Array<
			TeacherOption & {
				facultyCode?: string | null
				facultyName?: string | null
			}
		>
	}> => {
		const actor = await getActor()
		if (!canViewTeachingAssignments(actor)) {
			throw APIError.permissionDenied('Không có quyền')
		}

		const kw = (q.q || '').trim()
		const facFilter = (q.facultyCode || '').trim().toUpperCase()
		const conditions = []
		if (facFilter) {
			conditions.push(
				sql`upper(${examTeachers.facultyCode}) = ${facFilter}`
			)
		}
		const scope = await getScopedFacultyCodes(actor)
		if (scope !== null) {
			if (!scope.length) return { data: [] }
			conditions.push(inArray(examTeachers.facultyCode, scope))
		}
		if (kw) {
			conditions.push(
				or(
					like(examTeachers.displayName, `%${kw}%`),
					like(examTeachers.username, `%${kw}%`)
				)!
			)
		}

		const catalog = await orm
			.select()
			.from(examTeachers)
			.where(conditions.length ? and(...conditions) : undefined)
			.orderBy(asc(examTeachers.displayName))
			.limit(300)

		// Chỉ lấy từ danh mục GV theo khoa — không fallback toàn bộ lecturer
		// (tránh GV khoa A hiện khi chọn khoa B)
		if (facFilter && !catalog.length) {
			return { data: [] }
		}

		const seen = new Set<number>()
		const data: Array<
			TeacherOption & {
				facultyCode?: string | null
				facultyName?: string | null
			}
		> = []
		for (const r of catalog) {
			if (seen.has(r.userId)) continue
			// Lọc cứng theo khoa nếu client gửi facultyCode
			if (
				facFilter &&
				(r.facultyCode || '').trim().toUpperCase() !== facFilter
			) {
				continue
			}
			seen.add(r.userId)
			data.push({
				id: r.userId,
				username: r.username || '',
				displayName: r.displayName,
				facultyCode: r.facultyCode,
				facultyName: r.facultyName
			})
		}
		return { data }
	}
)

/** User có role exam_lecturer chưa vào danh mục — để CNK thêm */
export const ListExamTeacherCandidates = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/teacher-candidates'
	},
	async (q: { q?: Query<string> }): Promise<{ data: TeacherOption[] }> => {
		const actor = await getActor()
		if (!canManageTeachingAssignments(actor)) {
			throw APIError.permissionDenied('Không có quyền')
		}

		const inCatalog = await orm
			.select({ userId: examTeachers.userId })
			.from(examTeachers)
		const catalogIds = new Set(inCatalog.map((x) => x.userId))

		const lecturerRoleIds = await orm
			.select({ id: roles.id })
			.from(roles)
			.where(
				or(
					eq(roles.name, 'exam_lecturer'),
					like(roles.name, '%giang_vien%')
				)!
			)
		const roleIds = lecturerRoleIds.map((r) => r.id)
		if (!roleIds.length) return { data: [] }

		const ur = await orm
			.select({ userId: userRoles.userId })
			.from(userRoles)
			.where(inArray(userRoles.roleId, roleIds))
		const candidateIds = [
			...new Set(
				ur.map((x) => x.userId).filter((id) => !catalogIds.has(id))
			)
		]
		if (!candidateIds.length) return { data: [] }

		const kw = (q.q || '').trim()
		const conditions = [inArray(users.id, candidateIds)]
		if (kw) {
			conditions.push(
				or(
					like(users.username, `%${kw}%`),
					like(users.displayName, `%${kw}%`)
				)!
			)
		}

		const rows = await orm
			.select({
				id: users.id,
				username: users.username,
				displayName: users.displayName
			})
			.from(users)
			.where(and(...conditions))
			.orderBy(users.displayName)
			.limit(200)

		return {
			data: rows.map((r) => ({
				id: r.id,
				username: r.username,
				displayName: r.displayName
			}))
		}
	}
)
