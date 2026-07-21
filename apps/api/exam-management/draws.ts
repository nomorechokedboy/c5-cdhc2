/**
 * Rút / bốc đề — chỉ Ban Khảo thí
 * Chẵn/Lẻ, random, không trùng đề đã rút, xuất file in (HTML download)
 */
import { api, APIError, Query } from 'encore.dev/api'
import { and, desc, eq, inArray, like, notInArray, or, sql } from 'drizzle-orm'
import orm from '../database'
import {
	examClasses,
	examDrawLogs,
	examDraws,
	examMajors,
	examQuestions,
	exams,
	examSubjects
} from '../schema/exam-bank'
import {
	canDrawExamsApi,
	daysBetweenDates,
	genDrawCode,
	getActor,
	inferPaperNumber,
	isDrawPrintOverdue,
	isExamDrawDateOverLimit,
	nowIso,
	todayVnDate
} from './helpers'

export interface DrawResponse {
	id: number
	createdAt: string
	drawCode: string
	examId: number
	examCode: string | null
	examTitle?: string | null
	/** Số đề import — trùng với đề được bốc (vd. 9) */
	paperNumber: number | null
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
	/** Đã xuất in → vào kho đề đã dùng */
	printedAt: string | null
	printedByUsername: string | null
	/** Quá 3 ngày từ ngày rút → không cho in */
	printBlocked: boolean
	printBlockedAt: string | null
	printBlockedReason: string | null
	/** Số ngày đã trôi qua từ ngày rút */
	daysSinceDraw: number | null
	examDate: string | null
	examTime: string | null
	location: string | null
	note: string | null
}

function requireExamOffice(actor: Awaited<ReturnType<typeof getActor>>) {
	// Đặc tả: chỉ Ban Khảo thí (cơ quan quản lý) được rút đề (+ super vận hành)
	if (!canDrawExamsApi(actor)) {
		throw APIError.permissionDenied(
			'Chỉ Ban Khảo thí (Trưởng phòng Đào tạo) được rút / tra cứu xuất đề'
		)
	}
}

async function writeDrawLog(
	drawId: number | null,
	action: string,
	summary: string,
	details: string | null,
	actor: Awaited<ReturnType<typeof getActor>>
) {
	await orm.insert(examDrawLogs).values({
		drawId,
		action,
		summary,
		details,
		actorUserId: actor.userId,
		actorUsername: actor.username,
		actorDisplayName: actor.displayName
	})
}

function mapDraw(
	r: typeof examDraws.$inferSelect & {
		examTitle?: string | null
		subjectCode?: string | null
		subjectName?: string | null
		majorCode?: string | null
		majorName?: string | null
	}
): DrawResponse {
	const daysSince = daysBetweenDates(r.drawnAt, todayVnDate())
	const overdue = isDrawPrintOverdue(r.drawnAt) || !!r.printBlocked
	return {
		id: r.id,
		createdAt: r.createdAt,
		drawCode: r.drawCode,
		examId: r.examId,
		examCode: r.examCode,
		examTitle: r.examTitle ?? null,
		paperNumber: r.paperNumber ?? null,
		subjectId: r.subjectId,
		subjectCode: r.subjectCode ?? null,
		subjectName: r.subjectName ?? null,
		majorId: r.majorId,
		majorCode: r.majorCode ?? null,
		majorName: r.majorName ?? null,
		drawType: r.drawType,
		classId: r.classId,
		className: r.className,
		drawnByUserId: r.drawnByUserId,
		drawnByUsername: r.drawnByUsername,
		drawnByDisplayName: r.drawnByDisplayName,
		drawnAt: r.drawnAt,
		printedAt: r.printedAt ?? null,
		printedByUsername: r.printedByUsername ?? null,
		printBlocked: overdue,
		printBlockedAt: r.printBlockedAt ?? null,
		printBlockedReason:
			r.printBlockedReason ??
			(overdue ? 'Đã quá 3 ngày kể từ ngày rút — không cho in' : null),
		daysSinceDraw: daysSince,
		examDate: r.examDate,
		examTime: r.examTime,
		location: r.location,
		note: r.note
	}
}

/** Đánh dấu print_blocked nếu quá 3 ngày (lazy) */
async function ensurePrintBlock(
	draw: typeof examDraws.$inferSelect
): Promise<typeof examDraws.$inferSelect> {
	if (draw.printBlocked) return draw
	if (!isDrawPrintOverdue(draw.drawnAt)) return draw
	const at = nowIso()
	const reason = `Quá 3 ngày kể từ ngày rút (${String(draw.drawnAt).slice(0, 10)}) — không cho in`
	const [row] = await orm
		.update(examDraws)
		.set({
			printBlocked: true,
			printBlockedAt: at,
			printBlockedReason: reason
		})
		.where(eq(examDraws.id, draw.id))
		.returning()
	return (
		row || {
			...draw,
			printBlocked: true,
			printBlockedAt: at,
			printBlockedReason: reason
		}
	)
}

