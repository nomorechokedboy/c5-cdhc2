/**
 * API Phân hệ đề thi tự luận
 */
import { appFetcher } from '@/lib/axios'
import { ApiUrl } from '@/lib/const'

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
	const url = `${ApiUrl.replace(/\/$/, '')}${path}`
	const resp = await appFetcher(url, {
		...init,
		headers: {
			'Content-Type': 'application/json',
			...(init?.headers ?? {})
		}
	})
	if (!resp.ok) {
		let message = `HTTP ${resp.status}`
		try {
			const body = await resp.json()
			message =
				body?.message ||
				body?.error ||
				body?.internal_message ||
				message
		} catch {
			/* ignore */
		}
		throw new Error(message)
	}
	if (resp.status === 204) return undefined as T
	return resp.json() as Promise<T>
}

/** Hệ — chỉ 2: Quân sự (A) / Dân sự (B) */
export interface ExamSystem {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	letter: string
	description: string | null
}

/** Ngành đào tạo (cột chương trình) — mã vd B_CDDD */
export interface ExamMajor {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	systemId: number
	levelCode: string | null
	shortCode: string | null
	systemCode?: string | null
	systemName?: string | null
	systemLetter?: string | null
	description: string | null
}

/** Khoa thuộc ngành (K1…K8) */
export interface ExamFaculty {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	shortCode: string | null
	name: string
	majorId: number
	majorCode?: string | null
	majorName?: string | null
	description: string | null
}

/** Lớp danh mục thi — thuộc Hệ + Ngành (không phải lớp học viên) */
export interface ExamClassCatalog {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	name: string
	systemId?: number | null
	systemCode?: string | null
	systemName?: string | null
	majorId: number | null
	majorCode?: string | null
	majorName?: string | null
	facultyId: number | null
	facultyCode?: string | null
	facultyName?: string | null
	cohort: string | null
	/** ACTIVE | EXPIRED — theo tháng/năm kết thúc khóa */
	status?: 'ACTIVE' | 'EXPIRED'
	statusLabel?: string
	cohortEndYear?: number | null
	/** YYYY-MM kết thúc khóa */
	cohortEndMonth?: string | null
	description: string | null
}

export interface ExamSubject {
	id: number
	createdAt: string
	updatedAt: string
	/** Full: B_CDDD_M009K2 */
	code: string
	/** Gốc file: M009K2 */
	baseCode?: string | null
	name: string
	creditHours: number | null
	lessonHours: number | null
	facultyId: number
	facultyCode?: string | null
	facultyName?: string | null
	majorId: number
	majorCode?: string | null
	majorName?: string | null
	/** Hệ đào tạo — cố định khi GV import theo phân công */
	systemId?: number | null
	systemCode?: string | null
	systemName?: string | null
	description: string | null
}

export interface ExamQuestion {
	id?: number
	examId?: number
	questionNumber: number
	content: string
	answer?: string | null
	points: number
}

export interface ExamItem {
	id: number
	createdAt: string
	updatedAt: string
	code: string
	title: string
	subjectId: number
	subjectCode?: string | null
	subjectName?: string | null
	majorId?: number | null
	majorCode?: string | null
	majorName?: string | null
	status: string
	statusLabel: string
	createdByUserId: number | null
	createdByUsername: string | null
	createdByDisplayName: string | null
	approvedByUserId: number | null
	approvedByUsername: string | null
	approvedByDisplayName: string | null
	approvedAt: string | null
	approvedByRank?: string | null
	approvedByPosition?: string | null
	approvedBySignatureUrl?: string | null
	approvedByTitle?: string | null
	deptHeadUserId?: number | null
	deptHeadUsername?: string | null
	deptHeadDisplayName?: string | null
	deptHeadRank?: string | null
	deptHeadSignatureUrl?: string | null
	deptHeadApprovedAt?: string | null
	qrCode: string | null
	locked: boolean
	/** Số đề từ import (Đề thi số n) */
	paperNumber?: number | null
	classId?: number | null
	className?: string | null
	durationMinutes?: number | null
	questionFileUrl: string | null
	questionFileName: string | null
	answerFileUrl: string | null
	answerFileName: string | null
	note: string | null
	returnNote: string | null
	questions?: ExamQuestion[]
	questionCount?: number
}

export interface ExamWorkflowLog {
	id: number
	createdAt: string
	examId: number
	action: string
	fromStatus: string | null
	toStatus: string | null
	note: string | null
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
}

