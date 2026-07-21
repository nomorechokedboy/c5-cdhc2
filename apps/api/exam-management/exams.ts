/**
 * Soạn đề + quy trình duyệt 4 cấp + câu hỏi
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, asc, desc, eq, inArray, like, sql } from 'drizzle-orm'
import orm from '../database'
import {
	examClasses,
	examDraws,
	examFaculties,
	examFacultyHeads,
	examMajors,
	examQuestions,
	exams,
	examSubjects,
	examTeachingAssignments,
	examWorkflowLogs,
	type ExamStatus
} from '../schema/exam-bank'
import {
	canApproveAtStatus,
	canDeptHeadAccessMajor,
	canDeptHeadAccessSubject,
	canFinalApproveExam,
	canGenerateExamQr,
	canManageCatalogApi,
	examDecisionSummary,
	formatSignerLine,
	genExamCode,
	getDeptHeadFacultyCodes,
	getDeptHeadMajorIds,
	inferPaperNumber,
	genQrPayload,
	getActor,
	isBgh,
	isClassCohortExpired,
	isDeptHead,
	isExamOffice,
	isLecturer,
	isScopedDeptHead,
	isTeachingPeriodInactive,
	isTeachingPeriodEnded,
	getTeachingPeriodStatus,
	nextExamStatus,
	nowIso,
	parseExamQrPayload,
	resolveBghSignTitle,
	statusLabel,
	type ExamDecision
} from './helpers'
import { notifyExamWorkflow } from './notify'
import { users } from '../schema/users'

export interface QuestionBody {
	questionNumber?: number
	content: string
	answer?: string
	points?: number
}

export interface QuestionResponse {
	id: number
	examId: number
	questionNumber: number
	content: string
	answer: string | null
	points: number
}

export interface ExamResponse {
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
	approvedByRank: string | null
	approvedByPosition: string | null
	approvedBySignatureUrl: string | null
	approvedByTitle: string | null
	/** CNK duyệt — chữ ký CHỦ NHIỆM KHOA */
	deptHeadUserId: number | null
	deptHeadUsername: string | null
	deptHeadDisplayName: string | null
	deptHeadRank: string | null
	deptHeadSignatureUrl: string | null
	deptHeadApprovedAt: string | null
	qrCode: string | null
	locked: boolean
	/** Số đề từ import (Đề thi số n) */
	paperNumber: number | null
	/** Lớp thi gắn khi import */
	classId: number | null
	className: string | null
	durationMinutes: number | null
	questionFileUrl: string | null
	questionFileName: string | null
	answerFileUrl: string | null
	answerFileName: string | null
	note: string | null
	returnNote: string | null
	questions?: QuestionResponse[]
	questionCount?: number
}

export interface WorkflowLogResponse {
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

/** Ẩn data-URL base64 khi list (tránh response hàng MB làm sập trang ngân hàng) */
function stripHeavyFileUrl(url: string | null | undefined): string | null {
	if (!url) return null
	if (url.startsWith('data:')) return null
	return url
}

function mapExam(
	r: typeof exams.$inferSelect & {
		subjectCode?: string | null
		subjectName?: string | null
		majorId?: number | null
		majorCode?: string | null
		majorName?: string | null
		questionCount?: number
	},
	questions?: QuestionResponse[],
	opts?: { stripFileData?: boolean }
): ExamResponse {
	const strip = !!opts?.stripFileData
	// Tự sửa lệch: đã khóa + có QR nhưng status chưa APPROVED → hiển thị Đã phê duyệt
	let status = String(r.status || 'DRAFT')
	const hasQr = !!(r.qrCode && String(r.qrCode).trim().length > 5)
	if (r.locked && hasQr && status !== 'APPROVED' && status !== 'REJECTED') {
		status = 'APPROVED'
	}
	return {
		id: r.id,
		createdAt: r.createdAt,
		updatedAt: r.updatedAt,
		code: r.code,
		title: r.title,
		subjectId: r.subjectId,
		subjectCode: r.subjectCode ?? null,
		subjectName: r.subjectName ?? null,
		majorId: r.majorId ?? null,
		majorCode: r.majorCode ?? null,
		majorName: r.majorName ?? null,
		status,
		statusLabel: statusLabel(status),
		createdByUserId: r.createdByUserId,
		createdByUsername: r.createdByUsername,
		createdByDisplayName: r.createdByDisplayName,
		approvedByUserId: r.approvedByUserId,
		approvedByUsername: r.approvedByUsername,
		approvedByDisplayName: r.approvedByDisplayName,
		approvedAt: r.approvedAt,
		approvedByRank: r.approvedByRank ?? null,
		approvedByPosition: r.approvedByPosition ?? null,
		approvedBySignatureUrl: strip
			? stripHeavyFileUrl(r.approvedBySignatureUrl)
			: (r.approvedBySignatureUrl ?? null),
		approvedByTitle: r.approvedByTitle ?? null,
		deptHeadUserId: r.deptHeadUserId ?? null,
		deptHeadUsername: r.deptHeadUsername ?? null,
		deptHeadDisplayName: r.deptHeadDisplayName ?? null,
		deptHeadRank: r.deptHeadRank ?? null,
		deptHeadSignatureUrl: strip
			? stripHeavyFileUrl(r.deptHeadSignatureUrl)
			: (r.deptHeadSignatureUrl ?? null),
		deptHeadApprovedAt: r.deptHeadApprovedAt ?? null,
		qrCode: r.qrCode,
		locked: !!r.locked,
		paperNumber: r.paperNumber ?? inferPaperNumber(r.title, r.code) ?? null,
		classId: r.classId ?? null,
		className: r.className ?? null,
		durationMinutes: r.durationMinutes ?? 60,
		questionFileUrl: strip
			? stripHeavyFileUrl(r.questionFileUrl)
			: r.questionFileUrl,
		questionFileName: r.questionFileName,
		answerFileUrl: strip
			? stripHeavyFileUrl(r.answerFileUrl)
			: r.answerFileUrl,
		answerFileName: r.answerFileName,
		note: r.note,
		returnNote: r.returnNote,
		questions,
		questionCount: r.questionCount ?? questions?.length
	}
}

/**
 * Lấy profile + bắt buộc có chữ ký số (CNK / BGH).
 * Super admin được bỏ qua nếu chưa upload (vận hành).
 */
async function requireActorSignature(
	actor: Awaited<ReturnType<typeof getActor>>,
	roleLabel: string
): Promise<{
	rank: string | null
	position: string | null
	signatureUrl: string
	displayName: string
}> {
	const [approver] = await orm
		.select()
		.from(users)
		.where(eq(users.id, actor.userId))
		.limit(1)
	const signatureUrl = (approver?.signatureUrl || '').trim()
	if (!signatureUrl && !actor.isSuperAdmin) {
		throw APIError.failedPrecondition(
			`Tài khoản ${roleLabel} chưa có chữ ký số. Vào Trang cá nhân → Tải / đổi chữ ký, rồi duyệt lại.`
		)
	}
	return {
		rank: approver?.rank || null,
		position: approver?.position || null,
		signatureUrl:
			signatureUrl ||
			// super fallback placeholder (không chèn ảnh trống)
			'',
		displayName: actor.displayName
	}
}

/**
 * BGH phê duyệt cuối → APPROVED + QR + khóa + ngày/người duyệt + chữ ký số.
 * Dùng chung DecideExam / BghApproveBatch.
 */
async function applyBghFinalApprove(
	existing: typeof exams.$inferSelect,
	actor: Awaited<ReturnType<typeof getActor>>,
	note?: string | null
): Promise<typeof exams.$inferSelect> {
	const paper =
		existing.paperNumber ?? inferPaperNumber(existing.title, existing.code)
	const qrCode = genQrPayload(existing.code, existing.id, paper)
	const approvedAt = nowIso()

	const sig = await requireActorSignature(actor, 'BGH (Hiệu trưởng / Phó HT)')
	const [approver] = await orm
		.select()
		.from(users)
		.where(eq(users.id, actor.userId))
		.limit(1)
	const signTitle = resolveBghSignTitle({
		username: actor.username,
		position: approver?.position ?? sig.position,
		alias: approver?.alias,
		displayName: actor.displayName
	})

	const [row] = await orm
		.update(exams)
		.set({
			status: 'APPROVED',
			locked: true,
			qrCode,
			approvedAt,
			approvedByUserId: actor.userId,
			approvedByUsername: actor.username,
			approvedByDisplayName: actor.displayName,
			approvedByRank: sig.rank,
			approvedByPosition: sig.position,
			approvedBySignatureUrl: sig.signatureUrl || null,
			approvedByTitle: signTitle,
			returnNote: null,
			paperNumber: existing.paperNumber ?? paper ?? null
		})
		.where(eq(exams.id, existing.id))
		.returning()
	await writeLog(
		existing.id,
		'APPROVE',
		existing.status,
		'APPROVED',
		note ||
			`BGH (${signTitle}) phê duyệt cuối — QR + khóa → ngân hàng đề${paper != null ? ` (đề số ${paper})` : ''}${sig.signatureUrl ? ' + chữ ký số' : ''}`,
		actor
	)

	// Ngân hàng: loại đề APPROVED cũ trùng (cùng môn + số đề) — giữ bản mới
	await supersedeDuplicateBankExams({
		keepId: existing.id,
		subjectId: existing.subjectId,
		paperNumber: existing.paperNumber ?? paper ?? null,
		newCode: existing.code,
		actor
	})

	const majorRef = await loadExamMajorRef(existing.id)
	void notifyExamWorkflow({
		examId: existing.id,
		examCode: existing.code,
		examTitle: existing.title,
		action: 'APPROVE',
		fromStatus: existing.status,
		toStatus: 'APPROVED',
		actorId: actor.userId,
		note: note || null,
		createdByUserId: existing.createdByUserId,
		majorId: majorRef.majorId,
		majorCode: majorRef.majorCode,
		facultyCode: majorRef.facultyCode
	}).catch(() => {})
	return row!
}

/** Marker trên returnNote — đề bị thay trong ngân hàng (không hiện bank) */
const BANK_SUPERSEDED_PREFIX = 'SUPERSEDED_BY:'

function isBankSuperseded(returnNote: string | null | undefined): boolean {
	return String(returnNote || '').startsWith(BANK_SUPERSEDED_PREFIX)
}

/**
 * Ẩn khỏi ngân hàng các đề APPROVED trùng môn + số đề (giữ keepId).
 */
async function supersedeDuplicateBankExams(opts: {
	keepId: number
	subjectId: number
	paperNumber: number | null
	newCode: string
	actor: Awaited<ReturnType<typeof getActor>>
}): Promise<number> {
	const paper = opts.paperNumber
	if (paper == null || !Number.isFinite(paper) || paper <= 0) return 0

	const candidates = await orm
		.select()
		.from(exams)
		.where(
			and(
				eq(exams.subjectId, opts.subjectId),
				eq(exams.status, 'APPROVED' as ExamStatus),
				sql`${exams.id} != ${opts.keepId}`
			)
		)

	let n = 0
	for (const e of candidates) {
		if (isBankSuperseded(e.returnNote)) continue
		const pn = e.paperNumber ?? inferPaperNumber(e.title, e.code)
		if (pn == null || pn !== paper) continue
		await orm
			.update(exams)
			.set({
				returnNote: `${BANK_SUPERSEDED_PREFIX}${opts.keepId}`,
				// Giữ APPROVED + QR lịch sử; không hiện trong bank list
				note: [
					e.note,
					`Đã thay trong ngân hàng bởi ${opts.newCode} (trùng đề số ${paper})`
				]
					.filter(Boolean)
					.join(' · ')
			})
			.where(eq(exams.id, e.id))
		try {
			await writeLog(
				e.id,
				'SUPERSEDE',
				'APPROVED',
				'APPROVED',
				`Loại khỏi ngân hàng (trùng đề số ${paper}) — thay bằng #${opts.keepId} ${opts.newCode}`,
				opts.actor
			)
		} catch {
			/* ignore log failure */
		}
		n++
	}
	return n
}

/**
 * Ngân hàng: mỗi (môn + số đề) chỉ giữ 1 bản mới nhất; bỏ SUPERSEDED.
 */
function dedupeBankExamRows<
	T extends {
		exam: typeof exams.$inferSelect
	}
>(rows: T[]): T[] {
	const visible = rows.filter((r) => !isBankSuperseded(r.exam.returnNote))
	// key = subjectId:paperNumber → giữ id lớn nhất (mới hơn)
	const best = new Map<string, T>()
	for (const r of visible) {
		const paper =
			r.exam.paperNumber ?? inferPaperNumber(r.exam.title, r.exam.code)
		const key =
			paper != null && paper > 0
				? `${r.exam.subjectId}:p${paper}`
				: `${r.exam.subjectId}:id${r.exam.id}`
		const prev = best.get(key)
		if (!prev || r.exam.id > prev.exam.id) {
			best.set(key, r)
		}
	}
	return [...best.values()].sort((a, b) => b.exam.id - a.exam.id)
}

/** majorId / majorCode từ môn của đề — dùng lọc CNK nhận chuông */
async function loadExamMajorRef(examId: number): Promise<{
	majorId: number | null
	majorCode: string | null
	facultyCode: string | null
}> {
	const [row] = await orm
		.select({
			majorId: examMajors.id,
			majorCode: examMajors.code,
			facultyCode: examFaculties.code
		})
		.from(exams)
		.leftJoin(examSubjects, eq(exams.subjectId, examSubjects.id))
		.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
		.leftJoin(examFaculties, eq(examSubjects.facultyId, examFaculties.id))
		.where(eq(exams.id, examId))
		.limit(1)
	return {
		majorId: row?.majorId ?? null,
		majorCode: row?.majorCode ?? null,
		facultyCode: row?.facultyCode ?? null
	}
}

async function loadExamJoined(id: number) {
	const [row] = await orm
		.select({
			exam: exams,
			subjectCode: examSubjects.code,
			subjectName: examSubjects.name,
			majorId: examMajors.id,
			majorCode: examMajors.code,
			majorName: examMajors.name,
			facultyCode: examFaculties.code,
			facultyName: examFaculties.name
		})
		.from(exams)
		.leftJoin(examSubjects, eq(exams.subjectId, examSubjects.id))
		.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
		.leftJoin(examFaculties, eq(examSubjects.facultyId, examFaculties.id))
		.where(eq(exams.id, id))
		.limit(1)
	return row
}

async function writeLog(
	examId: number,
	action: string,
	fromStatus: string | null,
	toStatus: string | null,
	note: string | null,
	actor: Awaited<ReturnType<typeof getActor>>
) {
	await orm.insert(examWorkflowLogs).values({
		examId,
		action,
		fromStatus,
		toStatus,
		note,
		actorUserId: actor.userId,
		actorUsername: actor.username,
		actorDisplayName: actor.displayName
	})
}

async function replaceQuestions(examId: number, questions: QuestionBody[]) {
	await orm.delete(examQuestions).where(eq(examQuestions.examId, examId))
	if (!questions.length) return []
	const inserted = await orm
		.insert(examQuestions)
		.values(
			questions.map((q, i) => ({
				examId,
				questionNumber: q.questionNumber ?? i + 1,
				content: q.content.trim(),
				answer: q.answer?.trim() || null,
				points: q.points ?? 1
			}))
		)
		.returning()
	return inserted.map((q) => ({
		id: q.id,
		examId: q.examId,
		questionNumber: q.questionNumber,
		content: q.content,
		answer: q.answer,
		points: q.points
	}))
}

// ── List ────────────────────────────────────────────────────────

export const ListExams = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/exams' },
	async (q: {
		status?: Query<string>
		subjectId?: Query<number>
		majorId?: Query<number>
		mine?: Query<boolean>
		bank?: Query<boolean>
		pending?: Query<boolean>
	}): Promise<{ data: ExamResponse[] }> => {
		const actor = await getActor()
		const conditions = []

		if (q.subjectId)
			conditions.push(eq(exams.subjectId, Number(q.subjectId)))
		if (q.status) conditions.push(eq(exams.status, String(q.status)))
		if (q.bank === true || String(q.bank) === 'true') {
			conditions.push(eq(exams.status, 'APPROVED'))
		}
		if (q.mine === true || String(q.mine) === 'true') {
			conditions.push(eq(exams.createdByUserId, actor.userId))
		}
		if (q.pending === true || String(q.pending) === 'true') {
			const statuses: ExamStatus[] = []
			if (actor.isSuperAdmin) {
				statuses.push(
					'PENDING_DEPT',
					'PENDING_EXAM_OFFICE',
					'PENDING_BGH'
				)
			} else {
				if (isDeptHead(actor)) statuses.push('PENDING_DEPT')
				if (isExamOffice(actor)) statuses.push('PENDING_EXAM_OFFICE')
				if (isBgh(actor)) statuses.push('PENDING_BGH')
			}
			if (!statuses.length) return { data: [] }
			conditions.push(inArray(exams.status, statuses))
		}

		// GV thường (không quyền duyệt): chỉ đề của mình + ngân hàng APPROVED (không nội dung khi list)
		const isApprover =
			actor.isSuperAdmin ||
			isDeptHead(actor) ||
			isExamOffice(actor) ||
			isBgh(actor)
		if (
			!isApprover &&
			isLecturer(actor) &&
			!(q.bank === true || String(q.bank) === 'true') &&
			!(q.mine === true || String(q.mine) === 'true')
		) {
			conditions.push(eq(exams.createdByUserId, actor.userId))
		}

		const where = conditions.length ? and(...conditions) : undefined
		const wantBank = q.bank === true || String(q.bank) === 'true'

		let rows = await orm
			.select({
				exam: exams,
				subjectCode: examSubjects.code,
				subjectName: examSubjects.name,
				majorId: examMajors.id,
				majorCode: examMajors.code,
				majorName: examMajors.name,
				facultyCode: examFaculties.code
			})
			.from(exams)
			.leftJoin(examSubjects, eq(exams.subjectId, examSubjects.id))
			.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
			.leftJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.where(where)
			.orderBy(desc(exams.id))

		if (q.majorId) {
			const mid = Number(q.majorId)
			rows = rows.filter((r) => r.majorId === mid)
		}

		// CNK: ưu tiên theo KHOA; fallback ngành
		const facCodesList = await getDeptHeadFacultyCodes(actor)
		const cnkMajors = await getDeptHeadMajorIds(actor)
		if (facCodesList !== null && facCodesList.length) {
			const set = new Set(facCodesList.map((c) => c.toUpperCase()))
			rows = rows.filter(
				(r) =>
					r.facultyCode != null &&
					set.has(String(r.facultyCode).toUpperCase())
			)
		} else if (cnkMajors !== null) {
			if (!cnkMajors.length) {
				return { data: [] }
			}
			rows = rows.filter(
				(r) => r.majorId != null && cnkMajors.includes(r.majorId)
			)
		}

		// Ngân hàng: bỏ đề đã SUPERSEDED + mỗi môn+số đề chỉ 1 bản mới nhất
		if (wantBank) {
			rows = dedupeBankExamRows(rows)
		}

		const ids = rows.map((r) => r.exam.id)
		const countMap = new Map<number, number>()
		if (ids.length) {
			const counts = await orm
				.select({
					examId: examQuestions.examId,
					c: sql<number>`count(*)`
				})
				.from(examQuestions)
				.where(inArray(examQuestions.examId, ids))
				.groupBy(examQuestions.examId)
			for (const c of counts) countMap.set(c.examId, Number(c.c))
		}

		// List / ngân hàng: bỏ base64 file để response nhẹ, trang ngân hàng tải được
		const stripFiles = true
		return {
			data: rows.map((r) =>
				mapExam(
					{
						...r.exam,
						subjectCode: r.subjectCode,
						subjectName: r.subjectName,
						majorId: r.majorId,
						majorCode: r.majorCode,
						majorName: r.majorName,
						questionCount: countMap.get(r.exam.id) || 0
					},
					undefined,
					{ stripFileData: stripFiles }
				)
			)
		}
	}
)