/**
 * Pool rút đề: số đề APPROVED còn lại (chưa bốc) theo môn.
 * Mỗi lớp cần 2 phiếu (Chẵn + Lẻ) = 2 đề khác nhau trong pool.
 */
export const GetExamDrawPool = api(
	// path riêng — tránh đụng /exam/draws/:id
	{ auth: true, expose: true, method: 'GET', path: '/exam/draw-pool' },
	async (q: {
		subjectId: Query<number>
		classId?: Query<number>
	}): Promise<{
		subjectId: number
		approvedTotal: number
		usedCount: number
		availableCount: number
		/** Với lớp đã chọn: đã có phiếu Chẵn / Lẻ chưa */
		classHasEven: boolean
		classHasOdd: boolean
		className: string | null
	}> => {
		const actor = await getActor()
		requireExamOffice(actor)
		const subjectId = Number(q.subjectId)
		if (!subjectId) throw APIError.invalidArgument('Thiếu subjectId')

		const [approvedRow] = await orm
			.select({ c: sql<number>`count(*)` })
			.from(exams)
			.where(
				and(
					eq(exams.subjectId, subjectId),
					eq(exams.status, 'APPROVED')
				)
			)
		const approvedTotal = Number(approvedRow?.c || 0)

		const used = await orm
			.select({ examId: examDraws.examId })
			.from(examDraws)
			.where(eq(examDraws.subjectId, subjectId))
		const usedIds = [...new Set(used.map((u) => u.examId))]
		const usedCount = usedIds.length
		const availableCount = Math.max(0, approvedTotal - usedCount)

		let classHasEven = false
		let classHasOdd = false
		let className: string | null = null
		const classId = q.classId ? Number(q.classId) : 0
		if (classId) {
			const classDraws = await orm
				.select()
				.from(examDraws)
				.where(
					and(
						eq(examDraws.subjectId, subjectId),
						eq(examDraws.classId, classId)
					)
				)
			for (const d of classDraws) {
				if (d.drawType === 'EVEN') classHasEven = true
				if (d.drawType === 'ODD') classHasOdd = true
				if (d.className) className = d.className
			}
			if (!className) {
				// Danh mục lớp thi (exam_classes) — không dùng classes học viên
				const [cl] = await orm
					.select()
					.from(examClasses)
					.where(eq(examClasses.id, classId))
					.limit(1)
				className = cl?.name ?? null
			}
		}

		return {
			subjectId,
			approvedTotal,
			usedCount,
			availableCount,
			classHasEven,
			classHasOdd,
			className
		}
	}
)

/**
 * Rút ngẫu nhiên 1 đề APPROVED chưa từng bốc.
 *
 * Nghiệp vụ lớp thi:
 * - Mỗi lớp cần **2 phiếu**: 1 Chẵn + 1 Lẻ (2 đề khác nhau trong ngân hàng).
 * - Rút Chẵn xong vẫn rút được Lẻ (và ngược lại), miễn còn đề trong pool.
 * - Không rút trùng cùng loại (Chẵn/Lẻ) cho cùng lớp + cùng môn.
 * - Không tái sử dụng cùng 1 mã đề đã bốc (cho bất kỳ lớp nào).
 */