export interface ExamDraw {
	id: number
	createdAt: string
	drawCode: string
	examId: number
	examCode: string | null
	examTitle?: string | null
	/** Số đề import — trùng đề được bốc */
	paperNumber?: number | null
	subjectId: number | null
	subjectCode?: string | null
	subjectName?: string | null
	majorId: number | null
	majorCode?: string | null
	majorName?: string | null
	drawType: string
	classId: number | null
	className: string | null
	drawnByUserId: number | null
	drawnByUsername: string | null
	drawnByDisplayName: string | null
	drawnAt: string
	printedAt?: string | null
	printedByUsername?: string | null
	printBlocked?: boolean
	printBlockedAt?: string | null
	printBlockedReason?: string | null
	daysSinceDraw?: number | null
	examDate: string | null
	examTime: string | null
	location: string | null
	note: string | null
}

export interface ExamAssignment {
	id: number
	createdAt?: string
	updatedAt?: string
	subjectId: number
	subjectCode?: string | null
	subjectName?: string | null
	baseCode?: string | null
	/** Hệ → Ngành → Khoa → Môn → Lớp */
	systemId?: number | null
	systemCode?: string | null
	systemName?: string | null
	majorId?: number | null
	majorCode?: string | null
	majorName?: string | null
	facultyId?: number | null
	facultyCode?: string | null
	facultyName?: string | null
	classId?: number | null
	classCode?: string | null
	className?: string | null
	/** YYYY-MM-DD */
	teachingStart?: string | null
	/** YYYY-MM-DD */
	teachingEnd?: string | null
	/** ACTIVE | EXPIRED | UPCOMING */
	teachingStatus?: 'ACTIVE' | 'EXPIRED' | 'UPCOMING'
	teachingStatusLabel?: string
	userId: number
	username: string | null
	displayName: string | null
	/** Khoa trong danh mục GV — dùng lọc UI không lẫn khoa */
	teacherFacultyCode?: string | null
	teacherFacultyName?: string | null
	note: string | null
	assignedByUserId?: number | null
	assignedByUsername?: string | null
	assignedByDisplayName?: string | null
}

export interface ExamAssignmentLog {
	id: number
	createdAt: string
	action: string
	subjectId: number | null
	subjectCode: string | null
	subjectName: string | null
	majorCode: string | null
	facultyCode: string | null
	classId?: number | null
	classCode?: string | null
	className?: string | null
	teacherUserId: number | null
	teacherUsername: string | null
	teacherDisplayName: string | null
	note: string | null
	actorUserId: number | null
	actorUsername: string | null
	actorDisplayName: string | null
	summary: string
}

export interface ExamTeacherOption {
	id: number
	username: string
	displayName: string | null
	facultyCode?: string | null
	facultyName?: string | null
}

/** Danh mục giáo viên theo khoa — mỗi user 1 dòng (không trùng) */
export interface ExamTeacherCatalog {
	id: number
	createdAt: string
	updatedAt: string
	userId: number
	username: string | null
	displayName: string | null
	facultyCode: string
	facultyName: string | null
	note: string | null
	createdByUserId?: number | null
	createdByUsername?: string | null
	createdByDisplayName?: string | null
}

export interface ExamFacultyOption {
	code: string
	name: string
}

// ── Hệ → Ngành → Khoa → Môn / Lớp ────────────────────────────

export async function ListExamSystems(params?: { q?: string }) {
	const sp = new URLSearchParams()
	if (params?.q) sp.set('q', params.q)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamSystem[] }>(`/exam/systems${qs}`)
	return resp.data
}