export const GetExam = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/exams/:id' },
	async (params: { id: number }): Promise<{ data: ExamResponse }> => {
		const actor = await getActor()
		const row = await loadExamJoined(params.id)
		if (!row) throw APIError.notFound('Đề thi không tồn tại')

		const exam = row.exam
		const isOwner = exam.createdByUserId === actor.userId
		const isManager =
			actor.isSuperAdmin ||
			isDeptHead(actor) ||
			isExamOffice(actor) ||
			isBgh(actor)

		// CNK scoped: chỉ xem đề ngành mình (trừ đề mình soạn)
		if (
			isScopedDeptHead(actor) &&
			!isOwner &&
			!(await canDeptHeadAccessMajor(actor, row.majorId))
		) {
			throw APIError.permissionDenied(
				'Đề không thuộc ngành bạn phụ trách — không được xem/duyệt'
			)
		}

		/**
		 * Sau BGH duyệt: locked = true
		 * - Không ai sửa (UpdateExam chặn)
		 * - Người soạn (owner): không xem nội dung câu hỏi/đáp án
		 * - CNK / Ban KT / BGH / super: xem để vận hành (rút đề, QR, kiểm tra)
		 * - User khác: không xem chi tiết
		 */
		if (exam.locked && !isManager && !isOwner) {
			throw APIError.permissionDenied(
				'Đề đã phê duyệt và khóa — không cho xem/sửa'
			)
		}
		const hideContent =
			!!exam.locked &&
			(exam.status === 'APPROVED' || exam.locked) &&
			isOwner &&
			!isManager

		const qs = await orm
			.select()
			.from(examQuestions)
			.where(eq(examQuestions.examId, exam.id))
			.orderBy(examQuestions.questionNumber)

		// Đáp án: chỉ quản lý sau khi khóa; owner chỉ khi chưa khóa
		const showAnswers = isManager || (isOwner && !exam.locked)

		const questions = hideContent
			? []
			: qs.map((q) => ({
					id: q.id,
					examId: q.examId,
					questionNumber: q.questionNumber,
					content: q.content,
					answer: showAnswers ? q.answer : null,
					points: q.points
				}))

		return {
			data: mapExam(
				{
					...exam,
					subjectCode: row.subjectCode,
					subjectName: row.subjectName,
					majorId: row.majorId,
					majorCode: row.majorCode,
					majorName: row.majorName
				},
				questions
			)
		}
	}
)

function normalizeQText(s: string): string {
	return String(s || '')
		.normalize('NFC')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * Tập nội dung câu hỏi đã chuẩn hoá (không gộp đáp án).
 * **≥2 câu trùng** với đề/ngân hàng đã có → chặn import đề đó.
 * 0–1 câu trùng → vẫn cho import (1 câu chỉ cảnh báo soft).
 */
function questionContentSet(
	questions: Array<{ content?: string; answer?: string | null }>
): Set<string> {
	const set = new Set<string>()
	for (const q of questions) {
		const n = normalizeQText(q.content || '')
		if (n) set.add(n)
	}
	return set
}

/** Số câu trùng tối thiểu để chặn import (hard) */
const HARD_DUP_QUESTION_MIN = 2

/** Số câu (và preview) trùng giữa hai tập. */
function overlapQuestions(
	incoming: Set<string>,
	existing: Set<string>
): { count: number; samples: string[] } {
	const samples: string[] = []
	let count = 0
	for (const q of incoming) {
		if (existing.has(q)) {
			count++
			if (samples.length < 2) {
				samples.push(q.length > 80 ? `${q.slice(0, 80)}…` : q)
			}
		}
	}
	return { count, samples }
}

export interface ExamDuplicateHit {
	id: number
	code: string
	title: string
	paperNumber: number | null
	status: string
	statusLabel: string
	reason: string
	/**
	 * hard = ≥2 câu hỏi trùng → chặn tạo
	 * soft = 1 câu trùng hoặc cùng số đề / câu khác → cảnh báo, vẫn cho tạo
	 */
	severity: 'hard' | 'soft'
}

/**
 * Dò trùng **từng đề** trong cùng môn (kể cả đề đã vào ngân hàng / nháp / đang duyệt).
 * - Chặn (hard): **≥2 câu hỏi** trùng nội dung với một đề đã có, hoặc với đề khác trong cùng file.
 * - Cảnh báo (soft): chỉ 1 câu trùng, hoặc cùng số đề nhưng không câu nào giống → vẫn cho import.
 */
export const CheckExamDuplicates = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/exam/check-duplicates'
	},
	async (body: {
		subjectId: number
		papers: Array<{
			paperNumber?: number | null
			title?: string
			questions?: Array<{ content?: string; answer?: string }>
		}>
	}): Promise<{
		data: Array<{
			index: number
			paperNumber: number | null
			title: string | null
			/** Chỉ hard — client bỏ qua / chặn */
			duplicates: ExamDuplicateHit[]
			/** Soft — 1 câu trùng hoặc cùng số đề */
			warnings: ExamDuplicateHit[]
			/** true nếu có hard duplicate (≥2 câu) */
			blocked: boolean
		}>
	}> => {
		await getActor()
		if (!body.subjectId) {
			throw APIError.invalidArgument('Thiếu môn học')
		}
		const existing = await orm
			.select({
				id: exams.id,
				code: exams.code,
				title: exams.title,
				paperNumber: exams.paperNumber,
				status: exams.status
			})
			.from(exams)
			.where(eq(exams.subjectId, body.subjectId))

		const ids = existing.map((e) => e.id)
		/** examId → tập nội dung câu hỏi */
		const questionsByExam = new Map<number, Set<string>>()
		if (ids.length) {
			const allQ = await orm
				.select({
					examId: examQuestions.examId,
					content: examQuestions.content
				})
				.from(examQuestions)
				.where(inArray(examQuestions.examId, ids))
			for (const q of allQ) {
				const n = normalizeQText(q.content || '')
				if (!n) continue
				if (!questionsByExam.has(q.examId)) {
					questionsByExam.set(q.examId, new Set())
				}
				questionsByExam.get(q.examId)!.add(n)
			}
		}

		const results: Array<{
			index: number
			paperNumber: number | null
			title: string | null
			duplicates: ExamDuplicateHit[]
			warnings: ExamDuplicateHit[]
			blocked: boolean
		}> = []

		const papers = body.papers || []
		/** Câu hỏi từng đề trước trong file (để so ≥2 câu) */
		const priorInFile: Array<{ index: number; qset: Set<string> }> = []

		for (let i = 0; i < papers.length; i++) {
			const p = papers[i]!
			const pn =
				p.paperNumber != null && p.paperNumber > 0
					? Math.floor(p.paperNumber)
					: inferPaperNumber(p.title || '', null)
			const qset = questionContentSet(p.questions || [])
			const hard: ExamDuplicateHit[] = []
			const soft: ExamDuplicateHit[] = []

			// Trong file: ≥2 câu trùng với một đề trước → hard; đúng 1 câu → soft
			if (qset.size) {
				for (const prev of priorInFile) {
					const { count, samples } = overlapQuestions(qset, prev.qset)
					if (count <= 0) continue
					const sample =
						samples.length > 0 ? ` (vd: «${samples[0]}»)` : ''
					const hit = {
						id: 0,
						code: '(trong file import)',
						title: `Trùng với đề #${prev.index + 1} trong file`,
						paperNumber: pn,
						status: 'FILE',
						statusLabel: 'Trùng trong file',
						reason: '',
						severity: 'hard' as const
					}
					if (count >= HARD_DUP_QUESTION_MIN) {
						hard.push({
							...hit,
							severity: 'hard',
							reason: `Có ${count} câu hỏi trùng với đề #${prev.index + 1} trong file${sample} — không import đề này (≥${HARD_DUP_QUESTION_MIN} câu)`
						})
					} else {
						soft.push({
							...hit,
							severity: 'soft',
							reason: `Có ${count} câu trùng với đề #${prev.index + 1} trong file${sample} — vẫn cho import (cần ≥${HARD_DUP_QUESTION_MIN} câu mới chặn)`
						})
					}
				}
				priorInFile.push({ index: i, qset })
			}

			// DB + ngân hàng: ≥2 câu trùng một đề → hard; 1 câu → soft
			for (const e of existing) {
				const existSet = questionsByExam.get(e.id) || new Set()
				const { count, samples } = overlapQuestions(qset, existSet)
				const sample =
					samples.length > 0 ? ` (vd: «${samples[0]}»)` : ''

				if (count >= HARD_DUP_QUESTION_MIN) {
					hard.push({
						id: e.id,
						code: e.code,
						title: e.title,
						paperNumber: e.paperNumber,
						status: e.status,
						statusLabel: statusLabel(e.status),
						reason: `Có ${count} câu hỏi trùng với đề ${e.code} (${statusLabel(e.status)})${sample} — không import (≥${HARD_DUP_QUESTION_MIN} câu)`,
						severity: 'hard'
					})
					continue
				}

				if (count === 1) {
					soft.push({
						id: e.id,
						code: e.code,
						title: e.title,
						paperNumber: e.paperNumber,
						status: e.status,
						statusLabel: statusLabel(e.status),
						reason: `Có 1 câu hỏi trùng với đề ${e.code} (${statusLabel(e.status)})${sample} — vẫn cho import (cần ≥${HARD_DUP_QUESTION_MIN} câu mới chặn)`,
						severity: 'soft'
					})
					continue
				}

				// Cùng số đề nhưng không câu nào giống → soft
				if (pn != null && e.paperNumber === pn) {
					soft.push({
						id: e.id,
						code: e.code,
						title: e.title,
						paperNumber: e.paperNumber,
						status: e.status,
						statusLabel: statusLabel(e.status),
						reason: `Đã có đề số ${pn} (mã ${e.code}) nhưng không câu nào giống — vẫn cho import / đưa duyệt`,
						severity: 'soft'
					})
				}
			}

			results.push({
				index: i,
				paperNumber: pn,
				title: p.title || null,
				duplicates: hard,
				warnings: soft,
				blocked: hard.length > 0
			})
		}

		return { data: results }
	}
)