export const DrawExam = api(
	{ auth: true, expose: true, method: 'POST', path: '/exam/draws' },
	async (body: {
		subjectId: number
		drawType: 'EVEN' | 'ODD'
		classId?: number
		className?: string
		examDate?: string
		examTime?: string
		location?: string
		note?: string
	}): Promise<{ data: DrawResponse }> => {
		const actor = await getActor()
		requireExamOffice(actor)

		if (!body.subjectId || !body.drawType) {
			throw APIError.invalidArgument('Thiếu môn học hoặc loại đề')
		}
		if (body.drawType !== 'EVEN' && body.drawType !== 'ODD') {
			throw APIError.invalidArgument('Loại đề phải là EVEN hoặc ODD')
		}
		// Ngày thi bắt buộc — chỉ lưu ngày thi; ngày thực hiện = ngày user rút
		const examDate = (body.examDate || '').trim()
		if (!examDate || !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
			throw APIError.invalidArgument(
				'Vui lòng nhập ngày thi (YYYY-MM-DD). Ngày thực hiện rút = ngày hệ thống khi bốc.'
			)
		}
		const drawnAtPreview = nowIso()
		if (isExamDrawDateOverLimit(examDate, drawnAtPreview, 3)) {
			const gap = daysBetweenDates(examDate, drawnAtPreview)
			throw APIError.failedPrecondition(
				`Ngày thi (${examDate}) và ngày rút (${drawnAtPreview.slice(0, 10)}) chênh ${gap} ngày — không được quá 3 ngày.`
			)
		}

		const [subj] = await orm
			.select()
			.from(examSubjects)
			.where(eq(examSubjects.id, body.subjectId))
			.limit(1)
		if (!subj) throw APIError.notFound('Môn học không tồn tại')

		let className = body.className || null
		let classId = body.classId ?? null
		if (body.classId) {
			// Chỉ nhận lớp từ danh mục thi (exam_classes), không phải lớp học viên
			const [cl] = await orm
				.select()
				.from(examClasses)
				.where(eq(examClasses.id, body.classId))
				.limit(1)
			if (!cl) {
				throw APIError.notFound(
					'Lớp không có trong danh mục lớp thi — thêm tại Đề thi → Danh mục'
				)
			}
			className = cl.name
			classId = cl.id
		}
		if (!classId && !className) {
			throw APIError.invalidArgument('Vui lòng chọn lớp thi khi rút đề')
		}

		// Cùng lớp + cùng môn: không rút trùng loại Chẵn/Lẻ
		if (classId) {
			const existingSameType = await orm
				.select()
				.from(examDraws)
				.where(
					and(
						eq(examDraws.subjectId, body.subjectId),
						eq(examDraws.classId, classId),
						eq(examDraws.drawType, body.drawType)
					)
				)
				.limit(1)
			if (existingSameType.length) {
				const other = body.drawType === 'EVEN' ? 'Lẻ' : 'Chẵn'
				throw APIError.failedPrecondition(
					`Lớp «${className || classId}» đã có đề ${body.drawType === 'EVEN' ? 'Chẵn' : 'Lẻ'} cho môn này (mã bốc ${existingSameType[0]!.drawCode}). Hãy rút đề ${other} (loại còn lại), không rút lại cùng loại.`
				)
			}
		}

		// Đề đã bốc (bất kỳ lớp) — không rút trùng cùng mã đề
		const used = await orm
			.select({ examId: examDraws.examId })
			.from(examDraws)
			.where(eq(examDraws.subjectId, body.subjectId))
		const usedIds = [...new Set(used.map((u) => u.examId))]

		const conditions = [
			eq(exams.subjectId, body.subjectId),
			eq(exams.status, 'APPROVED')
		]
		if (usedIds.length) {
			conditions.push(notInArray(exams.id, usedIds))
		}

		const pool = await orm
			.select()
			.from(exams)
			.where(and(...conditions))

		if (!pool.length) {
			const typeLabel = body.drawType === 'EVEN' ? 'Chẵn' : 'Lẻ'
			throw APIError.failedPrecondition(
				`Không còn đề trong ngân hàng để rút loại ${typeLabel}. ` +
					`Mỗi phiếu Chẵn/Lẻ cần 1 đề đã duyệt chưa bốc. ` +
					`Môn này: đã bốc ${usedIds.length} đề — hãy duyệt thêm đề vào ngân hàng hoặc chọn môn khác. ` +
					`(Mỗi lớp cần 2 đề khác nhau: 1 Chẵn + 1 Lẻ.)`
			)
		}

		// Gắn số đề import; ưu tiên pool chẵn/lẻ theo paperNumber
		const withPaper = pool.map((e) => ({
			exam: e,
			paper: e.paperNumber ?? inferPaperNumber(e.title, e.code)
		}))
		const wantEven = body.drawType === 'EVEN'
		const parityPool = withPaper.filter((x) => {
			if (x.paper == null) return false
			return wantEven ? x.paper % 2 === 0 : x.paper % 2 === 1
		})
		// Ưu tiên khớp chẵn/lẻ với số đề import; fallback cả pool nếu không đủ
		const pickFrom = parityPool.length ? parityPool : withPaper
		const chosen = pickFrom[Math.floor(Math.random() * pickFrom.length)]!
		const picked = chosen.exam
		const paperNumber = chosen.paper

		const drawCode = genDrawCode(paperNumber, body.drawType)
		const drawnAt = nowIso()

		// Backfill paper_number trên đề nếu thiếu
		if (picked.paperNumber == null && paperNumber != null) {
			await orm
				.update(exams)
				.set({ paperNumber })
				.where(eq(exams.id, picked.id))
		}

		const [row] = await orm
			.insert(examDraws)
			.values({
				drawCode,
				examId: picked.id,
				examCode: picked.code,
				paperNumber: paperNumber ?? null,
				subjectId: subj.id,
				majorId: subj.majorId,
				drawType: body.drawType,
				classId,
				className,
				drawnByUserId: actor.userId,
				drawnByUsername: actor.username,
				drawnByDisplayName: actor.displayName,
				drawnAt,
				examDate,
				examTime: body.examTime || null,
				location: body.location || null,
				note: body.note || null,
				printBlocked: false
			})
			.returning()

		const deLabel = paperNumber != null ? ` — Đề số ${paperNumber}` : ''
		await writeDrawLog(
			row!.id,
			'DRAW',
			`Bốc ${body.drawType === 'EVEN' ? 'Chẵn' : 'Lẻ'}${deLabel} (${picked.code})${className ? ` — lớp ${className}` : ''}`,
			JSON.stringify({
				drawCode,
				examId: picked.id,
				paperNumber,
				classId,
				className,
				drawType: body.drawType,
				examDate: body.examDate,
				poolLeft: pool.length - 1,
				parityMatched: parityPool.length > 0
			}),
			actor
		)

		const [major] = await orm
			.select()
			.from(examMajors)
			.where(eq(examMajors.id, subj.majorId))
			.limit(1)

		return {
			data: mapDraw({
				...row!,
				examTitle: picked.title,
				subjectCode: subj.code,
				subjectName: subj.name,
				majorCode: major?.code,
				majorName: major?.name
			})
		}
	}
)