export async function CreateExamSystem(body: {
	code: string
	name: string
	letter: string
	description?: string
}) {
	const resp = await jsonFetch<{ data: ExamSystem }>('/exam/systems', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteExamSystem(id: number) {
	return jsonFetch<{ ok: boolean }>(`/exam/systems/${id}`, {
		method: 'DELETE'
	})
}

export async function ListExamMajors(params?: {
	q?: string
	systemId?: number
}) {
	const sp = new URLSearchParams()
	if (params?.q) sp.set('q', params.q)
	if (params?.systemId) sp.set('systemId', String(params.systemId))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamMajor[] }>(`/exam/majors${qs}`)
	return resp.data
}

export async function CreateExamMajor(body: {
	name: string
	systemId: number
	levelCode?: string | null
	shortCode?: string | null
	/** Để trống → tự sinh A/B_CD… */
	code?: string | null
	description?: string
}) {
	const resp = await jsonFetch<{ data: ExamMajor }>('/exam/majors', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateExamMajor(
	id: number,
	body: {
		code?: string
		name?: string
		levelCode?: string | null
		shortCode?: string | null
		systemId?: number
		description?: string | null
	}
) {
	const resp = await jsonFetch<{ data: ExamMajor }>(`/exam/majors/${id}`, {
		method: 'PUT',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteExamMajor(id: number) {
	return jsonFetch<{ ok: boolean }>(`/exam/majors/${id}`, {
		method: 'DELETE'
	})
}

export async function ListExamFaculties(params?: {
	q?: string
	majorId?: number
}) {
	const sp = new URLSearchParams()
	if (params?.q) sp.set('q', params.q)
	if (params?.majorId) sp.set('majorId', String(params.majorId))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamFaculty[] }>(
		`/exam/faculties${qs}`
	)
	return resp.data
}

export async function CreateExamFaculty(body: {
	code: string
	shortCode?: string | null
	name: string
	majorId: number
	description?: string
}) {
	const resp = await jsonFetch<{ data: ExamFaculty }>('/exam/faculties', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateExamFaculty(
	id: number,
	body: {
		code?: string
		shortCode?: string | null
		name?: string
		majorId?: number
		description?: string | null
	}
) {
	const resp = await jsonFetch<{ data: ExamFaculty }>(
		`/exam/faculties/${id}`,
		{
			method: 'PUT',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

export async function DeleteExamFaculty(id: number) {
	return jsonFetch<{ ok: boolean }>(`/exam/faculties/${id}`, {
		method: 'DELETE'
	})
}

export async function ListExamClasses(params?: {
	q?: string
	systemId?: number
	majorId?: number
	facultyId?: number
}) {
	const sp = new URLSearchParams()
	if (params?.q) sp.set('q', params.q)
	if (params?.systemId) sp.set('systemId', String(params.systemId))
	if (params?.majorId) sp.set('majorId', String(params.majorId))
	if (params?.facultyId) sp.set('facultyId', String(params.facultyId))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamClassCatalog[] }>(
		`/exam/classes${qs}`
	)
	return resp.data
}

export async function CreateExamClass(body: {
	code: string
	name: string
	/** Bắt buộc — lớp thuộc ngành (hệ suy ra từ ngành) */
	majorId: number
	facultyId?: number | null
	cohort?: string
	description?: string
}) {
	const resp = await jsonFetch<{ data: ExamClassCatalog }>('/exam/classes', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateExamClass(
	id: number,
	body: {
		code?: string
		name?: string
		majorId?: number | null
		facultyId?: number | null
		cohort?: string | null
		description?: string | null
	}
) {
	const resp = await jsonFetch<{ data: ExamClassCatalog }>(
		`/exam/classes/${id}`,
		{
			method: 'PUT',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

export async function DeleteExamClass(id: number) {
	return jsonFetch<{ ok: boolean }>(`/exam/classes/${id}`, {
		method: 'DELETE'
	})
}

export async function ListExamSubjects(params?: {
	majorId?: number
	facultyId?: number
	q?: string
	mine?: boolean
}) {
	const sp = new URLSearchParams()
	if (params?.majorId) sp.set('majorId', String(params.majorId))
	if (params?.facultyId) sp.set('facultyId', String(params.facultyId))
	if (params?.q) sp.set('q', params.q)
	if (params?.mine) sp.set('mine', 'true')
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamSubject[] }>(`/exam/subjects${qs}`)
	return resp.data
}

export async function CreateExamSubject(body: {
	name: string
	facultyId: number
	baseCode?: string
	code?: string
	creditHours?: number
	lessonHours?: number
	description?: string
}) {
	const resp = await jsonFetch<{ data: ExamSubject }>('/exam/subjects', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateExamSubject(
	id: number,
	body: {
		name?: string
		facultyId?: number
		baseCode?: string
		code?: string
		creditHours?: number
		lessonHours?: number
		description?: string | null
	}
) {
	const resp = await jsonFetch<{ data: ExamSubject }>(
		`/exam/subjects/${id}`,
		{
			method: 'PUT',
			body: JSON.stringify(body)
		}
	)
	return resp.data
}

export async function DeleteExamSubject(id: number) {
	return jsonFetch<{ ok: boolean }>(`/exam/subjects/${id}`, {
		method: 'DELETE'
	})
}

// ── Phân công môn học ─────────────────────────────────────────

export async function ListExamAssignments(params?: {
	subjectId?: number
	userId?: number
	majorId?: number
	facultyId?: number
	classId?: number
	/** GV: chỉ phân công của mình */
	mine?: boolean
	q?: string
}) {
	const sp = new URLSearchParams()
	if (params?.subjectId) sp.set('subjectId', String(params.subjectId))
	if (params?.userId) sp.set('userId', String(params.userId))
	if (params?.majorId) sp.set('majorId', String(params.majorId))
	if (params?.facultyId) sp.set('facultyId', String(params.facultyId))
	if (params?.classId) sp.set('classId', String(params.classId))
	if (params?.mine) sp.set('mine', 'true')
	if (params?.q) sp.set('q', params.q)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamAssignment[] }>(
		`/exam/assignments${qs}`
	)
	return resp.data
}

export async function CreateExamAssignment(body: {
	subjectId: number
	userId: number
	/** Bắt buộc — phân công theo lớp */
	classId: number
	/** YYYY-MM-DD */
	teachingStart?: string | null
	/** YYYY-MM-DD — bắt buộc; hết hạn → không import đề */
	teachingEnd: string
	note?: string
}) {
	const resp = await jsonFetch<{ data: ExamAssignment }>(
		'/exam/assignments',
		{ method: 'POST', body: JSON.stringify(body) }
	)
	return resp.data
}

export async function UpdateExamAssignment(
	id: number,
	body: {
		subjectId?: number
		userId?: number
		classId?: number
		teachingStart?: string | null
		teachingEnd?: string | null
		note?: string | null
	}
) {
	const resp = await jsonFetch<{ data: ExamAssignment }>(
		`/exam/assignments/${id}`,
		{ method: 'PUT', body: JSON.stringify(body) }
	)
	return resp.data
}

export async function DeleteExamAssignment(id: number) {
	return jsonFetch<{ ok: boolean }>(`/exam/assignments/${id}`, {
		method: 'DELETE'
	})
}

export async function ListExamAssignmentLogs(params?: {
	limit?: number
	subjectId?: number
	userId?: number
}) {
	const sp = new URLSearchParams()
	if (params?.limit) sp.set('limit', String(params.limit))
	if (params?.subjectId) sp.set('subjectId', String(params.subjectId))
	if (params?.userId) sp.set('userId', String(params.userId))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamAssignmentLog[] }>(
		`/exam/assignment-logs${qs}`
	)
	return resp.data
}

export async function ListExamTeachers(params?: {
	q?: string
	facultyCode?: string
}) {
	const sp = new URLSearchParams()
	if (params?.q) sp.set('q', params.q)
	if (params?.facultyCode) sp.set('facultyCode', params.facultyCode)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamTeacherOption[] }>(
		`/exam/teachers${qs}`
	)
	return resp.data
}

export async function ListExamFacultyOptions() {
	const resp = await jsonFetch<{ data: ExamFacultyOption[] }>(
		'/exam/faculty-options'
	)
	return resp.data
}

/** Gán Chủ nhiệm khoa theo mã khoa (1 CNK / khoa) — admin */
export async function UpsertExamFacultyHead(body: {
	userId: number
	facultyCode: string
	note?: string
}) {
	const resp = await jsonFetch<{
		data: {
			id: number
			facultyCode: string
			facultyName: string | null
			userId: number
			username: string | null
			displayName: string | null
		}
	}>('/exam/faculty-heads', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function ListExamTeacherCatalog(params?: {
	facultyCode?: string
	q?: string
}) {
	const sp = new URLSearchParams()
	if (params?.facultyCode) sp.set('facultyCode', params.facultyCode)
	if (params?.q) sp.set('q', params.q)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamTeacherCatalog[] }>(
		`/exam/teacher-catalog${qs}`
	)
	return resp.data
}

export async function ListExamTeacherCandidates(q?: string) {
	const qs = q ? `?q=${encodeURIComponent(q)}` : ''
	const resp = await jsonFetch<{ data: ExamTeacherOption[] }>(
		`/exam/teacher-candidates${qs}`
	)
	return resp.data
}

/** Tạo TK mới + vào danh mục, hoặc gắn user có sẵn */
export async function CreateExamTeacherCatalog(body: {
	userId?: number
	username?: string
	password?: string
	displayName?: string
	facultyCode: string
	note?: string
}) {
	const resp = await jsonFetch<{ data: ExamTeacherCatalog }>(
		'/exam/teacher-catalog',
		{ method: 'POST', body: JSON.stringify(body) }
	)
	return resp.data
}

export async function UpdateExamTeacherCatalog(
	id: number,
	body: {
		facultyCode?: string
		displayName?: string
		note?: string | null
	}
) {
	const resp = await jsonFetch<{ data: ExamTeacherCatalog }>(
		`/exam/teacher-catalog/${id}`,
		{ method: 'PATCH', body: JSON.stringify(body) }
	)
	return resp.data
}

export async function DeleteExamTeacherCatalog(id: number) {
	return jsonFetch<{ ok: boolean }>(`/exam/teacher-catalog/${id}`, {
		method: 'DELETE'
	})
}

// ── Exams ──────────────────────────────────────────────────────

export async function ListExams(params?: {
	status?: string
	subjectId?: number
	majorId?: number
	mine?: boolean
	bank?: boolean
	pending?: boolean
}) {
	const sp = new URLSearchParams()
	if (params?.status) sp.set('status', params.status)
	if (params?.subjectId) sp.set('subjectId', String(params.subjectId))
	if (params?.majorId) sp.set('majorId', String(params.majorId))
	if (params?.mine) sp.set('mine', 'true')
	if (params?.bank) sp.set('bank', 'true')
	if (params?.pending) sp.set('pending', 'true')
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamItem[] }>(`/exam/exams${qs}`)
	return resp.data
}

export async function GetExam(id: number) {
	const resp = await jsonFetch<{ data: ExamItem }>(`/exam/exams/${id}`)
	return resp.data
}

export interface ExamDuplicateHit {
	id: number
	code: string
	title: string
	paperNumber: number | null
	status: string
	statusLabel: string
	reason: string
	/** hard = chặn; soft = cảnh báo, vẫn cho import/duyệt */
	severity?: 'hard' | 'soft'
}

/** Dò trùng từng đề: chặn khi ≥2 câu trùng; 1 câu / cùng số đề → cảnh báo */
export async function CheckExamDuplicates(body: {
	subjectId: number
	papers: Array<{
		paperNumber?: number | null
		title?: string
		questions?: Array<{ content?: string; answer?: string }>
	}>
}) {
	const resp = await jsonFetch<{
		data: Array<{
			index: number
			paperNumber: number | null
			title: string | null
			duplicates: ExamDuplicateHit[]
			warnings?: ExamDuplicateHit[]
			blocked?: boolean
		}>
	}>('/exam/check-duplicates', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function CreateExam(body: {
	title: string
	subjectId: number
	note?: string
	/** Số đề từ file import */
	paperNumber?: number | null
	/** Bắt buộc: lớp thi khi import */
	classId?: number | null
	className?: string | null
	durationMinutes?: number | null
	questionFileUrl?: string
	questionFileName?: string
	answerFileUrl?: string
	answerFileName?: string
	questions?: Array<{
		questionNumber?: number
		content: string
		answer?: string
		points?: number
	}>
	allowDuplicate?: boolean
}) {
	const resp = await jsonFetch<{ data: ExamItem }>('/exam/exams', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function UpdateExam(
	id: number,
	body: {
		title?: string
		note?: string
		classId?: number | null
		className?: string | null
		durationMinutes?: number | null
		questionFileUrl?: string | null
		questionFileName?: string | null
		answerFileUrl?: string | null
		answerFileName?: string | null
		questions?: Array<{
			questionNumber?: number
			content: string
			answer?: string
			points?: number
		}>
	}
) {
	const resp = await jsonFetch<{ data: ExamItem }>(`/exam/exams/${id}`, {
		method: 'PUT',
		body: JSON.stringify(body)
	})
	return resp.data
}

export async function DeleteExam(id: number) {
	return jsonFetch<{ ok: boolean }>(`/exam/exams/${id}`, {
		method: 'DELETE'
	})
}

export async function SubmitExam(id: number, note?: string) {
	const resp = await jsonFetch<{ data: ExamItem }>(
		`/exam/exams/${id}/submit`,
		{ method: 'POST', body: JSON.stringify({ note }) }
	)
	return resp.data
}

export async function DecideExam(
	id: number,
	decision: 'APPROVE' | 'RETURN',
	note?: string
) {
	const resp = await jsonFetch<{ data: ExamItem }>(
		`/exam/exams/${id}/decide`,
		{ method: 'POST', body: JSON.stringify({ decision, note }) }
	)
	return resp.data
}

export interface BghBoardPaper {
	exam: ExamItem
	rows: Array<{
		paperNumber: number | null
		questionNumber: number
		content: string
		answer: string
		points: number
	}>
}

/** Bảng duyệt theo cấp (CNK / Ban KT / BGH) — đủ số đề + câu + đáp án */
export async function ListApprovalBoard(params?: {
	majorId?: number
	subjectId?: number
}) {
	const sp = new URLSearchParams()
	if (params?.majorId) sp.set('majorId', String(params.majorId))
	if (params?.subjectId) sp.set('subjectId', String(params.subjectId))
	const qs = sp.toString() ? `?${sp}` : ''
	return jsonFetch<{
		level: string
		levelLabel: string
		data: BghBoardPaper[]
	}>(`/exam/approval-board${qs}`)
}

/** Alias BGH — path cũ */
export async function ListBghBoard(params?: {
	majorId?: number
	subjectId?: number
}) {
	const sp = new URLSearchParams()
	if (params?.majorId) sp.set('majorId', String(params.majorId))
	if (params?.subjectId) sp.set('subjectId', String(params.subjectId))
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: BghBoardPaper[] }>(
		`/exam/bgh-board${qs}`
	)
	return resp.data
}

/** BGH phê duyệt hàng loạt theo số đề hoặc id (trong phạm vi ngành/môn) */
export async function BghApproveBatch(body: {
	examIds?: number[]
	paperNumbers?: number[]
	numbersText?: string
	subjectId?: number
	majorId?: number
	note?: string
}) {
	return jsonFetch<{
		approved: number
		failed: Array<{ id?: number; paperNumber?: number; error: string }>
		data: ExamItem[]
	}>('/exam/bgh-approve-batch', {
		method: 'POST',
		body: JSON.stringify(body)
	})
}

/** Kho đề đã bốc / đã in */
export async function ListUsedExamVault(params?: {
	subjectId?: number
	printedOnly?: boolean
	q?: string
}) {
	const sp = new URLSearchParams()
	if (params?.subjectId) sp.set('subjectId', String(params.subjectId))
	if (params?.printedOnly) sp.set('printedOnly', 'true')
	if (params?.q) sp.set('q', params.q)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamDraw[] }>(`/exam/used-vault${qs}`)
	return resp.data
}

export interface ExamUsageDraw {
	id: number
	drawCode: string
	drawType: string
	paperNumber: number | null
	classId: number | null
	className: string | null
	drawnAt: string
	printedAt: string | null
	examDate: string | null
	location: string | null
}

export interface LookupExamByQrResult {
	exam: ExamItem
	usage: ExamUsageDraw[]
	activeUse: ExamUsageDraw | null
	matchedBy: string
	parsed: {
		examId: number | null
		examCode: string | null
		paperNumber: number | null
	}
}

/** Tra cứu đề + phiếu đang dùng theo nội dung QR */
export async function LookupExamByQr(qrText: string) {
	const resp = await jsonFetch<{ data: LookupExamByQrResult }>(
		'/exam/lookup-qr',
		{
			method: 'POST',
			body: JSON.stringify({ qrText })
		}
	)
	return resp.data
}

export async function GenerateExamQr(id: number) {
	const resp = await jsonFetch<{ data: ExamItem }>(
		`/exam/exams/${id}/generate-qr`,
		{ method: 'POST', body: JSON.stringify({}) }
	)
	return resp.data
}

export async function ListExamWorkflowLogs(id: number) {
	const resp = await jsonFetch<{ data: ExamWorkflowLog[] }>(
		`/exam/exams/${id}/logs`
	)
	return resp.data
}

export async function GetPendingExamCount() {
	const resp = await jsonFetch<{ count: number }>('/exam/pending-count')
	return resp.count
}

// ── Draws ──────────────────────────────────────────────────────

export async function DrawExam(body: {
	subjectId: number
	drawType: 'EVEN' | 'ODD'
	classId?: number
	className?: string
	examDate?: string
	examTime?: string
	location?: string
	note?: string
}) {
	const resp = await jsonFetch<{ data: ExamDraw }>('/exam/draws', {
		method: 'POST',
		body: JSON.stringify(body)
	})
	return resp.data
}

export interface ExamDrawPool {
	subjectId: number
	approvedTotal: number
	usedCount: number
	availableCount: number
	classHasEven: boolean
	classHasOdd: boolean
	className: string | null
}

/** Số đề còn lại trong pool + trạng thái Chẵn/Lẻ theo lớp */
export async function GetExamDrawPool(params: {
	subjectId: number
	classId?: number
}) {
	const sp = new URLSearchParams()
	sp.set('subjectId', String(params.subjectId))
	if (params.classId) sp.set('classId', String(params.classId))
	return jsonFetch<ExamDrawPool>(`/exam/draw-pool?${sp}`)
}

export async function ListExamDraws(params?: {
	subjectId?: number
	drawCode?: string
	examCode?: string
	classId?: number
	className?: string
	examDate?: string
	/** Ngày rút YYYY-MM-DD */
	drawnDate?: string
	drawType?: 'EVEN' | 'ODD' | string
	q?: string
}) {
	const sp = new URLSearchParams()
	if (params?.subjectId) sp.set('subjectId', String(params.subjectId))
	if (params?.drawCode) sp.set('drawCode', params.drawCode)
	if (params?.examCode) sp.set('examCode', params.examCode)
	if (params?.classId) sp.set('classId', String(params.classId))
	if (params?.className) sp.set('className', params.className)
	if (params?.examDate) sp.set('examDate', params.examDate)
	if (params?.drawnDate) sp.set('drawnDate', params.drawnDate)
	if (params?.drawType) sp.set('drawType', params.drawType)
	if (params?.q) sp.set('q', params.q)
	const qs = sp.toString() ? `?${sp}` : ''
	const resp = await jsonFetch<{ data: ExamDraw[] }>(`/exam/draws${qs}`)
	return resp.data
}

export async function LookupDrawByCode(drawCode: string) {
	const resp = await jsonFetch<{ data: ExamDraw }>(
		`/exam/draw-by-code/${encodeURIComponent(drawCode)}`
	)
	return resp.data
}

export async function ExportDrawPrint(
	id: number,
	kind: 'questions' | 'answers' = 'questions'
) {
	const resp = await jsonFetch<{
		filename: string
		contentType: string
		html: string
	}>(`/exam/draws/${id}/export?kind=${kind}`)
	return resp
}

/** Tải file về máy (không mở tab) */
export function downloadPrintHtml(filename: string, html: string) {
	const blob = new Blob([html], {
		type: 'application/octet-stream'
	})
	const url = URL.createObjectURL(blob)
	const a = document.createElement('a')
	a.href = url
	a.download = filename.endsWith('.html') ? filename : `${filename}.html`
	a.rel = 'noopener'
	a.style.display = 'none'
	document.body.appendChild(a)
	a.click()
	setTimeout(() => {
		a.remove()
		URL.revokeObjectURL(url)
	}, 1500)
}

/**
 * In HTML ngay — iframe ẩn (0×0), không render đề trong app.
 * Trình duyệt sẽ mở hộp thoại in (cần chọn máy in / Save as PDF).
 */
export function silentPrintHtml(html: string): Promise<void> {
	return new Promise((resolve) => {
		const iframe = document.createElement('iframe')
		iframe.setAttribute('aria-hidden', 'true')
		iframe.setAttribute('title', 'print')
		// Ngoài viewport — app không hiện nội dung đề
		iframe.style.cssText =
			'position:fixed;left:-10000px;top:0;width:1px;height:1px;border:0;opacity:0;pointer-events:none;'
		document.body.appendChild(iframe)

		let done = false
		const cleanup = () => {
			if (done) return
			done = true
			try {
				iframe.remove()
			} catch {
				/* ignore */
			}
			resolve()
		}

		const win = iframe.contentWindow
		const doc = iframe.contentDocument || win?.document
		if (!doc || !win) {
			cleanup()
			return
		}

		doc.open()
		doc.write(html)
		doc.close()

		const doPrint = () => {
			try {
				win.focus()
				const onAfter = () => cleanup()
				win.addEventListener('afterprint', onAfter, { once: true })
				// Fallback nếu afterprint không chạy
				setTimeout(cleanup, 120_000)
				win.print()
			} catch {
				cleanup()
			}
		}

		setTimeout(doPrint, 200)
	})
}

/**
 * Rút xong / xuất: IN NGAY (hộp thoại in).
 * Nội dung không hiện trong UI app — chỉ qua print dialog của trình duyệt.
 */
export async function printDrawExport(
	drawId: number,
	kind: 'questions' | 'answers' = 'questions'
) {
	const r = await ExportDrawPrint(drawId, kind)
	await silentPrintHtml(r.html)
	return r
}

/** Chỉ tải file, không in (khi cần) */
export async function downloadDrawExport(
	drawId: number,
	kind: 'questions' | 'answers' = 'questions'
) {
	const r = await ExportDrawPrint(drawId, kind)
	downloadPrintHtml(r.filename, r.html)
	return r
}

/** Biên bản bốc thăm đề thi */
export async function ExportDrawMinutes(params: {
	subjectId: number
	classId?: number
	drawIds?: number[]
	location?: string
	proctorName?: string
	studentName?: string
	studentClass?: string
}) {
	const sp = new URLSearchParams()
	sp.set('subjectId', String(params.subjectId))
	if (params.classId) sp.set('classId', String(params.classId))
	if (params.drawIds?.length) sp.set('drawIds', params.drawIds.join(','))
	if (params.location) sp.set('location', params.location)
	if (params.proctorName) sp.set('proctorName', params.proctorName)
	if (params.studentName) sp.set('studentName', params.studentName)
	if (params.studentClass) sp.set('studentClass', params.studentClass)
	return jsonFetch<{
		filename: string
		contentType: string
		html: string
	}>(`/exam/draw-minutes?${sp}`)
}

export async function printDrawMinutes(params: {
	subjectId: number
	classId?: number
	drawIds?: number[]
	location?: string
	proctorName?: string
	studentName?: string
	studentClass?: string
}) {
	const r = await ExportDrawMinutes(params)
	await silentPrintHtml(r.html)
	return r
}

/** Đề đã rút quá 3 ngày — không cho in */
export async function ListOverdueDraws() {
	const resp = await jsonFetch<{ data: ExamDraw[] }>('/exam/draws-overdue')
	return resp.data
}

/** Xuất bộ đề 3 phần (câu hỏi + đáp án + chữ ký BGH) — form giấy */
export async function ExportExamPackage(
	examId: number,
	opts?: { withSignatures?: boolean }
) {
	const sp = new URLSearchParams()
	if (opts?.withSignatures === false) sp.set('withSignatures', 'false')
	const qs = sp.toString() ? `?${sp}` : ''
	return jsonFetch<{
		filename: string
		contentType: string
		html: string
	}>(`/exam/exams/${examId}/export-package${qs}`)
}

export async function printExamPackage(
	examId: number,
	opts?: { withSignatures?: boolean }
) {
	const r = await ExportExamPackage(examId, opts)
	await silentPrintHtml(r.html)
	return r
}

export async function downloadExamPackage(
	examId: number,
	opts?: { withSignatures?: boolean }
) {
	const r = await ExportExamPackage(examId, opts)
	downloadPrintHtml(r.filename, r.html)
	return r
}

/** Xuất gộp nhiều đề đã duyệt cùng môn (+ lớp) — form giấy */
export async function ExportExamPackageBundle(params: {
	subjectId: number
	classId?: number
	withSignatures?: boolean
}) {
	const sp = new URLSearchParams()
	sp.set('subjectId', String(params.subjectId))
	if (params.classId) sp.set('classId', String(params.classId))
	if (params.withSignatures === false) sp.set('withSignatures', 'false')
	return jsonFetch<{
		filename: string
		contentType: string
		html: string
		paperCount: number
	}>(`/exam/export-package-bundle?${sp}`)
}

export async function printExamPackageBundle(params: {
	subjectId: number
	classId?: number
	withSignatures?: boolean
}) {
	const r = await ExportExamPackageBundle(params)
	await silentPrintHtml(r.html)
	return r
}

/** In / xuất bộ đề theo danh sách id đã chọn (ngân hàng hoặc duyệt đề) */
export async function ExportExamPackageSelected(
	examIds: number[],
	opts?: { withSignatures?: boolean; forReview?: boolean }
) {
	if (!examIds.length) throw new Error('Chọn ít nhất 1 đề')
	const sp = new URLSearchParams()
	sp.set('examIds', examIds.join(','))
	if (opts?.withSignatures === false) sp.set('withSignatures', 'false')
	if (opts?.forReview) sp.set('forReview', 'true')
	return jsonFetch<{
		filename: string
		contentType: string
		html: string
		paperCount: number
	}>(`/exam/export-package-selected?${sp}`)
}

export async function printExamPackageSelected(
	examIds: number[],
	opts?: { withSignatures?: boolean; forReview?: boolean }
) {
	const r = await ExportExamPackageSelected(examIds, opts)
	await silentPrintHtml(r.html)
	return r
}

export async function downloadExamPackageSelected(
	examIds: number[],
	opts?: { withSignatures?: boolean; forReview?: boolean }
) {
	const r = await ExportExamPackageSelected(examIds, opts)
	downloadPrintHtml(r.filename, r.html)
	return r
}

/**
 * Xuất bảng đề thi (GV) theo 3 mẫu:
 *  a = ĐỀ THI SỐ + Đáp án - Thang điểm
 *  b = bảng gộp Đề số|Câu|Nội dung|Đáp án|Điểm
 *  c = form giấy BỘ CÂU HỎI + ĐÁP ÁN
 * GV chỉ xuất sau khi hết thời gian giảng dạy lớp.
 */
export async function ExportTeacherExamBoard(params: {
	format: 'a' | 'b' | 'c'
	subjectId?: number
	examIds?: number[]
	withSignatures?: boolean
	/** Trang duyệt: xuất đề PENDING_* (mẫu A/B) */
	forReview?: boolean
}) {
	const sp = new URLSearchParams()
	sp.set('format', params.format)
	if (params.subjectId) sp.set('subjectId', String(params.subjectId))
	if (params.examIds?.length) sp.set('examIds', params.examIds.join(','))
	if (params.withSignatures === false) sp.set('withSignatures', 'false')
	if (params.forReview) sp.set('forReview', 'true')
	return jsonFetch<{
		filename: string
		contentType: string
		html: string
		format: string
		paperCount: number
	}>(`/exam/export-teacher-board?${sp}`)
}

export async function downloadTeacherExamBoard(params: {
	format: 'a' | 'b' | 'c'
	subjectId?: number
	examIds?: number[]
	withSignatures?: boolean
	forReview?: boolean
}) {
	const r = await ExportTeacherExamBoard(params)
	downloadPrintHtml(r.filename, r.html)
	return r
}

export async function printTeacherExamBoard(params: {
	format: 'a' | 'b' | 'c'
	subjectId?: number
	examIds?: number[]
	withSignatures?: boolean
	forReview?: boolean
}) {
	const r = await ExportTeacherExamBoard(params)
	await silentPrintHtml(r.html)
	return r
}