export const CreateExam = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/exams' },
	async (body: {
		title: string
		subjectId: number
		note?: string
		/** Số đề từ file import (Đề thi số n / cột Đề số) */
		paperNumber?: number | null
		/** Bắt buộc: lớp thi khi import (GV dạy môn → chọn lớp) */
		classId?: number | null
		className?: string | null
		durationMinutes?: number | null
		questionFileUrl?: string
		questionFileName?: string
		answerFileUrl?: string
		answerFileName?: string
		questions?: QuestionBody[]
		/** true = bỏ qua chặn trùng (không khuyến nghị) */
		allowDuplicate?: boolean
	}): Promise<{ data: ExamResponse }> => {
		const actor = await getActor()
		if (!isLecturer(actor) && !actor.isSuperAdmin) {
			throw APIError.permissionDenied('Chỉ giảng viên được soạn đề')
		}
		const title = (body.title || '').trim()
		if (!title || !body.subjectId) {
			throw APIError.invalidArgument('Thiếu tiêu đề hoặc môn học')
		}
		const [subj] = await orm
			.select()
			.from(examSubjects)
			.where(eq(examSubjects.id, body.subjectId))
			.limit(1)
		if (!subj) throw APIError.notFound('Môn học không tồn tại')

		// Lớp thi — bắt buộc khi import/soạn (đặc tả: GV chọn lớp)
		let classId: number | null = body.classId ?? null
		let className: string | null = body.className?.trim() || null
		if (classId) {
			const [cl] = await orm
				.select()
				.from(examClasses)
				.where(eq(examClasses.id, classId))
				.limit(1)
			if (!cl) {
				throw APIError.notFound(
					'Lớp không có trong danh mục lớp thi — thêm tại Đề thi → Danh mục'
				)
			}
			if (isClassCohortExpired(cl.cohort)) {
				throw APIError.failedPrecondition(
					`Lớp «${cl.name}» đã hết niên khóa (${cl.cohort || '—'}) — không import / soạn đề cho lớp này`
				)
			}
			className = cl.name
			classId = cl.id
		} else if (!className) {
			throw APIError.invalidArgument(
				'Vui lòng chọn lớp thi khi import / soạn đề'
			)
		}

		// Môn + lớp theo phân công; kiểm tra thời gian giảng dạy còn hiệu lực
		if (!actor.isSuperAdmin && !canManageCatalogApi(actor)) {
			const myAssigns = await orm
				.select({
					subjectId: examTeachingAssignments.subjectId,
					classId: examTeachingAssignments.classId,
					teachingStart: examTeachingAssignments.teachingStart,
					teachingEnd: examTeachingAssignments.teachingEnd
				})
				.from(examTeachingAssignments)
				.where(eq(examTeachingAssignments.userId, actor.userId))

			const onSubject = myAssigns.filter(
				(a) => a.subjectId === body.subjectId
			)
			if (!onSubject.length) {
				throw APIError.permissionDenied(
					'Bạn chỉ được import / soạn đề cho môn đã được phân công giảng dạy. Liên hệ CNK / Ban KT để được gán môn.'
				)
			}

			if (classId != null) {
				const onSlot = onSubject.filter((a) => a.classId === classId)
				if (!onSlot.length) {
					throw APIError.permissionDenied(
						'Bạn chưa được phân công môn này cho lớp đã chọn — không import đề lớp này.'
					)
				}
				// Cần ít nhất 1 phân công còn hiệu lực thời gian
				const active = onSlot.find(
					(a) =>
						!isTeachingPeriodInactive(
							a.teachingStart,
							a.teachingEnd
						)
				)
				if (!active) {
					const sample = onSlot[0]!
					const st = getTeachingPeriodStatus(
						sample.teachingStart,
						sample.teachingEnd
					)
					throw APIError.failedPrecondition(
						`Hết thời gian giảng dạy trên lớp này (${st.statusLabel}${
							sample.teachingEnd
								? `, đến ${sample.teachingEnd}`
								: ''
						}) — không import đề. Liên hệ khoa để gia hạn phân công.`
					)
				}
			}
		}
		const durationMinutes =
			body.durationMinutes != null && body.durationMinutes > 0
				? Math.floor(body.durationMinutes)
				: 60

		const paperNumber =
			body.paperNumber != null && body.paperNumber > 0
				? Math.floor(body.paperNumber)
				: inferPaperNumber(title, null)

		// Chặn khi ≥2 câu trùng với đề/ngân hàng cùng môn (nháp / duyệt / đã duyệt).
		// 0–1 câu giống → cho tạo / đưa duyệt.
		if (!body.allowDuplicate) {
			const qset = questionContentSet(body.questions || [])
			if (qset.size) {
				const sameSubject = await orm
					.select({
						id: exams.id,
						code: exams.code,
						status: exams.status
					})
					.from(exams)
					.where(eq(exams.subjectId, body.subjectId))
				const eids = sameSubject.map((e) => e.id)
				if (eids.length) {
					const allQ = await orm
						.select({
							examId: examQuestions.examId,
							content: examQuestions.content
						})
						.from(examQuestions)
						.where(inArray(examQuestions.examId, eids))
					const byExam = new Map<number, Set<string>>()
					for (const q of allQ) {
						const n = normalizeQText(q.content || '')
						if (!n) continue
						if (!byExam.has(q.examId))
							byExam.set(q.examId, new Set())
						byExam.get(q.examId)!.add(n)
					}
					const meta = new Map(
						sameSubject.map((e) => [e.id, e] as const)
					)
					for (const [eid, existSet] of byExam) {
						const { count, samples } = overlapQuestions(
							qset,
							existSet
						)
						if (count >= HARD_DUP_QUESTION_MIN) {
							const e = meta.get(eid)!
							const sample =
								samples.length > 0
									? ` (vd: «${samples[0]}»)`
									: ''
							throw APIError.alreadyExists(
								`Có ${count} câu hỏi trùng với đề đã có (mã ${e.code}, ${statusLabel(e.status)})${sample}. Từ ${HARD_DUP_QUESTION_MIN} câu giống trở lên — không import đề này.`
							)
						}
					}
				}
			}
		}

		const code = genExamCode(subj.code, paperNumber)
		const [row] = await orm
			.insert(exams)
			.values({
				code,
				title,
				subjectId: body.subjectId,
				paperNumber: paperNumber ?? null,
				status: 'DRAFT',
				createdByUserId: actor.userId,
				createdByUsername: actor.username,
				createdByDisplayName: actor.displayName,
				classId,
				className,
				durationMinutes,
				questionFileUrl: body.questionFileUrl || null,
				questionFileName: body.questionFileName || null,
				answerFileUrl: body.answerFileUrl || null,
				answerFileName: body.answerFileName || null,
				note: body.note || null
			})
			.returning()

		const questions = await replaceQuestions(row!.id, body.questions || [])
		await writeLog(row!.id, 'CREATE', null, 'DRAFT', null, actor)

		const joined = await loadExamJoined(row!.id)
		return {
			data: mapExam(
				{
					...joined!.exam,
					subjectCode: joined!.subjectCode,
					subjectName: joined!.subjectName,
					majorId: joined!.majorId,
					majorCode: joined!.majorCode,
					majorName: joined!.majorName
				},
				questions
			)
		}
	}
)