export const ListExamDraws = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/draws' },
	async (q: {
		subjectId?: Query<number>
		drawCode?: Query<string>
		/** Mã đề (DT-…) */
		examCode?: Query<string>
		classId?: Query<number>
		/** Tên lớp (like) */
		className?: Query<string>
		/** Ngày thi (YYYY-MM-DD) */
		examDate?: Query<string>
		/** Ngày rút đề (YYYY-MM-DD) — khớp prefix drawn_at */
		drawnDate?: Query<string>
		drawType?: Query<string>
		q?: Query<string>
	}): Promise<{ data: DrawResponse[] }> => {
		const actor = await getActor()
		requireExamOffice(actor)

		const conditions = []
		if (q.subjectId)
			conditions.push(eq(examDraws.subjectId, Number(q.subjectId)))
		if (q.classId) conditions.push(eq(examDraws.classId, Number(q.classId)))
		if (q.examDate)
			conditions.push(eq(examDraws.examDate, String(q.examDate)))
		if (q.drawCode)
			conditions.push(
				like(examDraws.drawCode, `%${String(q.drawCode).trim()}%`)
			)
		if (q.examCode)
			conditions.push(
				like(examDraws.examCode, `%${String(q.examCode).trim()}%`)
			)
		if (q.className)
			conditions.push(
				like(examDraws.className, `%${String(q.className).trim()}%`)
			)
		if (q.drawnDate) {
			const d = String(q.drawnDate).trim()
			// drawn_at lưu dạng "YYYY-MM-DD HH:mm:ss" hoặc ISO
			conditions.push(like(examDraws.drawnAt, `${d}%`))
		}
		if (q.drawType) {
			const t = String(q.drawType).toUpperCase()
			if (t === 'EVEN' || t === 'ODD') {
				conditions.push(eq(examDraws.drawType, t))
			}
		}
		const kw = (q.q || '').trim()
		if (kw) {
			conditions.push(
				or(
					like(examDraws.drawCode, `%${kw}%`),
					like(examDraws.examCode, `%${kw}%`),
					like(examDraws.className, `%${kw}%`)
				)!
			)
		}
		const where = conditions.length ? and(...conditions) : undefined

		const rows = await orm
			.select({
				draw: examDraws,
				examTitle: exams.title,
				subjectCode: examSubjects.code,
				subjectName: examSubjects.name,
				majorCode: examMajors.code,
				majorName: examMajors.name
			})
			.from(examDraws)
			.leftJoin(exams, eq(examDraws.examId, exams.id))
			.leftJoin(examSubjects, eq(examDraws.subjectId, examSubjects.id))
			.leftJoin(examMajors, eq(examDraws.majorId, examMajors.id))
			.where(where)
			.orderBy(desc(examDraws.id))

		return {
			data: rows.map((r) =>
				mapDraw({
					...r.draw,
					examTitle: r.examTitle,
					subjectCode: r.subjectCode,
					subjectName: r.subjectName,
					majorCode: r.majorCode,
					majorName: r.majorName
				})
			)
		}
	}
)

export const GetExamDraw = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/draws/:id' },
	async (params: { id: number }): Promise<{ data: DrawResponse }> => {
		const actor = await getActor()
		requireExamOffice(actor)
		const [r] = await orm
			.select({
				draw: examDraws,
				examTitle: exams.title,
				subjectCode: examSubjects.code,
				subjectName: examSubjects.name,
				majorCode: examMajors.code,
				majorName: examMajors.name
			})
			.from(examDraws)
			.leftJoin(exams, eq(examDraws.examId, exams.id))
			.leftJoin(examSubjects, eq(examDraws.subjectId, examSubjects.id))
			.leftJoin(examMajors, eq(examDraws.majorId, examMajors.id))
			.where(eq(examDraws.id, params.id))
			.limit(1)
		if (!r) throw APIError.notFound('Phiếu bốc đề không tồn tại')
		return {
			data: mapDraw({
				...r.draw,
				examTitle: r.examTitle,
				subjectCode: r.subjectCode,
				subjectName: r.subjectName,
				majorCode: r.majorCode,
				majorName: r.majorName
			})
		}
	}
)

function cleanQuestionText(raw: string): string {
	return String(raw || '')
		.replace(/\[\s*Đề\s+demo\s*\d+\s*\]\s*/gi, '')
		.replace(/\[\s*V\d+\s*\]\s*/gi, '')
		.replace(/\(\s*câu\s*\d+\s*\)/gi, '')
		.replace(/\s+([.,;:!?])/g, '$1')
		.replace(/\s{2,}/g, ' ')
		.trim()
}

function cleanAnswerText(raw: string): string {
	let s = String(raw || '').trim()
	if (!s) return '(chưa có đáp án)'
	s = s.replace(/^Đáp\s*án\s*mẫu\s*đề\s*\d+\s*[—\-–]\s*câu\s*\d+\s*:\s*/i, '')
	return s.trim() || '(chưa có đáp án)'
}

function formatVnDateLong(isoOrYmd: string | null | undefined): string {
	const s = String(isoOrYmd || '')
		.trim()
		.slice(0, 10)
	const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
	if (!m) return s || '…'
	return `${Number(m[3])}/${Number(m[2])}/${m[1]}`
}

/**
 * Xuất đề / đáp án để in — form chuẩn «ĐỀ THI HẾT HỌC PHẦN».
 * kind: questions | answers
 * Chặn in nếu đã quá 3 ngày kể từ ngày rút.
 */
export const ExportDrawPrint = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/draws/:id/export'
	},
	async (params: {
		id: number
		kind?: Query<string>
	}): Promise<{
		filename: string
		contentType: string
		html: string
	}> => {
		const actor = await getActor()
		requireExamOffice(actor)

		const kind =
			String(params.kind || 'questions') === 'answers'
				? 'answers'
				: 'questions'

		const [draw0] = await orm
			.select()
			.from(examDraws)
			.where(eq(examDraws.id, params.id))
			.limit(1)
		if (!draw0) throw APIError.notFound('Phiếu bốc đề không tồn tại')

		const draw = await ensurePrintBlock(draw0)
		if (draw.printBlocked || isDrawPrintOverdue(draw.drawnAt)) {
			throw APIError.failedPrecondition(
				draw.printBlockedReason ||
					'Đề đã rút quá 3 ngày — không được in. Xem bảng «Đề đã rút quá 3 ngày».'
			)
		}

		const [exam] = await orm
			.select()
			.from(exams)
			.where(eq(exams.id, draw.examId))
			.limit(1)
		if (!exam) throw APIError.notFound('Đề không tồn tại')

		const [subj] = await orm
			.select()
			.from(examSubjects)
			.where(eq(examSubjects.id, exam.subjectId))
			.limit(1)

		const qs = await orm
			.select()
			.from(examQuestions)
			.where(eq(examQuestions.examId, exam.id))
			.orderBy(examQuestions.questionNumber)

		const typeLabel = draw.drawType === 'EVEN' ? 'Chẵn' : 'Lẻ'
		const paper =
			draw.paperNumber ??
			exam.paperNumber ??
			inferPaperNumber(exam.title, exam.code)

		// Mã đề in: ưu tiên code đề / paper — không lộ số đề nội bộ nếu muốn
		const examCodePrint =
			exam.code ||
			(paper != null
				? `DE${String(paper).padStart(2, '0')}`
				: draw.drawCode)

		// Đánh dấu đã in → kho đề đã sử dụng
		if (!draw.printedAt) {
			await orm
				.update(examDraws)
				.set({
					printedAt: nowIso(),
					printedByUserId: actor.userId,
					printedByUsername: actor.username,
					paperNumber: draw.paperNumber ?? paper ?? null
				})
				.where(eq(examDraws.id, draw.id))
			await writeDrawLog(
				draw.id,
				'PRINT',
				`Xuất in ${kind === 'answers' ? 'đáp án' : 'đề'} ${draw.drawCode} — phiếu ${typeLabel}${paper != null ? ` (nội bộ đề số ${paper})` : ''}`,
				null,
				actor
			)
		}

		const mon = escapeHtml(subj?.name || '—')
		const lop = escapeHtml(draw.className || exam.className || '—')
		const ngay = escapeHtml(formatVnDateLong(draw.examDate))
		const duration = exam.durationMinutes || 60
		const bodyParts: string[] = []

		if (kind === 'questions') {
			if (qs.length) {
				for (const q of qs) {
					const content = cleanQuestionText(q.content)
					bodyParts.push(
						`<div class="q"><b>Câu ${q.questionNumber}:</b> ${escapeHtml(content)} <span class="pts">(${q.points} điểm)</span></div>`
					)
				}
			} else {
				bodyParts.push(
					'<p class="q"><i>Chưa có nội dung câu hỏi.</i></p>'
				)
			}
		} else {
			if (qs.length) {
				for (const q of qs) {
					const ans = cleanAnswerText(q.answer || '')
					bodyParts.push(
						`<div class="q ans"><b>Câu ${q.questionNumber}</b> <span class="pts">(${q.points} điểm)</span><div class="ans-body">${escapeHtml(ans).replace(/\n/g, '<br/>')}</div></div>`
					)
				}
			} else {
				bodyParts.push('<p class="q"><i>Chưa có đáp án.</i></p>')
			}
		}

		const docTitle = kind === 'answers' ? 'ĐÁP ÁN' : 'ĐỀ THI HẾT HỌC PHẦN'

		const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/>
<title>${escapeHtml(docTitle)} — ${escapeHtml(examCodePrint)}</title>
<style>
  @page { margin: 15mm 18mm; }
  body{
    font-family:"Times New Roman",Times,serif;
    max-width:780px;
    margin:12px auto;
    padding:0 12px;
    font-size:13pt;
    color:#000;
    line-height:1.45;
  }
  .header-table{ width:100%; border-collapse:collapse; margin-bottom:8px; }
  .header-table td{ vertical-align:top; width:50%; }
  .org-left{ text-align:center; font-size:11pt; line-height:1.35; }
  .org-left .school{ font-weight:700; text-transform:uppercase; }
  .org-left .unit{ font-weight:700; text-transform:uppercase; font-size:10.5pt; }
  .org-right{ text-align:center; font-size:11pt; line-height:1.35; }
  .org-right .country{ font-weight:700; text-transform:uppercase; }
  .org-right .motto{ font-style:italic; }
  .title{ text-align:center; font-size:16pt; font-weight:700; margin:14px 0 6px; letter-spacing:0.5px; }
  .meta{ text-align:center; font-size:13pt; line-height:1.55; margin-bottom:8px; }
  .code{ text-align:center; font-weight:700; margin:10px 0 14px; font-size:13pt; }
  .q{ margin:10px 0; text-align:justify; }
  .q .pts{ font-style:italic; font-size:12pt; }
  .q.ans .ans-body{ margin-top:4px; white-space:pre-wrap; padding-left:12px; }
  .end{ text-align:center; font-weight:700; margin:22px 0 8px; letter-spacing:2px; }
  .footnote{ text-align:center; font-size:10.5pt; font-style:italic; margin-top:18px; border-top:1px solid #999; padding-top:8px; }
  .sig-row{ display:flex; justify-content:space-between; margin-top:28px; text-align:center; font-size:11pt; }
  .sig-box{ width:30%; }
  .sig-box .role{ font-weight:700; text-transform:uppercase; }
  .sig-box .space{ height:48px; }
  @media print{ body{ margin:0; } }
</style></head><body>
<table class="header-table"><tr>
  <td class="org-left">
    <div class="school">TRƯỜNG CAO ĐẲNG HẬU CẦN 2</div>
    <div class="unit">BAN KT&amp;ĐBCLGDĐT</div>
  </td>
  <td class="org-right">
    <div class="country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="motto">Độc lập – Tự do – Hạnh phúc</div>
  </td>
</tr></table>
<div class="title">${escapeHtml(docTitle)}</div>
<div class="meta">
  <div><b>Môn:</b> ${mon}</div>
  <div><b>Lớp:</b> ${lop}</div>
  <div><b>Ngày thi:</b> ${ngay}</div>
  <div><b>Thời gian thi:</b> ${duration} phút</div>
  <div><b>Loại phiếu:</b> ${typeLabel}</div>
</div>
<div class="code">Mã đề thi ${escapeHtml(examCodePrint)}</div>
${bodyParts.join('\n')}
${kind === 'questions' ? '<div class="end">HẾT</div><div class="footnote">(Thí sinh không được sử dụng tài liệu, cán bộ coi thi không giải thích gì thêm)</div>' : ''}
</body></html>`

		await writeDrawLog(
			draw.id,
			'EXPORT',
			`Xuất ${kind === 'answers' ? 'đáp án' : 'đề'} ${draw.drawCode}`,
			null,
			actor
		)

		const filename =
			kind === 'answers'
				? `dap-an-${draw.drawCode}.html`
				: `de-thi-${draw.drawCode}.html`

		return {
			filename,
			contentType: 'text/html; charset=utf-8',
			html
		}
	}
)

/**
 * Biên bản bốc thăm đề thi (form trước/sau khi rút).
 * Có thể gọi theo subjectId + classId (chưa rút) hoặc draw ids (đã rút).
 */
export const ExportDrawMinutes = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/draw-minutes'
	},
	async (q: {
		subjectId: Query<number>
		classId?: Query<number>
		/** optional: ids phiếu chẵn/lẻ đã rút, cách nhau bằng dấu phẩy */
		drawIds?: Query<string>
		location?: Query<string>
		proctorName?: Query<string>
		studentName?: Query<string>
		studentClass?: Query<string>
	}): Promise<{
		filename: string
		contentType: string
		html: string
	}> => {
		const actor = await getActor()
		requireExamOffice(actor)
		const subjectId = Number(q.subjectId)
		if (!subjectId) throw APIError.invalidArgument('Thiếu subjectId')

		const [subj] = await orm
			.select()
			.from(examSubjects)
			.where(eq(examSubjects.id, subjectId))
			.limit(1)
		if (!subj) throw APIError.notFound('Môn học không tồn tại')

		let evenCode = '………………'
		let oddCode = '………………'
		let className = ''
		let examDate = todayVnDate()
		let location = String(q.location || '').trim() || '………………'

		const drawIdList = String(q.drawIds || '')
			.split(',')
			.map((s) => Number(s.trim()))
			.filter((n) => n > 0)

		if (drawIdList.length) {
			const rows = await orm
				.select()
				.from(examDraws)
				.where(inArray(examDraws.id, drawIdList))
			for (const d of rows) {
				const code = d.examCode || d.drawCode
				if (d.drawType === 'EVEN') evenCode = code || evenCode
				if (d.drawType === 'ODD') oddCode = code || oddCode
				if (d.className) className = d.className
				if (d.examDate) examDate = d.examDate
				if (d.location) location = d.location
			}
		} else if (q.classId) {
			const classId = Number(q.classId)
			const classDraws = await orm
				.select()
				.from(examDraws)
				.where(
					and(
						eq(examDraws.subjectId, subjectId),
						eq(examDraws.classId, classId)
					)
				)
			for (const d of classDraws) {
				const code = d.examCode || d.drawCode
				if (d.drawType === 'EVEN') evenCode = code || evenCode
				if (d.drawType === 'ODD') oddCode = code || oddCode
				if (d.className) className = d.className
				if (d.examDate) examDate = d.examDate
				if (d.location) location = d.location
			}
			if (!className) {
				const [cl] = await orm
					.select()
					.from(examClasses)
					.where(eq(examClasses.id, classId))
					.limit(1)
				className = cl?.name || ''
			}
		}

		const now = nowIso()
		const [y, mo, da] = now.slice(0, 10).split('-')
		const timePart = now.slice(11, 16)
		const proctor = escapeHtml(String(q.proctorName || '………………'))
		const student = escapeHtml(String(q.studentName || '………………'))
		const stClass = escapeHtml(
			String(q.studentClass || className || '………………')
		)
		const officeRep = escapeHtml(actor.displayName || actor.username)

		const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="utf-8"/>
<title>Biên bản bốc thăm đề thi</title>
<style>
  body{ font-family:"Times New Roman",Times,serif; max-width:780px; margin:16px auto; font-size:13pt; line-height:1.5; }
  .header-table{ width:100%; border-collapse:collapse; }
  .header-table td{ width:50%; vertical-align:top; text-align:center; font-size:11pt; }
  .school,.country{ font-weight:700; text-transform:uppercase; }
  .motto{ font-style:italic; }
  .place-date{ text-align:right; font-style:italic; margin:8px 0 12px; font-size:12pt; }
  h1{ text-align:center; font-size:15pt; margin:12px 0; text-transform:uppercase; }
  .line{ margin:6px 0; }
  table.res{ width:70%; margin:14px auto; border-collapse:collapse; }
  table.res th, table.res td{ border:1px solid #000; padding:8px 12px; text-align:center; }
  .sigs{ display:flex; justify-content:space-between; margin-top:36px; text-align:center; }
  .sigs > div{ width:30%; }
  .sigs .role{ font-weight:700; }
  .sigs .space{ height:56px; }
  @media print{ body{ margin:12mm; } }
</style></head><body>
<table class="header-table"><tr>
  <td>
    <div class="school">TRƯỜNG CAO ĐẲNG HẬU CẦN 2</div>
    <div><b>BAN KT&amp;ĐBCLGDĐT</b></div>
  </td>
  <td>
    <div class="country">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
    <div class="motto">Độc lập – Tự do – Hạnh phúc</div>
  </td>
</tr></table>
<div class="place-date">Thành phố Hồ Chí Minh, ngày ${Number(da)} tháng ${Number(mo)} năm ${y}</div>
<h1>BIÊN BẢN BỐC THĂM ĐỀ THI</h1>
<div class="line">Hôm nay ngày <b>${Number(da)}</b> tháng <b>${Number(mo)}</b> năm <b>${y}</b>, vào lúc <b>${timePart}</b> tại <b>${escapeHtml(location)}</b></div>
<div class="line">Chúng tôi gồm:</div>
<div class="line">1. Đại diện Ban KT&amp;ĐBCLGDĐT: <b>${officeRep}</b></div>
<div class="line">2. Đại diện cán bộ coi thi: <b>${proctor}</b></div>
<div class="line">3. Đại diện học viên: <b>${student}</b> &nbsp;&nbsp; Lớp: <b>${stClass}</b></div>
<div class="line">Đã tiến hành bốc thăm đề thi môn: <b>${escapeHtml(subj.name)}</b></div>
<div class="line">Kết quả như sau:</div>
<table class="res">
  <tr><th>Đề thi</th><th>Mã đề thi</th></tr>
  <tr><td>Đề chẵn</td><td><b>${escapeHtml(evenCode)}</b></td></tr>
  <tr><td>Đề lẻ</td><td><b>${escapeHtml(oddCode)}</b></td></tr>
</table>
<div class="sigs">
  <div><div class="role">Ban KT&amp;ĐBCLGDĐT</div><div class="space"></div><div>${officeRep}</div></div>
  <div><div class="role">Cán bộ coi thi</div><div class="space"></div><div>${proctor}</div></div>
  <div><div class="role">Học viên</div><div class="space"></div><div>${student}</div></div>
</div>
</body></html>`

		return {
			filename: `bien-ban-boc-de-${subj.code || subjectId}.html`,
			contentType: 'text/html; charset=utf-8',
			html
		}
	}
)