export const UpdateExam = api(
	{ auth: true, expose: true, method: 'PUT', path: '/exam/exams/:id' },
	async (params: {
		id: number
		title?: string
		note?: string
		classId?: number | null
		className?: string | null
		durationMinutes?: number | null
		questionFileUrl?: string | null
		questionFileName?: string | null
		answerFileUrl?: string | null
		answerFileName?: string | null
		questions?: QuestionBody[]
	}): Promise<{ data: ExamResponse }> => {
		const actor = await getActor()
		const [existing] = await orm
			.select()
			.from(exams)
			.where(eq(exams.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Đề không tồn tại')
		if (existing.locked || existing.status === 'APPROVED') {
			throw APIError.failedPrecondition(
				'Đề đã phê duyệt và khóa — không được xem/sửa nội dung'
			)
		}
		const editable =
			existing.status === 'DRAFT' || existing.status === 'RETURNED'
		if (!editable) {
			throw APIError.failedPrecondition(
				'Chỉ sửa đề ở trạng thái Nháp / Trả lại'
			)
		}
		const isOwner = existing.createdByUserId === actor.userId
		if (!isOwner && !actor.isSuperAdmin) {
			throw APIError.permissionDenied('Chỉ người soạn được sửa đề')
		}

		let classId = existing.classId
		let className = existing.className
		if (params.classId !== undefined) {
			if (params.classId) {
				const [cl] = await orm
					.select()
					.from(examClasses)
					.where(eq(examClasses.id, params.classId))
					.limit(1)
				if (!cl) throw APIError.notFound('Lớp thi không tồn tại')
				if (isClassCohortExpired(cl.cohort)) {
					throw APIError.failedPrecondition(
						`Lớp «${cl.name}» đã hết niên khóa (${cl.cohort || '—'}) — không gán đề cho lớp này`
					)
				}
				classId = cl.id
				className = cl.name
			} else {
				classId = null
				className = params.className?.trim() || null
			}
		}

		const [row] = await orm
			.update(exams)
			.set({
				title: params.title?.trim() || existing.title,
				note: params.note !== undefined ? params.note : existing.note,
				classId,
				className,
				durationMinutes:
					params.durationMinutes !== undefined
						? params.durationMinutes
						: existing.durationMinutes,
				questionFileUrl:
					params.questionFileUrl !== undefined
						? params.questionFileUrl
						: existing.questionFileUrl,
				questionFileName:
					params.questionFileName !== undefined
						? params.questionFileName
						: existing.questionFileName,
				answerFileUrl:
					params.answerFileUrl !== undefined
						? params.answerFileUrl
						: existing.answerFileUrl,
				answerFileName:
					params.answerFileName !== undefined
						? params.answerFileName
						: existing.answerFileName,
				status: 'DRAFT',
				returnNote: null
			})
			.where(eq(exams.id, params.id))
			.returning()

		let questions: QuestionResponse[] | undefined
		if (params.questions) {
			questions = await replaceQuestions(params.id, params.questions)
		} else {
			const qs = await orm
				.select()
				.from(examQuestions)
				.where(eq(examQuestions.examId, params.id))
				.orderBy(examQuestions.questionNumber)
			questions = qs.map((q) => ({
				id: q.id,
				examId: q.examId,
				questionNumber: q.questionNumber,
				content: q.content,
				answer: q.answer,
				points: q.points
			}))
		}

		await writeLog(
			params.id,
			'UPDATE',
			existing.status,
			'DRAFT',
			null,
			actor
		)

		const joined = await loadExamJoined(params.id)
		return {
			data: mapExam(
				{
					...joined!.exam,
					subjectCode: joined!.subjectCode,
					subjectName: joined!.subjectName,
					majorId: joined!.majorId,
					majorCode: joined!.majorCode,
					majorName: joined!.majorName
				},
				questions
			)
		}
	}
)

export const DeleteExam = api(
	{ auth: true, expose: true, method: 'DELETE', path: '/exam/exams/:id' },
	async (params: { id: number }): Promise<{ ok: boolean }> => {
		const actor = await getActor()
		const [existing] = await orm
			.select()
			.from(exams)
			.where(eq(exams.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Đề không tồn tại')
		if (existing.locked || existing.status === 'APPROVED') {
			throw APIError.failedPrecondition(
				'Đề đã phê duyệt và khóa — không được xóa'
			)
		}
		const isOwner = existing.createdByUserId === actor.userId
		if (!isOwner && !actor.isSuperAdmin) {
			throw APIError.permissionDenied('Không có quyền xóa')
		}
		await orm
			.delete(examQuestions)
			.where(eq(examQuestions.examId, params.id))
		await orm
			.delete(examWorkflowLogs)
			.where(eq(examWorkflowLogs.examId, params.id))
		await orm.delete(exams).where(eq(exams.id, params.id))
		return { ok: true }
	}
)

/** GV gửi đề → CNK */
export const SubmitExam = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/exam/exams/:id/submit'
	},
	async (params: {
		id: number
		note?: string
	}): Promise<{ data: ExamResponse }> => {
		const actor = await getActor()
		const [existing] = await orm
			.select()
			.from(exams)
			.where(eq(exams.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Đề không tồn tại')
		if (existing.locked || existing.status === 'APPROVED') {
			throw APIError.failedPrecondition(
				'Đề đã phê duyệt và khóa — không gửi/sửa được'
			)
		}
		if (existing.status !== 'DRAFT' && existing.status !== 'RETURNED') {
			throw APIError.failedPrecondition(
				'Chỉ gửi đề ở trạng thái Nháp / Trả lại'
			)
		}
		const isOwner = existing.createdByUserId === actor.userId
		if (!isOwner && !actor.isSuperAdmin) {
			throw APIError.permissionDenied('Chỉ người soạn được gửi duyệt')
		}

		const qs = await orm
			.select()
			.from(examQuestions)
			.where(eq(examQuestions.examId, params.id))
		// Bắt buộc có nội dung form (số đề + câu + đáp án) để các cấp duyệt được
		const hasQForm =
			qs.length > 0 && qs.some((q) => (q.content || '').trim())
		const hasAForm = qs.some((q) => (q.answer || '').trim())
		const hasQFile =
			!!existing.questionFileUrl || !!existing.questionFileName
		const hasAFile = !!existing.answerFileUrl || !!existing.answerFileName
		if (!hasQForm && !hasQFile) {
			throw APIError.failedPrecondition(
				'Đề cần có câu hỏi (import Word/txt để đổ form, hoặc nhập form)'
			)
		}
		if (!hasAForm && !hasAFile) {
			throw APIError.failedPrecondition(
				'Đề cần có đáp án cho các câu (import hoặc form)'
			)
		}
		// Ưu tiên form đầy đủ khi gửi duyệt để CNK/KT/BGH xem bảng gộp đề
		if (!hasQForm || !hasAForm) {
			throw APIError.failedPrecondition(
				'Để gửi duyệt, đề phải có đủ câu hỏi + đáp án trên form (import file Word/txt gộp đề để tự nạp). File đính kèm không thay thế nội dung xét duyệt.'
			)
		}

		const [row] = await orm
			.update(exams)
			.set({
				status: 'PENDING_DEPT',
				returnNote: null
			})
			.where(eq(exams.id, params.id))
			.returning()

		await writeLog(
			params.id,
			'SUBMIT',
			existing.status,
			'PENDING_DEPT',
			params.note || 'Gửi Chủ nhiệm khoa duyệt',
			actor
		)

		const majorRef = await loadExamMajorRef(params.id)
		void notifyExamWorkflow({
			examId: params.id,
			examTitle: existing.title,
			examCode: existing.code,
			actorId: actor.userId,
			action: 'SUBMIT',
			fromStatus: existing.status,
			toStatus: 'PENDING_DEPT',
			note: params.note,
			createdByUserId: existing.createdByUserId,
			majorId: majorRef.majorId,
			majorCode: majorRef.majorCode,
			facultyCode: majorRef.facultyCode
		}).catch(() => {})

		const joined = await loadExamJoined(params.id)
		return {
			data: mapExam({
				...joined!.exam,
				subjectCode: joined!.subjectCode,
				subjectName: joined!.subjectName,
				majorId: joined!.majorId,
				majorCode: joined!.majorCode,
				majorName: joined!.majorName
			})
		}
	}
)

/**
 * Duyệt / trả lại — đúng 3 cấp tuần tự:
 *   CNK (PENDING_DEPT) → Ban KT (PENDING_EXAM_OFFICE) → BGH (PENDING_BGH) → APPROVED
 * decision: APPROVE | RETURN
 */
export const DecideExam = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/exam/exams/:id/decide'
	},
	async (params: {
		id: number
		decision: 'APPROVE' | 'RETURN'
		note?: string
	}): Promise<{ data: ExamResponse }> => {
		const actor = await getActor()
		const [existing] = await orm
			.select()
			.from(exams)
			.where(eq(exams.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Đề không tồn tại')
		if (existing.locked || existing.status === 'APPROVED') {
			throw APIError.failedPrecondition('Đề đã hoàn tất phê duyệt')
		}

		const status = existing.status as ExamStatus
		if (
			!['PENDING_DEPT', 'PENDING_EXAM_OFFICE', 'PENDING_BGH'].includes(
				status
			)
		) {
			throw APIError.failedPrecondition(
				'Đề không ở trạng thái chờ duyệt (chỉ CNK / Ban KT / BGH)'
			)
		}

		const decision = params.decision as ExamDecision
		if (decision !== 'APPROVE' && decision !== 'RETURN') {
			throw APIError.invalidArgument(
				'decision phải là APPROVE hoặc RETURN'
			)
		}

		// Quyền đúng cấp — không duyệt vượt cấp
		if (!canApproveAtStatus(actor, status)) {
			const who =
				status === 'PENDING_DEPT'
					? 'Chủ nhiệm khoa (bước 1)'
					: status === 'PENDING_EXAM_OFFICE'
						? 'Ban Khảo thí (bước 2)'
						: 'BGH (bước 3 — phê duyệt cuối)'
			throw APIError.permissionDenied(
				`Chỉ ${who} được xử lý đề ở trạng thái «${statusLabel(status)}». ` +
					`Quy trình: GV gửi → CNK → Ban KT → BGH.`
			)
		}

		// CNK: duyệt đề thuộc khoa (ưu tiên) hoặc ngành được gán
		if (status === 'PENDING_DEPT' && isScopedDeptHead(actor)) {
			const joined = await loadExamJoined(params.id)
			const ok = await canDeptHeadAccessSubject(actor, {
				majorId: joined?.majorId,
				facultyCode: joined?.facultyCode
			})
			if (!ok) {
				throw APIError.permissionDenied(
					'Đề không thuộc khoa/ngành bạn phụ trách — không được duyệt'
				)
			}
		}

		// Super admin: APPROVE từ bất kỳ cấp chờ → thẳng APPROVED + QR + khóa
		// (tránh «đã duyệt» nhưng đề vẫn nằm hàng đợi ở cấp tiếp)
		if (
			decision === 'APPROVE' &&
			actor.isSuperAdmin &&
			(status === 'PENDING_DEPT' ||
				status === 'PENDING_EXAM_OFFICE' ||
				status === 'PENDING_BGH')
		) {
			// Thiếu chữ ký CNK: gán admin làm bước CNK (vận hành)
			if (!existing.deptHeadUserId) {
				const sig = await requireActorSignature(
					actor,
					'Chủ nhiệm khoa (admin vận hành)'
				)
				await orm
					.update(exams)
					.set({
						deptHeadUserId: actor.userId,
						deptHeadUsername: actor.username,
						deptHeadDisplayName: actor.displayName,
						deptHeadRank: sig.rank,
						deptHeadSignatureUrl: sig.signatureUrl || null,
						deptHeadApprovedAt: nowIso()
					})
					.where(eq(exams.id, existing.id))
				const [refreshed] = await orm
					.select()
					.from(exams)
					.where(eq(exams.id, existing.id))
					.limit(1)
				if (refreshed) Object.assign(existing, refreshed)
			}
			await applyBghFinalApprove(
				existing,
				actor,
				params.note ||
					`Admin phê duyệt cuối (bỏ qua trung gian từ ${statusLabel(status)}) → QR + khóa → ngân hàng`
			)
			const joined = await loadExamJoined(params.id)
			return {
				data: mapExam(
					{
						...joined!.exam,
						subjectCode: joined!.subjectCode,
						subjectName: joined!.subjectName,
						majorId: joined!.majorId,
						majorCode: joined!.majorCode,
						majorName: joined!.majorName
					},
					undefined,
					{ stripFileData: true }
				)
			}
		}

		const nextStatus = nextExamStatus(status, decision)
		if (!nextStatus) {
			throw APIError.failedPrecondition(
				`Không thể ${decision} từ trạng thái ${statusLabel(status)}`
			)
		}

		const summary = examDecisionSummary(status, nextStatus, decision)

		// BGH phê duyệt cuối: APPROVED + QR + khóa → ngân hàng đề
		if (decision === 'APPROVE' && status === 'PENDING_BGH') {
			if (!canFinalApproveExam(actor)) {
				throw APIError.permissionDenied(
					'Chỉ BGH (ht.cdhc2 / pht.cdhc2 / bgh.cdhc2) hoặc admin.cdhc2 được phê duyệt cuối, tạo QR và khóa đề. Ban Khảo thí chỉ thẩm định chuyển BGH — không khóa đề.'
				)
			}
			await applyBghFinalApprove(existing, actor, params.note || summary)
			const joined = await loadExamJoined(params.id)
			return {
				data: mapExam(
					{
						...joined!.exam,
						subjectCode: joined!.subjectCode,
						subjectName: joined!.subjectName,
						majorId: joined!.majorId,
						majorCode: joined!.majorCode,
						majorName: joined!.majorName
					},
					undefined,
					{ stripFileData: true }
				)
			}
		}

		// CNK / Ban KT / trả lại — tuyệt đối không set APPROVED / QR / khóa
		const action = decision === 'RETURN' ? 'RETURN' : 'APPROVE'

		// CNK duyệt: bắt buộc chữ ký → footer «CHỦ NHIỆM KHOA»
		let deptPatch: Partial<typeof exams.$inferInsert> = {}
		if (decision === 'APPROVE' && status === 'PENDING_DEPT') {
			const sig = await requireActorSignature(actor, 'Chủ nhiệm khoa')
			deptPatch = {
				deptHeadUserId: actor.userId,
				deptHeadUsername: actor.username,
				deptHeadDisplayName: actor.displayName,
				deptHeadRank: sig.rank,
				deptHeadSignatureUrl: sig.signatureUrl || null,
				deptHeadApprovedAt: nowIso()
			}
		}

		await orm
			.update(exams)
			.set({
				status: nextStatus,
				// Giữ nguyên khóa/QR cũ (không cấp mới ở bước CNK/KT)
				locked: !!existing.locked,
				qrCode: existing.qrCode,
				approvedAt: existing.approvedAt,
				approvedByUserId: existing.approvedByUserId,
				approvedByUsername: existing.approvedByUsername,
				approvedByDisplayName: existing.approvedByDisplayName,
				...deptPatch,
				returnNote:
					decision === 'RETURN' ? params.note || summary : null
			})
			.where(eq(exams.id, params.id))

		await writeLog(
			params.id,
			action,
			status,
			nextStatus,
			params.note || summary,
			actor
		)

		const majorRef = await loadExamMajorRef(params.id)
		void notifyExamWorkflow({
			examId: params.id,
			examTitle: existing.title,
			examCode: existing.code,
			actorId: actor.userId,
			action,
			fromStatus: status,
			toStatus: nextStatus,
			note: params.note || summary,
			createdByUserId: existing.createdByUserId,
			majorId: majorRef.majorId,
			majorCode: majorRef.majorCode,
			facultyCode: majorRef.facultyCode
		}).catch(() => {})

		const joined = await loadExamJoined(params.id)
		return {
			data: mapExam(
				{
					...joined!.exam,
					subjectCode: joined!.subjectCode,
					subjectName: joined!.subjectName,
					majorId: joined!.majorId,
					majorCode: joined!.majorCode,
					majorName: joined!.majorName
				},
				undefined,
				{ stripFileData: true }
			)
		}
	}
)

/** BGH tạo / tái tạo QR (nếu cần) */
export const GenerateExamQr = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/exam/exams/:id/generate-qr'
	},
	async (params: { id: number }): Promise<{ data: ExamResponse }> => {
		const actor = await getActor()
		if (!canGenerateExamQr(actor)) {
			throw APIError.permissionDenied(
				'Chỉ BGH (bgh.cdhc2) hoặc admin.cdhc2 được tạo mã QR và khóa đề. Ban Khảo thí không được.'
			)
		}
		const [existing] = await orm
			.select()
			.from(exams)
			.where(eq(exams.id, params.id))
			.limit(1)
		if (!existing) throw APIError.notFound('Đề không tồn tại')
		if (existing.status !== 'APPROVED') {
			throw APIError.failedPrecondition('Chỉ tạo QR cho đề đã phê duyệt')
		}
		const qrCode = genQrPayload(
			existing.code,
			existing.id,
			existing.paperNumber ??
				inferPaperNumber(existing.title, existing.code)
		)
		await orm
			.update(exams)
			.set({ qrCode, locked: true })
			.where(eq(exams.id, params.id))
		await writeLog(
			params.id,
			'GENERATE_QR',
			existing.status,
			existing.status,
			'Tạo mã QR vào ngân hàng đề',
			actor
		)

		const majorRef = await loadExamMajorRef(params.id)
		void notifyExamWorkflow({
			examId: params.id,
			examTitle: existing.title,
			examCode: existing.code,
			actorId: actor.userId,
			action: 'GENERATE_QR',
			fromStatus: existing.status,
			toStatus: existing.status,
			createdByUserId: existing.createdByUserId,
			majorId: majorRef.majorId,
			majorCode: majorRef.majorCode,
			facultyCode: majorRef.facultyCode
		}).catch(() => {})

		const joined = await loadExamJoined(params.id)
		return {
			data: mapExam({
				...joined!.exam,
				subjectCode: joined!.subjectCode,
				subjectName: joined!.subjectName,
				majorId: joined!.majorId,
				majorCode: joined!.majorCode,
				majorName: joined!.majorName
			})
		}
	}
)

export const ListExamWorkflowLogs = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/exams/:id/logs'
	},
	async (params: {
		id: number
	}): Promise<{ data: WorkflowLogResponse[] }> => {
		await getActor()
		const rows = await orm
			.select()
			.from(examWorkflowLogs)
			.where(eq(examWorkflowLogs.examId, params.id))
			.orderBy(desc(examWorkflowLogs.id))
		return {
			data: rows.map((r) => ({
				id: r.id,
				createdAt: r.createdAt,
				examId: r.examId,
				action: r.action,
				fromStatus: r.fromStatus,
				toStatus: r.toStatus,
				note: r.note,
				actorUserId: r.actorUserId,
				actorUsername: r.actorUsername,
				actorDisplayName: r.actorDisplayName
			}))
		}
	}
)

export const GetPendingExamCount = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/pending-count'
	},
	async (): Promise<{ count: number }> => {
		const actor = await getActor()
		const statuses: string[] = []
		if (actor.isSuperAdmin) {
			statuses.push('PENDING_DEPT', 'PENDING_EXAM_OFFICE', 'PENDING_BGH')
		} else {
			if (isDeptHead(actor)) statuses.push('PENDING_DEPT')
			if (isExamOffice(actor)) statuses.push('PENDING_EXAM_OFFICE')
			if (isBgh(actor)) statuses.push('PENDING_BGH')
		}
		if (!statuses.length) return { count: 0 }

		const facCodes = await getDeptHeadFacultyCodes(actor)
		const cnkMajors = await getDeptHeadMajorIds(actor)
		if (
			facCodes !== null &&
			!facCodes.length &&
			cnkMajors !== null &&
			!cnkMajors.length
		) {
			return { count: 0 }
		}

		const conditions = [inArray(exams.status, statuses)]
		if (facCodes !== null && facCodes.length) {
			conditions.push(inArray(examFaculties.code, facCodes))
			const [row] = await orm
				.select({ c: sql<number>`count(*)` })
				.from(exams)
				.innerJoin(examSubjects, eq(exams.subjectId, examSubjects.id))
				.innerJoin(
					examFaculties,
					eq(examSubjects.facultyId, examFaculties.id)
				)
				.where(and(...conditions))
			return { count: Number(row?.c || 0) }
		}
		if (cnkMajors !== null) {
			if (!cnkMajors.length) return { count: 0 }
			conditions.push(inArray(examSubjects.majorId, cnkMajors))
			const [row] = await orm
				.select({ c: sql<number>`count(*)` })
				.from(exams)
				.innerJoin(examSubjects, eq(exams.subjectId, examSubjects.id))
				.where(and(...conditions))
			return { count: Number(row?.c || 0) }
		}

		const [row] = await orm
			.select({ c: sql<number>`count(*)` })
			.from(exams)
			.where(and(...conditions))
		return { count: Number(row?.c || 0) }
	}
)

type ApprovalBoardItem = {
	exam: ExamResponse
	rows: Array<{
		paperNumber: number | null
		questionNumber: number
		content: string
		answer: string
		points: number
	}>
}

/**
 * Bảng duyệt theo cấp (CNK / Ban KT / BGH):
 * Chỉ đề GV đã gửi (pending đúng cấp của người xem).
 * Nội dung: Đề số | Câu | Nội dung | Đáp án | Điểm — theo ngành / môn.
 * BGH phê duyệt cuối → APPROVED → ngân hàng đề.
 */
export const ListApprovalBoard = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/approval-board' },
	async (q: {
		majorId?: Query<number>
		subjectId?: Query<number>
	}): Promise<{
		/** Cấp duyệt của user hiện tại */
		level: string
		levelLabel: string
		data: ApprovalBoardItem[]
	}> => {
		const actor = await getActor()
		const statuses: ExamStatus[] = []
		if (actor.isSuperAdmin) {
			statuses.push('PENDING_DEPT', 'PENDING_EXAM_OFFICE', 'PENDING_BGH')
		} else {
			if (isDeptHead(actor)) statuses.push('PENDING_DEPT')
			if (isExamOffice(actor)) statuses.push('PENDING_EXAM_OFFICE')
			if (isBgh(actor)) statuses.push('PENDING_BGH')
		}
		if (!statuses.length) {
			throw APIError.permissionDenied(
				'Bạn không có quyền duyệt đề ở cấp nào'
			)
		}

		const level =
			statuses.length > 1
				? 'MULTI'
				: statuses[0] === 'PENDING_DEPT'
					? 'CNK'
					: statuses[0] === 'PENDING_EXAM_OFFICE'
						? 'EXAM_OFFICE'
						: 'BGH'
		const levelLabel =
			level === 'CNK'
				? 'Chủ nhiệm khoa — bước 1'
				: level === 'EXAM_OFFICE'
					? 'Ban Khảo thí — bước 2'
					: level === 'BGH'
						? 'BGH — phê duyệt cuối (+ QR + ngân hàng)'
						: 'Nhiều cấp (admin)'

		const conditions = [inArray(exams.status, statuses)]
		if (q.subjectId) {
			conditions.push(eq(exams.subjectId, Number(q.subjectId)))
		}
		if (q.majorId) {
			conditions.push(eq(examSubjects.majorId, Number(q.majorId)))
		}

		// CNK: ưu tiên lọc theo KHOA (exam_faculty_heads); fallback ngành
		const facCodes = await getDeptHeadFacultyCodes(actor)
		const cnkMajors = await getDeptHeadMajorIds(actor)
		if (facCodes !== null && facCodes.length) {
			conditions.push(inArray(examFaculties.code, facCodes))
		} else if (cnkMajors !== null) {
			if (!cnkMajors.length) {
				return { level, levelLabel, data: [] }
			}
			conditions.push(inArray(examSubjects.majorId, cnkMajors))
		}

		const data = await buildApprovalBoardRows(conditions)
		return { level, levelLabel, data }
	}
)

/** Alias BGH (giữ path cũ) */
export const ListBghBoard = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/bgh-board' },
	async (q: {
		majorId?: Query<number>
		subjectId?: Query<number>
	}): Promise<{ data: ApprovalBoardItem[] }> => {
		const actor = await getActor()
		if (!canFinalApproveExam(actor) && !actor.isSuperAdmin) {
			throw APIError.permissionDenied(
				'Chỉ BGH / admin được xem bảng duyệt gộp đề'
			)
		}
		const conditions = [eq(exams.status, 'PENDING_BGH' as ExamStatus)]
		if (q.subjectId) {
			conditions.push(eq(exams.subjectId, Number(q.subjectId)))
		}
		if (q.majorId) {
			conditions.push(eq(examSubjects.majorId, Number(q.majorId)))
		}
		const data = await buildApprovalBoardRows(conditions)
		return { data }
	}
)

async function buildApprovalBoardRows(
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	conditions: any[]
): Promise<ApprovalBoardItem[]> {
	const list = await orm
		.select({
			exam: exams,
			subjectCode: examSubjects.code,
			subjectName: examSubjects.name,
			majorId: examMajors.id,
			majorCode: examMajors.code,
			majorName: examMajors.name,
			facultyCode: examFaculties.code,
			facultyName: examFaculties.name
		})
		.from(exams)
		.leftJoin(examSubjects, eq(exams.subjectId, examSubjects.id))
		.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
		.leftJoin(examFaculties, eq(examSubjects.facultyId, examFaculties.id))
		.where(and(...conditions))
		.orderBy(
			asc(examMajors.name),
			asc(examSubjects.name),
			asc(exams.paperNumber),
			asc(exams.id)
		)

	const out: ApprovalBoardItem[] = []

	const usedNums = new Set<number>()
	const resolved: Array<{
		r: (typeof list)[0]
		paper: number
	}> = []
	for (const r of list) {
		const paper =
			r.exam.paperNumber ?? inferPaperNumber(r.exam.title, r.exam.code)
		if (paper != null && paper > 0) usedNums.add(paper)
		resolved.push({ r, paper: paper && paper > 0 ? paper : 0 })
	}
	let next = 1
	for (const item of resolved) {
		if (item.paper > 0) continue
		while (usedNums.has(next)) next++
		item.paper = next
		usedNums.add(next)
		next++
	}
	resolved.sort((a, b) => a.paper - b.paper || a.r.exam.id - b.r.exam.id)

	for (const { r, paper } of resolved) {
		if (r.exam.paperNumber == null) {
			await orm
				.update(exams)
				.set({ paperNumber: paper })
				.where(eq(exams.id, r.exam.id))
		}
		const qs = await orm
			.select()
			.from(examQuestions)
			.where(eq(examQuestions.examId, r.exam.id))
			.orderBy(examQuestions.questionNumber)
		const mapped = mapExam(
			{
				...r.exam,
				paperNumber: paper,
				subjectCode: r.subjectCode,
				subjectName: r.subjectName,
				majorId: r.majorId,
				majorCode: r.majorCode,
				majorName: r.majorName
			},
			qs.map((qrow) => ({
				id: qrow.id,
				examId: qrow.examId,
				questionNumber: qrow.questionNumber,
				content: qrow.content,
				answer: qrow.answer,
				points: qrow.points
			}))
		)
		out.push({
			exam: mapped,
			rows: qs.map((qrow) => ({
				paperNumber: paper,
				questionNumber: qrow.questionNumber,
				content: qrow.content,
				answer: qrow.answer || '',
				points: qrow.points
			}))
		})
	}
	return out
}

/**
 * BGH phê duyệt hàng loạt theo số đề (paperNumber) hoặc id.
 * numbersText: "1,3,9" hoặc "1 3 9"
 */
export const BghApproveBatch = api(
	{
		auth: true,
		expose: true,
		method: 'POST',
		path: '/exam/bgh-approve-batch'
	},
	async (body: {
		examIds?: number[]
		paperNumbers?: number[]
		/** vd. "1, 3, 5-7" hoặc "1 9 10" */
		numbersText?: string
		/** Phạm vi duyệt theo môn */
		subjectId?: number
		/** Phạm vi duyệt theo ngành đào tạo */
		majorId?: number
		note?: string
	}): Promise<{
		approved: number
		failed: Array<{ id?: number; paperNumber?: number; error: string }>
		data: ExamResponse[]
	}> => {
		const actor = await getActor()
		if (!canFinalApproveExam(actor)) {
			throw APIError.permissionDenied(
				'Chỉ BGH / admin.cdhc2 được phê duyệt cuối'
			)
		}

		const paperSet = new Set<number>()
		for (const n of body.paperNumbers || []) {
			if (n > 0) paperSet.add(Math.floor(n))
		}
		const text = (body.numbersText || '').trim()
		if (text) {
			// 1,3,5-7 hoặc 1 3 5
			const parts = text.split(/[,;\s]+/).filter(Boolean)
			for (const p of parts) {
				const range = p.match(/^(\d+)\s*[-–—]\s*(\d+)$/)
				if (range) {
					const a = Number(range[1])
					const b = Number(range[2])
					const lo = Math.min(a, b)
					const hi = Math.max(a, b)
					for (let i = lo; i <= hi; i++) paperSet.add(i)
				} else {
					const n = Number(p)
					if (Number.isFinite(n) && n > 0) paperSet.add(Math.floor(n))
				}
			}
		}

		const idSet = new Set<number>((body.examIds || []).filter((x) => x > 0))

		// Super admin: duyệt cuối từ mọi cấp chờ; BGH thường: chỉ PENDING_BGH
		const pendingStatuses: ExamStatus[] = actor.isSuperAdmin
			? ['PENDING_DEPT', 'PENDING_EXAM_OFFICE', 'PENDING_BGH']
			: ['PENDING_BGH']

		let targets: (typeof exams.$inferSelect)[] = []

		// Ưu tiên examIds: load trực tiếp (không phụ thuộc lọc ngành/môn)
		if (idSet.size) {
			targets = await orm
				.select()
				.from(exams)
				.where(
					and(
						inArray(exams.id, [...idSet]),
						inArray(exams.status, pendingStatuses)
					)
				)
		}

		// Không có id / chưa khớp → khớp theo số đề trong phạm vi major/subject
		if (!targets.length && paperSet.size) {
			const conditions = [inArray(exams.status, pendingStatuses)]
			if (body.subjectId) {
				conditions.push(eq(exams.subjectId, body.subjectId))
			}
			if (body.majorId) {
				conditions.push(eq(examSubjects.majorId, body.majorId))
			}
			const pending = await orm
				.select({ exam: exams })
				.from(exams)
				.leftJoin(examSubjects, eq(exams.subjectId, examSubjects.id))
				.where(and(...conditions))
				.then((rows) => rows.map((r) => r.exam))
			targets = pending.filter((e) => {
				const pn = e.paperNumber ?? inferPaperNumber(e.title, e.code)
				return pn != null && paperSet.has(pn)
			})
		}

		if (!targets.length) {
			const scope = [
				body.majorId ? `ngành#${body.majorId}` : null,
				body.subjectId ? `môn#${body.subjectId}` : null
			]
				.filter(Boolean)
				.join(', ')
			const nums =
				paperSet.size > 0
					? [...paperSet].sort((a, b) => a - b).join(',')
					: idSet.size
						? `id ${[...idSet].join(',')}`
						: ''
			throw APIError.notFound(
				`Không tìm thấy đề chờ duyệt khớp${nums ? ` (${nums})` : ''}${scope ? ` · ${scope}` : ''}. ` +
					(actor.isSuperAdmin
						? 'Admin có thể duyệt đề ở mọi cấp chờ (CNK / KT / BGH).'
						: 'Chỉ đề trạng thái «Chờ BGH» mới phê duyệt cuối được.') +
					' Tick đúng đề trên bảng hoặc nhập số đề.'
			)
		}

		const approved: ExamResponse[] = []
		const failed: Array<{
			id?: number
			paperNumber?: number
			error: string
		}> = []

		for (let existing of targets) {
			try {
				// Super: đề chưa qua CNK → gán chữ ký CNK (admin) rồi phê duyệt cuối
				if (actor.isSuperAdmin && !existing.deptHeadUserId) {
					const sig = await requireActorSignature(
						actor,
						'Chủ nhiệm khoa (admin vận hành)'
					)
					const [patched] = await orm
						.update(exams)
						.set({
							deptHeadUserId: actor.userId,
							deptHeadUsername: actor.username,
							deptHeadDisplayName: actor.displayName,
							deptHeadRank: sig.rank,
							deptHeadSignatureUrl: sig.signatureUrl || null,
							deptHeadApprovedAt: nowIso()
						})
						.where(eq(exams.id, existing.id))
						.returning()
					if (patched) existing = patched
				}
				await applyBghFinalApprove(
					existing,
					actor,
					body.note ||
						(actor.isSuperAdmin && existing.status !== 'PENDING_BGH'
							? `Admin phê duyệt cuối (từ ${statusLabel(existing.status as ExamStatus)}) → ngân hàng`
							: body.note)
				)
				const joined = await loadExamJoined(existing.id)
				// Response nhẹ — không kèm câu hỏi / base64 file
				approved.push(
					mapExam(
						{
							...joined!.exam,
							subjectCode: joined!.subjectCode,
							subjectName: joined!.subjectName,
							majorId: joined!.majorId,
							majorCode: joined!.majorCode,
							majorName: joined!.majorName
						},
						undefined,
						{ stripFileData: true }
					)
				)
			} catch (e) {
				failed.push({
					id: existing.id,
					paperNumber: existing.paperNumber ?? undefined,
					error: e instanceof Error ? e.message : String(e)
				})
			}
		}

		return {
			approved: approved.length,
			failed,
			data: approved
		}
	}
)

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

/**
 * Tra cứu đề theo nội dung mã QR (quét / dán text / payload từ ảnh).
 * Trả về đề + các phiếu bốc đang / đã sử dụng (in).
 */
export const LookupExamByQr = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/lookup-qr' },
	async (body: {
		qrText: string
	}): Promise<{
		data: {
			exam: ExamResponse
			/** Phiếu bốc liên quan (đang dùng / đã in) */
			usage: ExamUsageDraw[]
			/** Phiếu mới nhất (đang sử dụng nếu có) */
			activeUse: ExamUsageDraw | null
			matchedBy: string
			parsed: {
				examId: number | null
				examCode: string | null
				paperNumber: number | null
			}
		}
	}> => {
		await getActor()
		const qrText = (body.qrText || '').trim()
		if (!qrText) {
			throw APIError.invalidArgument('Thiếu nội dung mã QR')
		}

		const parsed = parseExamQrPayload(qrText)
		let matchedBy = ''
		let examRow: typeof exams.$inferSelect | null = null

		// 0) Ưu tiên: dán thẳng mã đề (DT-… / mã in trên phiếu) — không cần QR
		const codeGuess = qrText.replace(/\s+/g, '').toUpperCase()
		if (codeGuess.length >= 3 && !codeGuess.startsWith('EXAM:')) {
			const [byPlain] = await orm
				.select()
				.from(exams)
				.where(sql`upper(${exams.code}) = ${codeGuess}`)
				.limit(1)
			if (byPlain) {
				examRow = byPlain
				matchedBy = 'examCode'
			}
			// Gần đúng: chứa mã chứa
			if (!examRow) {
				const fuzzy = await orm
					.select()
					.from(exams)
					.where(like(exams.code, `%${codeGuess}%`))
					.orderBy(desc(exams.id))
					.limit(5)
				if (fuzzy.length === 1) {
					examRow = fuzzy[0]!
					matchedBy = 'examCode~'
				} else if (fuzzy.length > 1) {
					examRow =
						fuzzy.find((e) => e.status === 'APPROVED') || fuzzy[0]!
					matchedBy = 'examCode~'
				}
			}
		}

		// 1) Khớp exact payload QR đã lưu
		if (!examRow) {
			const [byExact] = await orm
				.select()
				.from(exams)
				.where(eq(exams.qrCode, qrText))
				.limit(1)
			if (byExact) {
				examRow = byExact
				matchedBy = 'qrCode'
			}
		}

		// 2) Theo examId trong payload EXAM:{id}:...
		if (!examRow && parsed.examId) {
			const [byId] = await orm
				.select()
				.from(exams)
				.where(eq(exams.id, parsed.examId))
				.limit(1)
			if (byId) {
				examRow = byId
				matchedBy = 'examId'
			}
		}

		// 3) Theo mã đề trong payload QR
		if (!examRow && parsed.examCode) {
			const code = parsed.examCode.toUpperCase()
			const [byCode] = await orm
				.select()
				.from(exams)
				.where(sql`upper(${exams.code}) = ${code}`)
				.limit(1)
			if (byCode) {
				examRow = byCode
				matchedBy = 'examCode'
			}
		}

		// 4) Theo số đề (chỉ khi đã parse từ QR, không dùng số thuần nhập tay)
		if (
			!examRow &&
			parsed.paperNumber &&
			qrText.toUpperCase().includes('EXAM')
		) {
			const byPaper = await orm
				.select()
				.from(exams)
				.where(eq(exams.paperNumber, parsed.paperNumber))
				.orderBy(desc(exams.id))
				.limit(5)
			if (byPaper.length === 1) {
				examRow = byPaper[0]!
				matchedBy = 'paperNumber'
			} else if (byPaper.length > 1) {
				examRow =
					byPaper.find((e) => e.status === 'APPROVED') ||
					byPaper.find((e) => e.qrCode) ||
					byPaper[0]!
				matchedBy = 'paperNumber'
			}
		}

		if (!examRow) {
			throw APIError.notFound(
				'Không tìm thấy đề khớp mã đề. Nhập đúng mã đề (vd DT-…) đã bốc/sử dụng.'
			)
		}

		const joined = await loadExamJoined(examRow.id)
		const qs = await orm
			.select()
			.from(examQuestions)
			.where(eq(examQuestions.examId, examRow.id))
			.orderBy(examQuestions.questionNumber)

		const exam = mapExam(
			{
				...joined!.exam,
				subjectCode: joined!.subjectCode,
				subjectName: joined!.subjectName,
				majorId: joined!.majorId,
				majorCode: joined!.majorCode,
				majorName: joined!.majorName
			},
			qs.map((q) => ({
				id: q.id,
				examId: q.examId,
				questionNumber: q.questionNumber,
				content: q.content,
				answer: q.answer,
				points: q.points
			}))
		)

		const drawRows = await orm
			.select()
			.from(examDraws)
			.where(eq(examDraws.examId, examRow.id))
			.orderBy(desc(examDraws.drawnAt))
			.limit(50)

		const usage: ExamUsageDraw[] = drawRows.map((d) => ({
			id: d.id,
			drawCode: d.drawCode,
			drawType: d.drawType,
			paperNumber: d.paperNumber,
			classId: d.classId,
			className: d.className,
			drawnAt: d.drawnAt,
			printedAt: d.printedAt,
			examDate: d.examDate,
			location: d.location
		}))

		// Ưu tiên phiếu đã in gần nhất, không thì bốc gần nhất
		const activeUse = usage.find((u) => u.printedAt) || usage[0] || null

		return {
			data: {
				exam,
				usage,
				activeUse,
				matchedBy,
				parsed: {
					examId: parsed.examId,
					examCode: parsed.examCode,
					paperNumber: parsed.paperNumber
				}
			}
		}
	}
)

/**
 * HTML bộ đề (I. câu hỏi + II. đáp án + chữ ký BGH trái + CNK phải).
 * «Nơi nhận»: chữ ký + họ tên giáo viên soạn đề.
 * Chỉ dùng cho đề đã APPROVED.
 */