/**
 * Danh sách đề đã rút quá 3 ngày (không cho in).
 * Đồng thời lazy-mark print_blocked.
 */
export const ListOverdueDraws = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/draws-overdue'
	},
	async (): Promise<{ data: DrawResponse[] }> => {
		const actor = await getActor()
		requireExamOffice(actor)

		const rows = await orm
			.select({
				draw: examDraws,
				examTitle: exams.title,
				subjectCode: examSubjects.code,
				subjectName: examSubjects.name,
				majorCode: examMajors.code,
				majorName: examMajors.name
			})
			.from(examDraws)
			.leftJoin(exams, eq(examDraws.examId, exams.id))
			.leftJoin(examSubjects, eq(examDraws.subjectId, examSubjects.id))
			.leftJoin(examMajors, eq(examDraws.majorId, examMajors.id))
			.orderBy(desc(examDraws.drawnAt))
			.limit(500)

		const out: DrawResponse[] = []
		for (const r of rows) {
			const blocked = await ensurePrintBlock(r.draw)
			if (blocked.printBlocked || isDrawPrintOverdue(blocked.drawnAt)) {
				out.push(
					mapDraw({
						...blocked,
						examTitle: r.examTitle,
						subjectCode: r.subjectCode,
						subjectName: r.subjectName,
						majorCode: r.majorCode,
						majorName: r.majorName
					})
				)
			}
		}
		return { data: out }
	}
)