function buildExamPackageHtml(opts: {
	subjectName: string
	className: string
	durationMinutes: number
	examDate?: string | null
	codeLabel: string
	/** Tên khoa (vd Khoa Điều dưỡng) — hiện dưới tên trường */
	facultyName?: string | null
	papers: Array<{
		paperNumber: number | null
		code?: string
		questions: Array<{
			questionNumber: number
			content: string
			answer: string | null
			points: number
		}>
	}>
	// BGH
	approvedAt?: string | null
	approvedByTitle?: string | null
	approvedByRank?: string | null
	approvedByDisplayName?: string | null
	approvedByPosition?: string | null
	approvedBySignatureUrl?: string | null
	// CNK
	deptHeadRank?: string | null
	deptHeadDisplayName?: string | null
	deptHeadSignatureUrl?: string | null
	// Giảng viên soạn đề (nơi nhận)
	lecturerDisplayName?: string | null
	lecturerRank?: string | null
	lecturerSignatureUrl?: string | null
	lecturerUsername?: string | null
	/**
	 * true = in kèm ảnh chữ ký số (BGH / CNK / GV).
	 * false = để trống ô ký (ký tay sau khi in).
	 */
	includeSignatures?: boolean
}): string {
	const withSig = opts.includeSignatures !== false
	const mon = escapeHtmlPkg(opts.subjectName || '—')
	const lop = escapeHtmlPkg(opts.className || '—')
	const khoa = escapeHtmlPkg(
		(opts.facultyName || '').trim() || 'KHOA / BAN ĐÀO TẠO'
	)
	const duration = opts.durationMinutes || 60
	const ngayThi = opts.examDate
		? escapeHtmlPkg(
				String(opts.examDate)
					.slice(0, 10)
					.split('-')
					.reverse()
					.join('/')
			)
		: '…/…/…'

	const approvedAt = opts.approvedAt
		? String(opts.approvedAt).slice(0, 10)
		: ''
	const [ay, amo, ada] = approvedAt ? approvedAt.split('-') : ['', '', '']
	const signTitle = opts.approvedByTitle
		? escapeHtmlPkg(opts.approvedByTitle)
		: 'KT. HIỆU TRƯỞNG<br/>PHÓ HIỆU TRƯỞNG'
	const bghLine = escapeHtmlPkg(
		formatSignerLine({
			rank: opts.approvedByRank,
			displayName: opts.approvedByDisplayName,
			position: opts.approvedByPosition
		})
	)
	const bghImg =
		withSig && opts.approvedBySignatureUrl
			? `<img class="sig-img" src="${escapeHtmlPkg(opts.approvedBySignatureUrl)}" alt="CK BGH"/>`
			: '<div class="sig-space"></div>'

	// Có ký: in chữ ký + họ tên thật. Không ký: để trống (ký tay + ghi tên sau)
	const cnkNameClean = cleanSignerPersonName(opts.deptHeadDisplayName)
	const gvNameClean = cleanSignerPersonName(
		opts.lecturerDisplayName || opts.lecturerUsername
	)
	const cnkLine =
		withSig && cnkNameClean
			? escapeHtmlPkg(
					formatSignerLine({
						rank: opts.deptHeadRank,
						displayName: cnkNameClean
					})
				)
			: ''
	const cnkImg =
		withSig && opts.deptHeadSignatureUrl
			? `<img class="sig-img" src="${escapeHtmlPkg(opts.deptHeadSignatureUrl)}" alt="CK CNK"/>`
			: '<div class="sig-space"></div>'

	const gvLine =
		withSig && gvNameClean
			? escapeHtmlPkg(
					formatSignerLine({
						rank: opts.lecturerRank,
						displayName: gvNameClean
					})
				)
			: ''
	const gvImg =
		withSig && opts.lecturerSignatureUrl
			? `<img class="sig-img sig-img-gv" src="${escapeHtmlPkg(opts.lecturerSignatureUrl)}" alt="CK GV"/>`
			: '<div class="sig-space-sm"></div>'

	const qBlocks: string[] = []
	const aBlocks: string[] = []
	for (const p of opts.papers) {
		const de =
			p.paperNumber != null
				? `Đề số ${p.paperNumber}`
				: p.code
					? escapeHtmlPkg(p.code)
					: 'Đề'
		qBlocks.push(`<div class="de">${de}</div>`)
		if (!p.questions.length) {
			qBlocks.push('<p class="q"><i>Chưa có câu hỏi</i></p>')
			aBlocks.push(
				`<table class="ans-table"><tr><td class="ans-body" colspan="2"><b>${de}</b> — <i>Chưa có đáp án</i></td></tr></table>`
			)
			continue
		}
		// II. ĐÁP ÁN: tiêu đề đề + bảng từng câu (ý con xuống dòng, cột điểm)
		aBlocks.push(`<div class="de de-ans">${de}</div>`)
		for (const q of p.questions) {
			const ptsLabel = formatPts(q.points)
			qBlocks.push(
				`<div class="q"><b>Câu ${q.questionNumber}:</b> ${escapeHtmlPkg(q.content || '')}${ptsLabel ? ` <i>(${ptsLabel} điểm)</i>` : ''}</div>`
			)
			const ansRaw = (q.answer || '').trim()
			const lines = ansRaw
				? ansRaw
						.split(/\n+/)
						.map((l) => l.trim())
						.filter(Boolean)
				: []
			// 1 dòng tổng điểm câu + các ý (nếu có)
			let bodyHtml = `<b>Câu ${q.questionNumber}:</b> ${escapeHtmlPkg(q.content || '')}`
			if (lines.length === 1 && !/^[-–—•\d]/.test(lines[0]!)) {
				// Một đoạn đáp án liền
				bodyHtml += `<br/>${escapeHtmlPkg(lines[0]!)}`
			} else if (lines.length) {
				bodyHtml += lines
					.map((l) => {
						// «1. Chức năng» hoặc «- Ý … (0,5đ)»
						const cleaned = l.replace(/^[-–—•]\s*/, '')
						return `<br/>${escapeHtmlPkg(cleaned)}`
					})
					.join('')
			} else {
				bodyHtml += `<br/><i>(chưa có đáp án)</i>`
			}
			// Ý con: nếu nhiều dòng và có điểm lẻ, thêm hàng phụ
			const ideaRows: string[] = []
			if (lines.length > 1) {
				for (const l of lines) {
					const m = l.match(
						/^(.*?)(?:\s*[(（]?\s*(\d+[.,]\d+|\d+)\s*(?:điểm|đ)?\s*[)）]?\s*)?$/i
					)
					const text = (m?.[1] || l).replace(/^[-–—•]\s*/, '').trim()
					const pt = m?.[2] ? String(m[2]).replace('.', ',') : ''
					// Bỏ dòng trùng tiêu đề câu
					if (!text || text.length < 2) continue
					ideaRows.push(
						`<tr><td class="ans-body ans-idea">${escapeHtmlPkg(text)}</td><td class="pts">${escapeHtmlPkg(pt)}</td></tr>`
					)
				}
			}
			if (ideaRows.length > 1) {
				// Hàng tiêu đề câu (tổng điểm) + các ý
				aBlocks.push(
					`<table class="ans-table"><tr><td class="ans-body"><b>Câu ${q.questionNumber}:</b> ${escapeHtmlPkg(q.content || '')}</td><td class="pts">${ptsLabel}</td></tr>${ideaRows.join('')}</table>`
				)
			} else {
				aBlocks.push(
					`<table class="ans-table"><tr><td class="ans-body">${bodyHtml}</td><td class="pts">${ptsLabel}</td></tr></table>`
				)
			}
		}
	}

	const saveKhoa = khoa.toUpperCase().includes('KHOA') ? khoa : `KHOA ${khoa}`

	return `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/>
<title>Bộ câu hỏi - Đáp án — ${escapeHtmlPkg(opts.codeLabel)}</title>
<style>
  @page { margin: 14mm 16mm; }
  body{ font-family:"Times New Roman",Times,serif; max-width:820px; margin:12px auto; font-size:12.5pt; line-height:1.45; color:#000; }
  .header-table{ width:100%; border-collapse:collapse; }
  .header-table td{ width:50%; vertical-align:top; font-size:11pt; }
  .left-col{ text-align:center; }
  .right-col{ text-align:center; }
  .school,.country{ font-weight:700; text-transform:uppercase; }
  .khoa-line{ font-weight:700; text-transform:uppercase; margin-top:2px; }
  .motto{ font-style:italic; }
  .place-date{ font-style:italic; font-size:11pt; margin-top:4px; }
  .approve-box{ margin:10px auto 0; font-size:11pt; max-width:240px; }
  .approve-box .title{ font-weight:700; text-transform:uppercase; }
  .doc-title{ text-align:center; font-size:14pt; font-weight:700; margin:16px 0 8px; text-transform:uppercase; }
  .meta{ text-align:center; margin-bottom:14px; line-height:1.55; }
  h2{ font-size:13pt; margin:18px 0 8px; text-transform:uppercase; }
  .de{ text-align:center; font-weight:700; margin:14px 0 8px; }
  .de-ans{ margin-top:12px; }
  .q{ margin:8px 0; text-align:justify; }
  .ans-table{ width:100%; border-collapse:collapse; margin:0; }
  .ans-table td{ border:1px solid #000; padding:6px 8px; vertical-align:top; }
  .ans-table .pts{ width:52px; text-align:center; font-weight:700; white-space:nowrap; }
  .ans-body{ text-align:justify; }
  .ans-idea{ padding-left:14px !important; font-size:12pt; }
  /* Nơi nhận + 2 chữ ký trên 1 hàng */
  .footer-row{ display:flex; justify-content:space-between; align-items:flex-start; margin-top:22px; gap:12px; page-break-inside:avoid; }
  .footer-row .noi-nhan{ flex:0 0 32%; font-size:11pt; text-align:left; line-height:1.45; }
  .footer-row .sig-col{ flex:1; text-align:center; min-width:0; }
  .footer-row .role{ font-weight:700; text-transform:uppercase; margin-bottom:4px; font-size:11.5pt; }
  .sig-img{ max-height:72px; max-width:160px; display:block; margin:8px auto; object-fit:contain; background:transparent; mix-blend-mode:multiply; }
  .sig-img-gv{ max-height:64px; }
  .sig-space{ height:64px; }
  .sig-space-sm{ height:64px; }
  .sig-name-blank{ height:1.4em; margin-top:4px; }
  @media print{ body{ margin:0; } }
</style></head><body>
<table class="header-table"><tr>
  <td class="left-col">
    <div class="school">TRƯỜNG CAO ĐẲNG HẬU CẦN 2</div>
    <div class="khoa-line">${saveKhoa}</div>
    <div class="approve-box">
      <div class="title">PHÊ DUYỆT</div>
      <div>Ngày ${ada || '…'} tháng ${amo || '…'} năm ${ay || '…'}</div>
      <div class="title" style="margin-top:10px">${signTitle}</div>
      ${bghImg}
      <div><b>${bghLine || '—'}</b></div>
    </div>
  </td>
  <td class="right-col">
    <div class="country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
    <div class="place-date">Thành phố Hồ Chí Minh, ngày … tháng … năm …</div>
  </td>
</tr></table>
<div class="doc-title">BỘ CÂU HỎI - ĐÁP ÁN THI TỰ LUẬN</div>
<div class="meta">
  <div><b>Môn:</b> ${mon}</div>
  <div><b>Lớp:</b> ${lop}</div>
  <div><b>Ngày thi:</b> ${ngayThi}</div>
  <div><b>Thời gian thi:</b> ${duration} phút</div>
</div>
<h2>I. BỘ CÂU HỎI</h2>
${qBlocks.join('\n')}
<h2>II. ĐÁP ÁN</h2>
<table class="ans-table" style="margin-bottom:4px">
  <tr><th style="border:1px solid #000;padding:6px 8px;text-align:left;background:#f5f5f5">Nội dung</th>
  <th style="border:1px solid #000;padding:6px 8px;width:52px;text-align:center;background:#f5f5f5">Điểm</th></tr>
</table>
${aBlocks.join('\n')}
<div class="footer-row">
  <div class="noi-nhan">
    <div><b><i>Nơi nhận:</i></b></div>
    <div>- Ban Giám hiệu (để phê duyệt);</div>
    <div>- Ban KT&amp;ĐBCLGDĐT;</div>
    <div>- Lưu ${saveKhoa}.</div>
  </div>
  <div class="sig-col">
    <div class="role">Giảng viên soạn đề</div>
    ${gvImg}
    ${gvLine ? `<div><b>${gvLine}</b></div>` : '<div class="sig-name-blank"></div>'}
  </div>
  <div class="sig-col">
    <div class="role">CHỦ NHIỆM KHOA</div>
    ${cnkImg}
    ${cnkLine ? `<div><b>${cnkLine}</b></div>` : '<div class="sig-name-blank"></div>'}
  </div>
</div>
</body></html>`
}

/**
 * Bỏ prefix seed «GV — » / «CNK — Khoa …» → họ tên thật để in.
 * «CNK — Khoa Dược» không phải tên người → trả rỗng (sẽ load từ profile).
 */
function cleanSignerPersonName(raw?: string | null): string {
	let s = (raw || '').trim()
	if (!s) return ''
	// GV — Nguyễn Văn A → Nguyễn Văn A
	s = s.replace(/^GV\s*[—–-]\s*/i, '').trim()
	// CNK — Khoa Dược / Chủ nhiệm khoa … → không dùng làm tên in
	if (
		/^CNK\b/i.test(s) ||
		/^chủ\s*nhiệm\s*khoa\b/i.test(s) ||
		/^khoa\s+/i.test(s)
	) {
		// «CNK — Nguyễn Văn A» (có tên sau) → lấy phần sau
		const after = s
			.replace(/^CNK\s*[—–-]\s*/i, '')
			.replace(/^chủ\s*nhiệm\s*khoa\s*[—–-]?\s*/i, '')
			.trim()
		if (!after || /^khoa\b/i.test(after) || after.length < 3) {
			return ''
		}
		// Vẫn còn «Khoa Dược» → rỗng
		if (/^khoa\s+/i.test(after)) return ''
		return after
	}
	return s
}

/** Lấy chữ ký / cấp bậc GV soạn đề từ profile user */
async function loadLecturerForExport(exam: {
	createdByUserId: number | null
	createdByDisplayName: string | null
	createdByUsername: string | null
}): Promise<{
	lecturerDisplayName: string | null
	lecturerRank: string | null
	lecturerSignatureUrl: string | null
	lecturerUsername: string | null
}> {
	const base = {
		lecturerDisplayName:
			cleanSignerPersonName(exam.createdByDisplayName) ||
			exam.createdByDisplayName ||
			null,
		lecturerRank: null as string | null,
		lecturerSignatureUrl: null as string | null,
		lecturerUsername: exam.createdByUsername || null
	}
	if (!exam.createdByUserId) return base
	const [u] = await orm
		.select()
		.from(users)
		.where(eq(users.id, exam.createdByUserId))
		.limit(1)
	if (!u) return base
	const person =
		cleanSignerPersonName(u.displayName) ||
		cleanSignerPersonName(exam.createdByDisplayName) ||
		u.displayName ||
		exam.createdByDisplayName ||
		u.username
	return {
		lecturerDisplayName: person,
		lecturerRank: u.rank || null,
		lecturerSignatureUrl: u.signatureUrl || null,
		lecturerUsername: u.username || exam.createdByUsername || null
	}
}

/**
 * CNK để in form: ưu tiên đề đã chèn khi duyệt; bổ sung profile + faculty head.
 * Tên in = họ tên người (không «CNK — Khoa …»); chữ ký = profile CNK nếu có.
 */