/** Tra cứu theo mã bốc đề */
export const LookupDrawByCode = api(
	{
		auth: true,
		expose: true,
		method: 'GET',
		path: '/exam/draw-by-code/:drawCode'
	},
	async (params: { drawCode: string }): Promise<{ data: DrawResponse }> => {
		const actor = await getActor()
		requireExamOffice(actor)
		const code = decodeURIComponent(params.drawCode).trim()
		const [r] = await orm
			.select({
				draw: examDraws,
				examTitle: exams.title,
				subjectCode: examSubjects.code,
				subjectName: examSubjects.name,
				majorCode: examMajors.code,
				majorName: examMajors.name
			})
			.from(examDraws)
			.leftJoin(exams, eq(examDraws.examId, exams.id))
			.leftJoin(examSubjects, eq(examDraws.subjectId, examSubjects.id))
			.leftJoin(examMajors, eq(examDraws.majorId, examMajors.id))
			.where(eq(examDraws.drawCode, code))
			.limit(1)
		if (!r) throw APIError.notFound('Không tìm thấy mã bốc đề')
		return {
			data: mapDraw({
				...r.draw,
				examTitle: r.examTitle,
				subjectCode: r.subjectCode,
				subjectName: r.subjectName,
				majorCode: r.majorCode,
				majorName: r.majorName
			})
		}
	}
)