async function loadCnkForExport(opts: {
	facultyCode?: string | null
	deptHeadUserId?: number | null
	deptHeadDisplayName?: string | null
	deptHeadRank?: string | null
	deptHeadSignatureUrl?: string | null
	deptHeadUsername?: string | null
}): Promise<{
	deptHeadDisplayName: string | null
	deptHeadRank: string | null
	deptHeadSignatureUrl: string | null
}> {
	let userId = opts.deptHeadUserId ?? null
	let name = cleanSignerPersonName(opts.deptHeadDisplayName)
	let rank = opts.deptHeadRank || null
	let sig = (opts.deptHeadSignatureUrl || '').trim() || null

	// Tìm CNK theo khoa nếu chưa có user / tên người
	const fac = (opts.facultyCode || '').trim().toUpperCase()
	if ((!userId || !name) && fac) {
		const [head] = await orm
			.select()
			.from(examFacultyHeads)
			.where(sql`upper(${examFacultyHeads.facultyCode}) = ${fac}`)
			.limit(1)
		if (head) {
			if (!userId) userId = head.userId
			if (!name) {
				name =
					cleanSignerPersonName(head.displayName) ||
					cleanSignerPersonName(head.username) ||
					null
			}
		}
	}

	if (userId) {
		const [u] = await orm
			.select()
			.from(users)
			.where(eq(users.id, userId))
			.limit(1)
		if (u) {
			const person =
				cleanSignerPersonName(u.displayName) || name || u.username
			name = person
			rank = rank || u.rank || null
			if (!sig && u.signatureUrl) sig = u.signatureUrl
		}
	}

	return {
		deptHeadDisplayName: name || null,
		deptHeadRank: rank,
		deptHeadSignatureUrl: sig
	}
}

/** Parse query withSignatures / withSig / sign — mặc định true */
function parseIncludeSignatures(q: {
	withSignatures?: boolean | string | null
}): boolean {
	const v = q.withSignatures
	if (v === false || v === 'false' || v === '0' || v === 'no') return false
	return true
}

/**
 * Phân công của GV cho môn (+ lớp): đã hết thời gian giảng dạy?
 */
async function lecturerTeachingEndedForExam(
	userId: number,
	exam: { subjectId: number; classId: number | null }
): Promise<{ ok: boolean; reason?: string }> {
	const conditions = [
		eq(examTeachingAssignments.userId, userId),
		eq(examTeachingAssignments.subjectId, exam.subjectId)
	]
	if (exam.classId != null) {
		conditions.push(eq(examTeachingAssignments.classId, exam.classId))
	}

	const assigns = await orm
		.select({
			teachingStart: examTeachingAssignments.teachingStart,
			teachingEnd: examTeachingAssignments.teachingEnd
		})
		.from(examTeachingAssignments)
		.where(and(...conditions))

	if (!assigns.length) {
		return {
			ok: false,
			reason: 'Không có phân công giảng dạy cho môn/lớp này — không thể xuất đề'
		}
	}

	const ended = assigns.some((a) =>
		isTeachingPeriodEnded(a.teachingStart, a.teachingEnd)
	)
	if (!ended) {
		const sample = assigns[0]!
		const period = getTeachingPeriodStatus(
			sample.teachingStart,
			sample.teachingEnd
		)
		return {
			ok: false,
			reason:
				`Chỉ được xuất/tải đề sau khi kết thúc thời gian giảng dạy lớp đó. ` +
				`Hiện: ${period.statusLabel}` +
				(sample.teachingEnd ? ` (đến ${sample.teachingEnd})` : '') +
				'. Khi còn trong khóa dạy thì không cho tải.'
		}
	}
	return { ok: true }
}

/**
 * Xuất bộ đề 1 mã đề (I + II + chữ ký BGH + CNK) — form giấy.
 * withSignatures=false → để trống ô ký (ký tay).
 */
export const ExportExamPackage = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/exams/:id/export-package'
	},
	async (params: {
		id: number
		withSignatures?: Query<boolean>
	}): Promise<{
		filename: string
		contentType: string
		html: string
	}> => {
		const actor = await getActor()
		if (
			!actor.isSuperAdmin &&
			!isBgh(actor) &&
			!isExamOffice(actor) &&
			!isDeptHead(actor)
		) {
			throw APIError.permissionDenied('Không có quyền xuất bộ đề')
		}

		const joined = await loadExamJoined(params.id)
		if (!joined) throw APIError.notFound('Đề không tồn tại')
		const exam = joined.exam
		// Đề đang duyệt (CNK/KT/BGH) hoặc đã APPROVED — không xuất nháp/trả lại
		const exportableStatuses: ExamStatus[] = [
			'PENDING_DEPT',
			'PENDING_EXAM_OFFICE',
			'PENDING_BGH',
			'APPROVED'
		]
		if (!exportableStatuses.includes(exam.status as ExamStatus)) {
			throw APIError.failedPrecondition(
				'Chỉ xuất bộ đề khi đề đã gửi duyệt hoặc đã phê duyệt. Đề đang ở: ' +
					statusLabel(exam.status)
			)
		}
		const qs = await orm
			.select()
			.from(examQuestions)
			.where(eq(examQuestions.examId, exam.id))
			.orderBy(examQuestions.questionNumber)

		const paper =
			exam.paperNumber ?? inferPaperNumber(exam.title, exam.code)

		const lecturer = await loadLecturerForExport(exam)
		const includeSignatures = parseIncludeSignatures(params)
		const cnkResolved = await loadCnkForExport({
			facultyCode: joined.facultyCode ?? null,
			deptHeadUserId: exam.deptHeadUserId,
			deptHeadDisplayName: exam.deptHeadDisplayName,
			deptHeadRank: exam.deptHeadRank,
			deptHeadSignatureUrl: exam.deptHeadSignatureUrl,
			deptHeadUsername: exam.deptHeadUsername
		})

		const html = buildExamPackageHtml({
			subjectName: joined.subjectName || '—',
			className: exam.className || '—',
			durationMinutes: exam.durationMinutes || 60,
			codeLabel: exam.code,
			facultyName: joined.facultyName || null,
			papers: [
				{
					paperNumber: paper,
					code: exam.code,
					questions: qs.map((q) => ({
						questionNumber: q.questionNumber,
						content: q.content,
						answer: q.answer,
						points: q.points
					}))
				}
			],
			approvedAt: exam.approvedAt,
			approvedByTitle: exam.approvedByTitle,
			approvedByRank: exam.approvedByRank,
			approvedByDisplayName: exam.approvedByDisplayName,
			approvedByPosition: exam.approvedByPosition,
			approvedBySignatureUrl: exam.approvedBySignatureUrl,
			deptHeadRank: cnkResolved.deptHeadRank,
			deptHeadDisplayName: cnkResolved.deptHeadDisplayName,
			deptHeadSignatureUrl: cnkResolved.deptHeadSignatureUrl,
			...lecturer,
			includeSignatures
		})

		return {
			filename: `bo-de-${exam.code}${includeSignatures ? '' : '-khong-ky'}.html`,
			contentType: 'text/html; charset=utf-8',
			html
		}
	}
)

/**
 * Xuất gộp nhiều đề cùng môn + lớp (nhiều «Đề số n» như mẫu import).
 * Chỉ gồm đề đã BGH phê duyệt (APPROVED).
 */
export const ExportExamPackageBundle = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/export-package-bundle'
	},
	async (q: {
		subjectId: Query<number>
		classId?: Query<number>
		/** true = kèm chữ ký số; false = để trống ô ký */
		withSignatures?: Query<boolean>
	}): Promise<{
		filename: string
		contentType: string
		html: string
		paperCount: number
	}> => {
		const actor = await getActor()
		if (
			!actor.isSuperAdmin &&
			!isBgh(actor) &&
			!isExamOffice(actor) &&
			!isDeptHead(actor)
		) {
			throw APIError.permissionDenied('Không có quyền xuất bộ đề')
		}
		const includeSignatures = parseIncludeSignatures(q)
		const subjectId = Number(q.subjectId)
		if (!subjectId) throw APIError.invalidArgument('Thiếu subjectId')

		const [subj] = await orm
			.select()
			.from(examSubjects)
			.where(eq(examSubjects.id, subjectId))
			.limit(1)
		if (!subj) throw APIError.notFound('Môn học không tồn tại')

		// Luôn chỉ lấy đề đã phê duyệt
		const conditions = [
			eq(exams.subjectId, subjectId),
			eq(exams.status, 'APPROVED')
		]
		if (q.classId) {
			conditions.push(eq(exams.classId, Number(q.classId)))
		}

		const examRows = await orm
			.select()
			.from(exams)
			.where(and(...conditions))
			.orderBy(asc(exams.paperNumber), asc(exams.id))
			.limit(40)

		if (!examRows.length) {
			throw APIError.notFound(
				'Không có đề đã phê duyệt để xuất bộ (chọn môn/lớp có đề trong ngân hàng)'
			)
		}

		const papers: Array<{
			paperNumber: number | null
			code?: string
			questions: Array<{
				questionNumber: number
				content: string
				answer: string | null
				points: number
			}>
		}> = []

		for (const e of examRows) {
			const qs = await orm
				.select()
				.from(examQuestions)
				.where(eq(examQuestions.examId, e.id))
				.orderBy(examQuestions.questionNumber)
			papers.push({
				paperNumber: e.paperNumber ?? inferPaperNumber(e.title, e.code),
				code: e.code,
				questions: qs.map((qrow) => ({
					questionNumber: qrow.questionNumber,
					content: qrow.content,
					answer: qrow.answer,
					points: qrow.points
				}))
			})
		}

		// Lấy chữ ký từ đề đã duyệt gần nhất (có BGH / CNK)
		const withBgh =
			examRows.find((e) => e.approvedBySignatureUrl) ||
			examRows.find((e) => e.approvedAt) ||
			examRows[0]!
		const withCnk =
			examRows.find((e) => e.deptHeadSignatureUrl) ||
			examRows.find((e) => e.deptHeadDisplayName) ||
			withBgh

		// GV soạn: nếu gộp nhiều đề cùng 1 GV thì lấy profile; nếu nhiều GV khác nhau — dùng GV đề đầu
		const lecturer = await loadLecturerForExport(withBgh)
		const [subjFac] = await orm
			.select({ code: examFaculties.code })
			.from(examSubjects)
			.leftJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.where(eq(examSubjects.id, subjectId))
			.limit(1)
		const cnkResolved = await loadCnkForExport({
			facultyCode: subjFac?.code ?? null,
			deptHeadUserId: withCnk.deptHeadUserId,
			deptHeadDisplayName: withCnk.deptHeadDisplayName,
			deptHeadRank: withCnk.deptHeadRank,
			deptHeadSignatureUrl: withCnk.deptHeadSignatureUrl,
			deptHeadUsername: withCnk.deptHeadUsername
		})

		const html = buildExamPackageHtml({
			subjectName: subj.name,
			className: withBgh.className || '—',
			durationMinutes: withBgh.durationMinutes || 60,
			codeLabel: subj.code,
			papers,
			approvedAt: withBgh.approvedAt,
			approvedByTitle: withBgh.approvedByTitle,
			approvedByRank: withBgh.approvedByRank,
			approvedByDisplayName: withBgh.approvedByDisplayName,
			approvedByPosition: withBgh.approvedByPosition,
			approvedBySignatureUrl: withBgh.approvedBySignatureUrl,
			deptHeadRank: cnkResolved.deptHeadRank,
			deptHeadDisplayName: cnkResolved.deptHeadDisplayName,
			deptHeadSignatureUrl: cnkResolved.deptHeadSignatureUrl,
			...lecturer,
			includeSignatures
		})

		return {
			filename: `bo-de-gop-${subj.code}${includeSignatures ? '' : '-khong-ky'}.html`,
			contentType: 'text/html; charset=utf-8',
			html,
			paperCount: papers.length
		}
	}
)

/**
 * In / xuất bộ đề theo danh sách id đã chọn (ngân hàng hoặc hàng đợi duyệt).
 * Form giấy mẫu C. CNK/KT/BGH: đề đã gửi duyệt hoặc APPROVED.
 * withSignatures=false → để trống ô ký.
 */
export const ExportExamPackageSelected = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/export-package-selected'
	},
	async (q: {
		/** CSV id, vd 1,2,5 */
		examIds: Query<string>
		withSignatures?: Query<boolean>
		/**
		 * true = cho phép đề đang duyệt (PENDING_*) — dùng trang duyệt đề.
		 * false/default = chỉ APPROVED (ngân hàng).
		 */
		forReview?: Query<boolean>
	}): Promise<{
		filename: string
		contentType: string
		html: string
		paperCount: number
	}> => {
		const actor = await getActor()
		if (
			!actor.isSuperAdmin &&
			!isBgh(actor) &&
			!isExamOffice(actor) &&
			!isDeptHead(actor)
		) {
			throw APIError.permissionDenied('Không có quyền in bộ đề')
		}
		const includeSignatures = parseIncludeSignatures(q)
		const forReview =
			q.forReview === true ||
			String(q.forReview) === 'true' ||
			String(q.forReview) === '1'
		const ids = String(q.examIds || '')
			.split(/[,;\s]+/)
			.map((x) => Number(x))
			.filter((n) => Number.isFinite(n) && n > 0)
		if (!ids.length) {
			throw APIError.invalidArgument('Chọn ít nhất 1 đề để in')
		}
		if (ids.length > 40) {
			throw APIError.invalidArgument('Tối đa 40 đề mỗi lần in')
		}

		const allowedStatuses: ExamStatus[] = forReview
			? ['PENDING_DEPT', 'PENDING_EXAM_OFFICE', 'PENDING_BGH', 'APPROVED']
			: ['APPROVED']

		const examRows = await orm
			.select()
			.from(exams)
			.where(
				and(
					inArray(exams.id, ids),
					inArray(exams.status, allowedStatuses)
				)
			)
			.orderBy(asc(exams.paperNumber), asc(exams.id))

		if (!examRows.length) {
			throw APIError.notFound(
				forReview
					? 'Không có đề đang duyệt / đã phê duyệt trong danh sách chọn'
					: 'Không có đề đã phê duyệt trong danh sách chọn'
			)
		}

		const subjectIds = [...new Set(examRows.map((e) => e.subjectId))]
		const [subj] = await orm
			.select()
			.from(examSubjects)
			.where(eq(examSubjects.id, subjectIds[0]!))
			.limit(1)

		const papers: Array<{
			paperNumber: number | null
			code?: string
			questions: Array<{
				questionNumber: number
				content: string
				answer: string | null
				points: number
			}>
		}> = []

		for (const e of examRows) {
			const qs = await orm
				.select()
				.from(examQuestions)
				.where(eq(examQuestions.examId, e.id))
				.orderBy(examQuestions.questionNumber)
			papers.push({
				paperNumber: e.paperNumber ?? inferPaperNumber(e.title, e.code),
				code: e.code,
				questions: qs.map((qrow) => ({
					questionNumber: qrow.questionNumber,
					content: qrow.content,
					answer: qrow.answer,
					points: qrow.points
				}))
			})
		}

		const withBgh =
			examRows.find((e) => e.approvedBySignatureUrl) ||
			examRows.find((e) => e.approvedAt) ||
			examRows[0]!
		const withCnk =
			examRows.find((e) => e.deptHeadSignatureUrl) ||
			examRows.find((e) => e.deptHeadDisplayName) ||
			withBgh
		const lecturer = await loadLecturerForExport(withBgh)
		let facCode: string | null = null
		if (subj?.id) {
			const [sf] = await orm
				.select({ code: examFaculties.code })
				.from(examSubjects)
				.leftJoin(
					examFaculties,
					eq(examSubjects.facultyId, examFaculties.id)
				)
				.where(eq(examSubjects.id, subj.id))
				.limit(1)
			facCode = sf?.code ?? null
		}
		const cnkResolved = await loadCnkForExport({
			facultyCode: facCode,
			deptHeadUserId: withCnk.deptHeadUserId,
			deptHeadDisplayName: withCnk.deptHeadDisplayName,
			deptHeadRank: withCnk.deptHeadRank,
			deptHeadSignatureUrl: withCnk.deptHeadSignatureUrl,
			deptHeadUsername: withCnk.deptHeadUsername
		})

		const multiSubj =
			subjectIds.length > 1
				? `Nhiều môn (${subjectIds.length})`
				: subj?.name || '—'

		const html = buildExamPackageHtml({
			subjectName: multiSubj,
			className: withBgh.className || '—',
			durationMinutes: withBgh.durationMinutes || 60,
			codeLabel: subj?.code || 'BO-DE',
			papers,
			approvedAt: withBgh.approvedAt,
			approvedByTitle: withBgh.approvedByTitle,
			approvedByRank: withBgh.approvedByRank,
			approvedByDisplayName: withBgh.approvedByDisplayName,
			approvedByPosition: withBgh.approvedByPosition,
			approvedBySignatureUrl: withBgh.approvedBySignatureUrl,
			deptHeadRank: cnkResolved.deptHeadRank,
			deptHeadDisplayName: cnkResolved.deptHeadDisplayName,
			deptHeadSignatureUrl: cnkResolved.deptHeadSignatureUrl,
			...lecturer,
			includeSignatures
		})

		return {
			filename: `bo-de-chon-${papers.length}de${includeSignatures ? '' : '-khong-ky'}.html`,
			contentType: 'text/html; charset=utf-8',
			html,
			paperCount: papers.length
		}
	}
)

function escapeHtmlPkg(s: string) {
	return String(s || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}

type TeacherExportPaper = {
	paperNumber: number | null
	code: string
	title: string
	className: string | null
	durationMinutes: number | null
	questions: Array<{
		questionNumber: number
		content: string
		answer: string | null
		points: number
	}>
}

/**
 * Xuất bảng đề thi cho GV — 3 mẫu:
 *  A = ĐỀ THI SỐ n + Đáp án - Thang điểm
 *  B = bảng gộp
 *  C = form giấy BỘ CÂU HỎI - ĐÁP ÁN (biểu mẫu chính thức)
 *
 * **Chỉ đề đã BGH phê duyệt (APPROVED).**
 * **GV:** chỉ xuất đề của mình và **chỉ sau khi hết thời gian giảng dạy** lớp đó.
 * withSignatures=false → form C để trống ô ký.
 */
export const ExportTeacherExamBoard = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/export-teacher-board'
	},
	async (q: {
		/** a | b | c — mặc định c (form giấy) */
		format: Query<string>
		subjectId?: Query<number>
		/** CSV id đề, vd 1,2,3 — vẫn chỉ lấy những id đã APPROVED */
		examIds?: Query<string>
		withSignatures?: Query<boolean>
		/**
		 * true = CNK/KT/BGH xuất đề đang duyệt (PENDING_*) — mẫu A/B, không bắt APPROVED.
		 */
		forReview?: Query<boolean>
	}): Promise<{
		filename: string
		contentType: string
		html: string
		format: string
		paperCount: number
	}> => {
		const actor = await getActor()
		const fmt = String(q.format || 'c')
			.trim()
			.toLowerCase()
		if (!['a', 'b', 'c'].includes(fmt)) {
			throw APIError.invalidArgument(
				'Mẫu xuất: format=a (ĐỀ THI SỐ) | b (bảng gộp) | c (BỘ CÂU HỎI + ĐÁP ÁN)'
			)
		}
		const includeSignatures = parseIncludeSignatures(q)
		const forReview =
			q.forReview === true ||
			String(q.forReview) === 'true' ||
			String(q.forReview) === '1'

		const canAll =
			actor.isSuperAdmin ||
			isDeptHead(actor) ||
			isExamOffice(actor) ||
			isBgh(actor)
		if (!canAll && !isLecturer(actor)) {
			throw APIError.permissionDenied('Không có quyền xuất bảng đề')
		}

		// Mặc định: chỉ APPROVED. forReview (duyệt đề): cho PENDING_* + APPROVED
		const statusList: ExamStatus[] =
			forReview && canAll
				? [
						'PENDING_DEPT',
						'PENDING_EXAM_OFFICE',
						'PENDING_BGH',
						'APPROVED'
					]
				: ['APPROVED']
		const conditions = [inArray(exams.status, statusList)]
		if (!canAll) {
			conditions.push(eq(exams.createdByUserId, actor.userId))
		}
		if (q.subjectId) {
			conditions.push(eq(exams.subjectId, Number(q.subjectId)))
		}
		const idRaw = String(q.examIds || '').trim()
		if (idRaw) {
			const ids = idRaw
				.split(/[,;\s]+/)
				.map((x) => Number(x))
				.filter((n) => Number.isFinite(n) && n > 0)
			if (!ids.length) {
				throw APIError.invalidArgument('examIds không hợp lệ')
			}
			conditions.push(inArray(exams.id, ids))
		}

		const examRows = await orm
			.select({
				exam: exams,
				subjectName: examSubjects.name,
				subjectCode: examSubjects.code,
				majorName: examMajors.name,
				facultyName: examFaculties.name,
				facultyCode: examFaculties.code
			})
			.from(exams)
			.leftJoin(examSubjects, eq(exams.subjectId, examSubjects.id))
			.leftJoin(examMajors, eq(examSubjects.majorId, examMajors.id))
			.leftJoin(
				examFaculties,
				eq(examSubjects.facultyId, examFaculties.id)
			)
			.where(and(...conditions))
			.orderBy(asc(exams.paperNumber), asc(exams.id))
			.limit(50)

		if (!examRows.length) {
			throw APIError.notFound(
				forReview
					? 'Không có đề đang duyệt / đã phê duyệt để xuất.'
					: 'Không có đề đã phê duyệt để xuất. Chỉ xuất đề BGH đã duyệt (trong ngân hàng).'
			)
		}

		// GV: chỉ giữ đề đã hết thời gian giảng dạy lớp/môn tương ứng
		// (forReview chỉ dùng cho CNK/KT/BGH — canAll, bỏ qua chặn lịch dạy)
		let allowedRows = examRows
		if (!canAll) {
			const kept: typeof examRows = []
			let firstReason = ''
			for (const r of examRows) {
				if (r.exam.createdByUserId !== actor.userId) continue
				const check = await lecturerTeachingEndedForExam(
					actor.userId,
					r.exam
				)
				if (check.ok) kept.push(r)
				else if (!firstReason && check.reason)
					firstReason = check.reason
			}
			if (!kept.length) {
				throw APIError.failedPrecondition(
					firstReason ||
						'Chỉ được xuất đề sau khi kết thúc thời gian giảng dạy lớp. Khi còn trong khóa dạy thì không cho tải.'
				)
			}
			allowedRows = kept
		}

		const papers: TeacherExportPaper[] = []
		for (const r of allowedRows) {
			const qs = await orm
				.select()
				.from(examQuestions)
				.where(eq(examQuestions.examId, r.exam.id))
				.orderBy(examQuestions.questionNumber)
			papers.push({
				paperNumber:
					r.exam.paperNumber ??
					inferPaperNumber(r.exam.title, r.exam.code),
				code: r.exam.code,
				title: r.exam.title,
				className: r.exam.className,
				durationMinutes: r.exam.durationMinutes,
				questions: qs.map((qrow) => ({
					questionNumber: qrow.questionNumber,
					content: qrow.content,
					answer: qrow.answer,
					points: qrow.points
				}))
			})
		}

		const head = allowedRows[0]!
		const subjectName = head.subjectName || '—'
		const facultyName = head.facultyName || '—'
		const duration =
			head.exam.durationMinutes ||
			papers.find((p) => p.durationMinutes)?.durationMinutes ||
			60
		const className =
			papers.find((p) => p.className)?.className ||
			head.exam.className ||
			'—'

		// Mẫu C = form giấy chính thức (I. BỘ CÂU HỎI + II. ĐÁP ÁN + PHÊ DUYỆT + CNK)
		let html: string
		if (fmt === 'c') {
			const withBgh =
				allowedRows.find((r) => r.exam.approvedBySignatureUrl)?.exam ||
				allowedRows.find((r) => r.exam.approvedAt)?.exam ||
				head.exam
			const withCnkExam =
				allowedRows.find((r) => r.exam.deptHeadSignatureUrl)?.exam ||
				allowedRows.find((r) => r.exam.deptHeadDisplayName)?.exam ||
				withBgh
			const lecturer = await loadLecturerForExport(head.exam)
			// CNK: họ tên + chữ ký profile (không in «CNK — Khoa …»)
			const cnkResolved = await loadCnkForExport({
				facultyCode: head.facultyCode ?? null,
				deptHeadUserId: withCnkExam.deptHeadUserId,
				deptHeadDisplayName: withCnkExam.deptHeadDisplayName,
				deptHeadRank: withCnkExam.deptHeadRank,
				deptHeadSignatureUrl: withCnkExam.deptHeadSignatureUrl,
				deptHeadUsername: withCnkExam.deptHeadUsername
			})
			html = buildExamPackageHtml({
				subjectName,
				className,
				durationMinutes: duration,
				codeLabel: head.subjectCode || head.exam.code,
				facultyName,
				papers: papers.map((p) => ({
					paperNumber: p.paperNumber,
					code: p.code,
					questions: p.questions
				})),
				approvedAt: withBgh.approvedAt,
				approvedByTitle: withBgh.approvedByTitle,
				approvedByRank: withBgh.approvedByRank,
				approvedByDisplayName: withBgh.approvedByDisplayName,
				approvedByPosition: withBgh.approvedByPosition,
				approvedBySignatureUrl: withBgh.approvedBySignatureUrl,
				deptHeadRank: cnkResolved.deptHeadRank,
				deptHeadDisplayName: cnkResolved.deptHeadDisplayName,
				deptHeadSignatureUrl: cnkResolved.deptHeadSignatureUrl,
				...lecturer,
				includeSignatures
			})
		} else {
			html = buildTeacherBoardHtml({
				format: fmt as 'a' | 'b',
				subjectName,
				subjectCode: head.subjectCode || '',
				facultyName,
				majorName: head.majorName || '',
				durationMinutes: duration,
				papers
			})
		}
		const tag =
			fmt === 'a'
				? 'mau-A-de-thi-so'
				: fmt === 'b'
					? 'mau-B-bang-gop'
					: 'mau-C-bo-ch-da'
		const safeSubj = (head.subjectCode || 'de')
			.replace(/[^a-zA-Z0-9_-]+/g, '_')
			.slice(0, 40)
		const sigTag = fmt === 'c' && !includeSignatures ? '-khong-ky' : ''

		return {
			filename: `bang-de-${tag}-${safeSubj}${sigTag}.html`,
			contentType: 'text/html; charset=utf-8',
			html,
			format: fmt,
			paperCount: papers.length
		}
	}
)

/** Mẫu A/B (đơn giản) — Mẫu C dùng buildExamPackageHtml (form giấy) */
function buildTeacherBoardHtml(opts: {
	format: 'a' | 'b'
	subjectName: string
	subjectCode: string
	facultyName: string
	majorName: string
	durationMinutes: number
	papers: TeacherExportPaper[]
}): string {
	const mon = escapeHtmlPkg(opts.subjectName)
	const khoa = escapeHtmlPkg(opts.facultyName)
	const nganh = escapeHtmlPkg(opts.majorName)
	const duration = opts.durationMinutes || 60
	const styles = `
    body{font-family:"Times New Roman",Times,serif;font-size:13pt;line-height:1.35;color:#111;margin:16px 20px}
    h1,h2,h3{margin:0.4em 0}
    .center{text-align:center}
    .header-table{width:100%;border:none;margin-bottom:8px}
    .header-table td{border:none;vertical-align:top;width:50%}
    .muted{color:#444;font-size:11pt}
    table.grid{width:100%;border-collapse:collapse;margin-top:8px}
    table.grid th,table.grid td{border:1px solid #333;padding:6px 8px;vertical-align:top}
    table.grid th{background:#f0f0f0}
    .paper{margin-top:18px;page-break-inside:avoid}
    .q{margin:6px 0}
    .ans{margin:4px 0 4px 12px}
    .small{font-size:11pt}
    @media print{body{margin:12mm}}
  `

	const headerBlock = `
  <table class="header-table">
    <tr>
      <td class="center">
        <div><b>TRƯỜNG CAO ĐẲNG HẬU CẦN 2</b></div>
        <div><b>${khoa || 'KHOA'}</b></div>
      </td>
      <td class="center">
        <div><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b></div>
        <div><b>Độc lập - Tự do - Hạnh phúc</b></div>
      </td>
    </tr>
  </table>
  <h2 class="center">BẢNG ĐỀ THI TỰ LUẬN</h2>
  <p class="center"><b>Môn:</b> ${mon}${opts.subjectCode ? ` <span class="muted">(${escapeHtmlPkg(opts.subjectCode)})</span>` : ''}</p>
  ${nganh ? `<p class="center muted">Ngành: ${nganh}</p>` : ''}
  <p class="center muted">Thời gian: ${duration} phút · ${opts.papers.length} đề</p>
  `

	if (opts.format === 'a') {
		const body = opts.papers
			.map((p) => {
				const pn = p.paperNumber ?? '—'
				const qs = p.questions
					.map((q) => {
						const pts = formatPts(q.points)
						return `<div class="q"><b>Câu ${q.questionNumber}${pts ? ` (${pts} điểm)` : ''}:</b> ${escapeHtmlPkg(q.content)}</div>`
					})
					.join('')
				const ans = p.questions
					.map((q) => {
						const pts = formatPts(q.points)
						return `<div class="ans"><b>Câu ${q.questionNumber}${pts ? ` (${pts} điểm)` : ''}:</b> ${escapeHtmlPkg(q.answer || '—')}</div>`
					})
					.join('')
				return `
      <div class="paper">
        <h3>ĐỀ THI SỐ ${pn}</h3>
        ${qs || '<p class="muted">(Chưa có câu hỏi)</p>'}
        <h3>Đáp án - Thang điểm</h3>
        ${ans || '<p class="muted">(Chưa có đáp án)</p>'}
      </div>`
			})
			.join('')
		return wrapHtml(
			`Mẫu A — ĐỀ THI SỐ · ${opts.subjectName}`,
			styles,
			headerBlock + body
		)
	}

	// Mẫu B
	const rows = opts.papers
		.flatMap((p) =>
			p.questions.map(
				(q) => `
        <tr>
          <td class="center">${p.paperNumber ?? '—'}</td>
          <td class="center">${q.questionNumber}</td>
          <td>${escapeHtmlPkg(q.content)}</td>
          <td>${escapeHtmlPkg(q.answer || '—')}</td>
          <td class="center">${formatPts(q.points)}</td>
        </tr>`
			)
		)
		.join('')
	const body = `
    <p class="small muted">Mẫu B — Bảng gộp đề (Đề số | Câu hỏi | Nội dung | Đáp án | Điểm)</p>
    <table class="grid">
      <thead>
        <tr>
          <th style="width:8%">Đề số</th>
          <th style="width:8%">Câu hỏi</th>
          <th>Nội dung</th>
          <th>Đáp án</th>
          <th style="width:8%">Điểm</th>
        </tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="5" class="center muted">Không có câu hỏi</td></tr>'}</tbody>
    </table>`
	return wrapHtml(
		`Mẫu B — Bảng gộp · ${opts.subjectName}`,
		styles,
		headerBlock + body
	)
}

function formatPts(n: number | null | undefined): string {
	if (n == null || !Number.isFinite(Number(n))) return ''
	const v = Number(n)
	if (Number.isInteger(v)) return String(v)
	return String(v).replace('.', ',')
}

function wrapHtml(title: string, styles: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<title>${escapeHtmlPkg(title)}</title>
<style>${styles}</style>
</head>
<body>
${body}
</body>
</html>`
}