/**
 * Kho đề đã sử dụng / đã in (phiếu bốc).
 * printedOnly=true → chỉ đề đã xuất in.
 */
export const ListUsedExamVault = api(
	{ auth: true, expose: true, method: 'GET', path: '/exam/used-vault' },
	async (q: {
		subjectId?: Query<number>
		printedOnly?: Query<boolean>
		q?: Query<string>
	}): Promise<{ data: DrawResponse[] }> => {
		const actor = await getActor()
		requireExamOffice(actor)

		const conditions = []
		if (q.subjectId)
			conditions.push(eq(examDraws.subjectId, Number(q.subjectId)))
		const printedOnly =
			String(q.printedOnly) === 'true' || q.printedOnly === true
		if (printedOnly) {
			conditions.push(sql`${examDraws.printedAt} IS NOT NULL`)
		}
		const kw = (q.q || '').trim()
		if (kw) {
			// Tra cứu kho: mã bốc / mã đề / QR payload / lớp
			conditions.push(
				or(
					like(examDraws.drawCode, `%${kw}%`),
					like(examDraws.examCode, `%${kw}%`),
					like(examDraws.className, `%${kw}%`),
					like(exams.title, `%${kw}%`),
					like(exams.code, `%${kw}%`),
					like(exams.qrCode, `%${kw}%`)
				)!
			)
		}
		const where = conditions.length ? and(...conditions) : undefined
		const rows = await orm
			.select({
				draw: examDraws,
				examTitle: exams.title,
				subjectCode: examSubjects.code,
				subjectName: examSubjects.name,
				majorCode: examMajors.code,
				majorName: examMajors.name
			})
			.from(examDraws)
			.leftJoin(exams, eq(examDraws.examId, exams.id))
			.leftJoin(examSubjects, eq(examDraws.subjectId, examSubjects.id))
			.leftJoin(examMajors, eq(examDraws.majorId, examMajors.id))
			.where(where)
			.orderBy(desc(examDraws.drawnAt))
			.limit(200)

		return {
			data: rows.map((r) =>
				mapDraw({
					...r.draw,
					examTitle: r.examTitle,
					subjectCode: r.subjectCode,
					subjectName: r.subjectName,
					majorCode: r.majorCode,
					majorName: r.majorName
				})
			)
		}
	}
)

function escapeHtml(s: string) {
	return String(s || '')
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
}
