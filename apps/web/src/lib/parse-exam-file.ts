/**
 * Parse file import đề thi tự luận (txt / docx / odt / csv / json)
 *
 * Mẫu A — bộ đề Word (đoạn văn):
 *   ĐỀ THI SỐ 1
 *   Câu 1 (3 điểm): ...
 *   Đáp án - Thang điểm
 *   Câu 1 (3 điểm): ...
 *
 * Mẫu B — bảng gộp đề (Word .docx / TSV), cột:
 *   Đề số | Câu hỏi | Nội dung | Đáp án | Điểm
 *   1     | 1       | ...      | - Ý A (1,0đ) - Ý B (0,5đ) | 3
 *
 * Thang điểm trong đáp án: mỗi ý kèm (xđ) / (x,yđ) / (x điểm) / (x,y điểm).
 */

export type ParsedExamQuestion = {
	questionNumber: number
	content: string
	answer: string
	points: number
}

/** Một đề trong file (ĐỀ THI SỐ n / cột đề số) */
export type ParsedExamPaper = {
	examNumber: number | null
	title: string
	questions: ParsedExamQuestion[]
}

export type ParsedExamDocument = {
	documentTitle: string | null
	papers: ParsedExamPaper[]
	/** 'prose' = ĐỀ THI SỐ n; 'table' = bảng đề số/câu hỏi/nội dung/đáp án/điểm */
	format?: 'prose' | 'table' | 'mixed'
}

/** Câu 1 (3 điểm): ... | Câu 1: ... | 1. ... */
const Q_LINE =
	/^\s*(?:câu\s*)?(\d+)\s*(?:\((\d+(?:[.,]\d+)?)\s*điểm?\))?\s*[:.\-–—)]\s*(.*)$/i

/** Đáp án câu 1: ... | Đáp án: ... */
const A_LINE =
	/^\s*(?:đáp\s*án|da|answer)\s*(?:câu\s*(\d+))?\s*[:.\-–—]\s*(.*)$/i

/** ĐỀ THI SỐ 1 | ĐỀ SỐ 1 | ĐỀ 1 */
const EXAM_HEADER = /^\s*đề\s*(?:thi\s*)?(?:số\s*)?(\d+)\s*[:.\-–—]?\s*$/i

/** Đáp án - Thang điểm | II. ĐÁP ÁN | I. BỘ CÂU HỎI */
const ANSWER_SECTION =
	/^\s*(?:\d+\.\s*)?đáp\s*án\s*(?:[-–—:/|]\s*)?(?:thang\s*điểm)?\s*$/i

const QUESTION_SECTION = /^\s*(?:\d+\.\s*|i+\.\s*)?bộ\s*câu\s*hỏi\b/i

const DOC_TITLE = /^\s*\d*\s*(?:đề\s*thi|bộ\s*câu\s*hỏi)\s*(tự\s*luận)?\b/i

/** Dòng chỉ là điểm: 4,0 | 1.0 | 2 */
const BARE_POINTS = /^\s*(\d+(?:[.,]\d+)?)\s*$/

/**
 * Ý trong đáp án:
 * (1 điểm) (1,0 điểm) (0.5 điểm)
 * (1đ) (1,0đ) (0,5đ)  — mẫu file gộp đề Word
 */
const IDEA_POINT = /\((\d+(?:[.,]\d+)?)\s*(?:điểm|đ)\s*\)/gi

function ensureQ(
	map: Map<number, ParsedExamQuestion>,
	n: number
): ParsedExamQuestion {
	if (!map.has(n)) {
		map.set(n, {
			questionNumber: n,
			content: '',
			answer: '',
			points: 1
		})
	}
	return map.get(n)!
}

function finalizeQuestions(
	map: Map<number, ParsedExamQuestion>
): ParsedExamQuestion[] {
	return [...map.values()]
		.filter((q) => q.content.trim() || q.answer.trim())
		.sort((a, b) => a.questionNumber - b.questionNumber)
		.map((q, i) => ({
			...q,
			questionNumber: q.questionNumber || i + 1
		}))
}

function paperTitle(examNumber: number | null, fallbackIndex: number): string {
	if (examNumber != null) return `Đề thi số ${examNumber}`
	return `Đề thi ${fallbackIndex}`
}

function parseNum(s: string | undefined | null): number | null {
	if (s == null) return null
	const t = String(s).trim().replace(',', '.')
	if (!t) return null
	const n = Number(t)
	return Number.isFinite(n) ? n : null
}

/** Cộng điểm các ý trong ngoặc: (1,0đ) (0,5 điểm) → 1.5 */
export function sumIdeaPoints(answer: string): number {
	if (!answer) return 0
	let sum = 0
	const re = new RegExp(IDEA_POINT.source, 'gi')
	let m: RegExpExecArray | null
	while ((m = re.exec(answer))) {
		const v = Number(String(m[1]).replace(',', '.'))
		if (Number.isFinite(v)) sum += v
	}
	return Math.round(sum * 100) / 100
}

// ─── Bảng: đề số | câu hỏi | nội dung | đáp án | điểm ───────────────────────

type ColRole = 'exam' | 'qnum' | 'content' | 'answer' | 'points'

function classifyColHeader(h: string): ColRole | null {
	const n = h.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim()
	if (!n) return null
	if (/đề\s*số|de\s*so|^exam(\s*no)?$|^số\s*đề$/.test(n)) return 'exam'
	if (
		/^câu\s*hỏi$|^cau\s*hoi$|^stt$|^số\s*câu$|question\s*(no|number|#)?$/.test(
			n
		)
	)
		return 'qnum'
	if (/nội\s*dung|noi\s*dung|^content$|^đề\s*bài$|^câu\s*hỏi\s*nội/.test(n))
		return 'content'
	if (/đáp\s*án|dap\s*an|^answer$|thang\s*điểm|hướng\s*dẫn\s*chấm/.test(n))
		return 'answer'
	if (/^điểm$|^diem$|^points?$|^score$|^tổng\s*điểm$/.test(n)) return 'points'
	return null
}

function mapTableHeaders(
	header: string[]
): Partial<Record<ColRole, number>> | null {
	const map: Partial<Record<ColRole, number>> = {}
	header.forEach((h, i) => {
		const role = classifyColHeader(h)
		if (role && map[role] === undefined) map[role] = i
	})
	// Cần ít nhất nội dung hoặc đáp án + số câu (hoặc suy ra)
	const hasBody = map.content !== undefined || map.answer !== undefined
	if (!hasBody) return null
	// Header phải nhận diện được ít nhất 2 cột kiểu bảng đề
	const roles = Object.keys(map).length
	if (roles < 2) return null
	// Ưu tiên có "đáp án" hoặc "nội dung" + ("câu hỏi" hoặc "đề số")
	if (map.answer === undefined && map.content === undefined) return null
	return map
}

/**
 * Parse ma trận bảng (mẫu ODT/Excel).
 * Ô «đề số» trống = cùng đề với dòng trước (ô gộp).
 */
export function parseExamTableMatrix(
	matrix: string[][]
): ParsedExamDocument | null {
	if (!matrix.length) return null

	// Tìm dòng header trong vài dòng đầu
	let headerIdx = -1
	let colMap: Partial<Record<ColRole, number>> | null = null
	for (let i = 0; i < Math.min(5, matrix.length); i++) {
		const m = mapTableHeaders(matrix[i] || [])
		if (m && (m.answer !== undefined || m.content !== undefined)) {
			// Ưu tiên header có đáp án hoặc đủ cột
			const score =
				(m.exam !== undefined ? 2 : 0) +
				(m.qnum !== undefined ? 2 : 0) +
				(m.content !== undefined ? 2 : 0) +
				(m.answer !== undefined ? 3 : 0) +
				(m.points !== undefined ? 1 : 0)
			if (
				score >= 4 ||
				(m.answer !== undefined && m.qnum !== undefined)
			) {
				headerIdx = i
				colMap = m
				break
			}
			if (!colMap || score > 0) {
				headerIdx = i
				colMap = m
			}
		}
	}
	if (headerIdx < 0 || !colMap) return null

	const byExam = new Map<number, Map<number, ParsedExamQuestion>>()
	let lastExam = 1
	let usedExamCol = colMap.exam !== undefined

	const cell = (row: string[], role: ColRole): string => {
		const idx = colMap![role]
		if (idx === undefined) return ''
		return (row[idx] ?? '').trim()
	}

	for (let r = headerIdx + 1; r < matrix.length; r++) {
		const row = matrix[r] || []
		if (!row.some((c) => String(c || '').trim())) continue

		const examRaw = cell(row, 'exam')
		const examN = parseNum(examRaw)
		if (examN != null && examN > 0) {
			lastExam = examN
			usedExamCol = true
		}
		const examKey = lastExam

		const qRaw = cell(row, 'qnum')
		let qN = parseNum(qRaw)
		const content = cell(row, 'content')
		const answer = cell(row, 'answer')
		const ptsCol = parseNum(cell(row, 'points'))

		// Bỏ dòng không có nội dung/đáp án
		if (!content && !answer && qN == null) continue

		if (qN == null || qN <= 0) {
			// Không có số câu → tăng dần trong đề
			const emap = byExam.get(examKey)
			qN = emap ? emap.size + 1 : 1
		}

		if (!byExam.has(examKey)) byExam.set(examKey, new Map())
		const emap = byExam.get(examKey)!
		const q = ensureQ(emap, qN)
		if (content) {
			q.content = q.content ? `${q.content}\n${content}` : content
		}
		if (answer) {
			q.answer = q.answer ? `${q.answer}\n${answer}` : answer
		}

		// Điểm: cột điểm → tổng ý ( ) → giữ cũ
		if (ptsCol != null && ptsCol > 0) {
			q.points = ptsCol
		} else {
			const fromIdeas = sumIdeaPoints(q.answer)
			if (fromIdeas > 0) q.points = fromIdeas
		}
	}

	const papers: ParsedExamPaper[] = [...byExam.entries()]
		.sort((a, b) => a[0] - b[0])
		.map(([examNumber, map], i) => ({
			examNumber: usedExamCol ? examNumber : null,
			title: paperTitle(usedExamCol ? examNumber : null, i + 1),
			questions: finalizeQuestions(map)
		}))
		.filter((p) => p.questions.length > 0)

	if (!papers.length) return null
	return {
		documentTitle: 'Bảng đề / đáp án (thang điểm theo ý)',
		papers,
		format: 'table'
	}
}

/** Parse text dạng TSV/CSV/pipe có header bảng */
function tryParseExamTableFromText(text: string): ParsedExamDocument | null {
	const lines = text
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((l) => l.trimEnd())
		.filter((l) => l.trim())
	if (lines.length < 2) return null

	// Header có thể không phải dòng đầu (có tiêu đề «ĐỀ THI MÔN…» phía trên)
	const headerRe =
		/đề\s*số|câu\s*hỏi|nội\s*dung|đáp\s*án|de\s*so|noi\s*dung|dap\s*an/i
	let headerLineIdx = -1
	for (let i = 0; i < Math.min(8, lines.length); i++) {
		if (headerRe.test(lines[i] || '')) {
			headerLineIdx = i
			break
		}
	}
	if (headerLineIdx < 0) return null

	const headerLine = lines[headerLineIdx] || ''
	const sep = headerLine.includes('\t')
		? '\t'
		: headerLine.includes('|')
			? '|'
			: headerLine.includes(';')
				? ';'
				: ','

	const bodyLines = lines.slice(headerLineIdx)
	const matrix = bodyLines.map((line) =>
		sep === ','
			? splitCsv(line).map((c) => c.trim())
			: line.split(sep).map((c) => c.trim())
	)
	return parseExamTableMatrix(matrix)
}

// ─── Mẫu «BỘ CÂU HỎI - ĐÁP ÁN» (Bo_cau_hoi_dap_an_hoan_chinh.docx) ─────────

/**
 * I. BỘ CÂU HỎI
 *   Đề số 1
 *   Câu 1. …
 * II. ĐÁP ÁN  (prose hoặc bảng Nội dung | Điểm)
 *   ĐỀ SỐ 1
 *   Câu 1. …
 *   4,0
 *   - ý …
 *   1,0
 */
export function parseBoCauHoiDapAnFormat(
	text: string
): ParsedExamDocument | null {
	const lines = text
		.replace(/\r\n/g, '\n')
		.split('\n')
		.map((l) => l.trim())
		.filter(Boolean)

	const hasQBlock = lines.some(
		(l) =>
			QUESTION_SECTION.test(l) ||
			/^i\.\s*bộ\s*câu\s*hỏi/i.test(l) ||
			(/^đề\s*số\s*\d+/i.test(l) &&
				lines.some((x) => /^câu\s*\d+/i.test(x)))
	)
	const hasABlock = lines.some(
		(l) =>
			ANSWER_SECTION.test(l) ||
			/^ii\.\s*đáp\s*án/i.test(l) ||
			(/^đề\s*số\s*\d+/i.test(l) &&
				lines.some((x) => BARE_POINTS.test(x)))
	)
	// Cần thấy cả khối câu hỏi (Đề số + Câu) — không bắt buộc nhãn II
	const deCount = lines.filter((l) => EXAM_HEADER.test(l)).length
	const cauCount = lines.filter((l) => Q_LINE.test(l)).length
	if (deCount < 1 || cauCount < 1) return null
	// Heuristic: mẫu này thường có ≥2 đề hoặc có điểm dòng riêng / II. ĐÁP ÁN
	const barePts = lines.some((l) => BARE_POINTS.test(l))
	if (!hasQBlock && !hasABlock && !barePts && deCount < 2) return null

	type QMap = Map<number, ParsedExamQuestion>
	const qByExam = new Map<number, QMap>()
	const aByExam = new Map<number, QMap>()

	let mode: 'q' | 'a' = 'q'
	let examN = 0
	let curQ: ParsedExamQuestion | null = null
	/** true = dòng điểm tiếp theo là tổng điểm câu (ngay sau «Câu n.») */
	let nextPtsIsQuestionTotal = false
	let documentTitle: string | null = null

	const ensureExam = (n: number, side: 'q' | 'a'): QMap => {
		const store = side === 'q' ? qByExam : aByExam
		if (!store.has(n)) store.set(n, new Map())
		return store.get(n)!
	}

	for (const rawLine of lines) {
		// TSV 2 cột (bảng đáp án): Nội dung \t Điểm
		const tabParts = rawLine.split('\t').map((s) => s.trim())
		const col0 = tabParts[0] || ''
		const col1 = tabParts.length > 1 ? tabParts[1] || '' : ''
		// Ưu tiên cột 0; nếu có điểm cột 1 → coi như đang ở phần đáp án
		const t = col0
		const ptsFromCol = col1 ? parseNum(col1) : null
		if (ptsFromCol != null && col0) {
			// Dòng bảng điểm → ép mode đáp án
			mode = 'a'
		}

		// Bỏ header 2 cột bảng đáp án
		if (/^nội\s*dung\s*$/i.test(t) || /^điểm\s*$/i.test(t)) continue
		if (/^nội\s*dung\s+điểm$/i.test(t)) continue
		if (/^nội\s*dung$/i.test(col0) && /^điểm$/i.test(col1)) {
			mode = 'a'
			continue
		}

		if (QUESTION_SECTION.test(t) || /^i\.\s*bộ\s*câu\s*hỏi/i.test(t)) {
			mode = 'q'
			curQ = null
			nextPtsIsQuestionTotal = false
			continue
		}
		if (ANSWER_SECTION.test(t) || /^ii\.\s*đáp\s*án/i.test(t)) {
			mode = 'a'
			curQ = null
			nextPtsIsQuestionTotal = false
			continue
		}

		if (
			!documentTitle &&
			(/bộ\s*câu\s*hỏi\s*[-–—]?\s*đáp\s*án/i.test(t) || DOC_TITLE.test(t))
		) {
			documentTitle = t
		}

		const eh = t.match(EXAM_HEADER)
		if (eh) {
			examN = Number(eh[1])
			ensureExam(examN, mode)
			curQ = null
			nextPtsIsQuestionTotal = false
			continue
		}

		// Dòng điểm thuần sau câu / ý
		const ptBare = t.match(BARE_POINTS)
		if (ptBare && curQ && mode === 'a') {
			const pts = Number(String(ptBare[1]).replace(',', '.'))
			if (Number.isFinite(pts) && pts > 0) {
				if (nextPtsIsQuestionTotal) {
					curQ.points = pts
					nextPtsIsQuestionTotal = false
				} else {
					const tag = `(${String(ptBare[1]).replace('.', ',')}đ)`
					if (curQ.answer && !curQ.answer.endsWith(tag)) {
						curQ.answer = `${curQ.answer} ${tag}`.trim()
					}
					const idea = sumIdeaPoints(curQ.answer)
					if (idea > 0) curQ.points = idea
				}
			}
			continue
		}

		const qm = t.match(Q_LINE)
		if (qm) {
			if (!examN) examN = 1
			const curMap = ensureExam(examN, mode)
			const n = Number(qm[1])
			let ptsInline = qm[2]
				? Number(String(qm[2]).replace(',', '.'))
				: undefined
			// Word/TSV đôi khi dính «…toàn diện4,0» không có khoảng trắng
			let rest = (qm[3] || '').trim()
			const glued = rest.match(/^(.*?)[\s\u00a0]*(\d+[.,]\d+)\s*$/)
			if (glued && ptsInline == null && ptsFromCol == null) {
				rest = glued[1]!.trim()
				ptsInline = Number(String(glued[2]).replace(',', '.'))
			}
			const q = ensureQ(curMap, n)
			if (mode === 'q') {
				q.content = rest || q.content
				if (ptsInline != null && ptsInline > 0) q.points = ptsInline
				nextPtsIsQuestionTotal = false
			} else {
				if (rest && !q.content) q.content = rest
				if (ptsInline != null && ptsInline > 0) {
					q.points = ptsInline
					nextPtsIsQuestionTotal = false
				} else if (ptsFromCol != null && ptsFromCol > 0) {
					q.points = ptsFromCol
					nextPtsIsQuestionTotal = false
				} else {
					nextPtsIsQuestionTotal = true
				}
			}
			curQ = q
			continue
		}

		// Dòng ý / nội dung tiếp
		if (curQ && examN) {
			if (mode === 'a') {
				if (/^nội\s*dung$/i.test(t)) continue
				const tag =
					ptsFromCol != null && ptsFromCol > 0
						? ` (${String(col1).replace('.', ',')}đ)`
						: ''
				const line = t + tag
				curQ.answer = curQ.answer ? `${curQ.answer}\n${line}` : line
				const idea = sumIdeaPoints(curQ.answer)
				if (idea > 0) curQ.points = idea
				nextPtsIsQuestionTotal = false
			} else {
				curQ.content = curQ.content ? `${curQ.content}\n${t}` : t
			}
		}
	}

	// Merge q + a theo exam / question number
	const allExamNums = new Set<number>([...qByExam.keys(), ...aByExam.keys()])
	if (!allExamNums.size) return null

	const papers: ParsedExamPaper[] = [...allExamNums]
		.sort((a, b) => a - b)
		.map((en) => {
			const qmap = qByExam.get(en) || new Map()
			const amap = aByExam.get(en) || new Map()
			const nums = new Set<number>([...qmap.keys(), ...amap.keys()])
			const questions: ParsedExamQuestion[] = [...nums]
				.sort((a, b) => a - b)
				.map((qn) => {
					const q = qmap.get(qn)
					const a = amap.get(qn)
					const content = (q?.content || a?.content || '').trim()
					let answer = (a?.answer || '').trim()
					// Nếu answer trống nhưng a.content khác content câu hỏi → coi content đáp án
					if (!answer && a?.content && a.content !== content) {
						answer = a.content.trim()
					}
					let points = a?.points || q?.points || 0
					const idea = sumIdeaPoints(answer)
					if (idea > 0) points = idea
					if (!points) points = 1
					return {
						questionNumber: qn,
						content: content || `(Câu ${qn})`,
						answer,
						points
					}
				})
				.filter((q) => q.content.trim() || q.answer.trim())
			return {
				examNumber: en,
				title: paperTitle(en, en),
				questions
			}
		})
		.filter((p) => p.questions.length > 0)

	if (!papers.length) return null

	// Cần có ít nhất 1 câu có đáp án hoặc nhiều đề — tránh nuốt nhầm file khác
	const withAns = papers.reduce(
		(n, p) => n + p.questions.filter((q) => q.answer.trim()).length,
		0
	)
	const totalQ = papers.reduce((n, p) => n + p.questions.length, 0)
	if (papers.length === 1 && withAns === 0 && !barePts) {
		// 1 đề không đáp án → để parser prose cũ xử lý
		return null
	}
	if (totalQ === 0) return null

	return {
		documentTitle: documentTitle || 'Bộ câu hỏi - Đáp án thi tự luận',
		papers,
		format: 'mixed'
	}
}

/**
 * Bảng đáp án 2 cột: Nội dung | Điểm (sau header ĐỀ SỐ n / Câu n.)
 */
export function parseAnswerScoreTable(
	matrix: string[][]
): Map<number, Map<number, ParsedExamQuestion>> | null {
	if (!matrix.length) return null
	// Header Nội dung | Điểm
	const h0 = (matrix[0]?.[0] || '').toLowerCase()
	const h1 = (matrix[0]?.[1] || '').toLowerCase()
	const isScoreTbl =
		/nội\s*dung|noi\s*dung|content/.test(h0) &&
		(/điểm|diem|point|score/.test(h1) || matrix[0]?.length === 2)
	if (!isScoreTbl && !matrix.some((r) => EXAM_HEADER.test(r[0] || ''))) {
		return null
	}

	const byExam = new Map<number, Map<number, ParsedExamQuestion>>()
	let examN = 0
	let cur: ParsedExamQuestion | null = null

	const start = isScoreTbl ? 1 : 0
	for (let i = start; i < matrix.length; i++) {
		const row = matrix[i] || []
		const c0 = (row[0] || '').trim()
		const c1 = (row[1] || '').trim()
		if (!c0 && !c1) continue

		const eh = c0.match(EXAM_HEADER)
		if (eh) {
			examN = Number(eh[1])
			if (!byExam.has(examN)) byExam.set(examN, new Map())
			cur = null
			continue
		}
		if (!examN) continue
		if (!byExam.has(examN)) byExam.set(examN, new Map())

		const qm = c0.match(Q_LINE)
		if (qm) {
			const n = Number(qm[1])
			const rest = (qm[3] || '').trim()
			const q = ensureQ(byExam.get(examN)!, n)
			if (rest) q.content = rest
			const pts = parseNum(c1)
			if (pts != null && pts > 0) q.points = pts
			cur = q
			continue
		}

		if (cur) {
			const pts = parseNum(c1)
			const line = c0
			if (line) {
				const tag =
					pts != null && pts > 0
						? ` (${String(c1).replace('.', ',')}đ)`
						: ''
				cur.answer = cur.answer
					? `${cur.answer}\n${line}${tag}`
					: `${line}${tag}`
			}
			const idea = sumIdeaPoints(cur.answer)
			if (idea > 0) cur.points = idea
			else if (pts != null && pts > 0 && !cur.answer.includes('\n')) {
				cur.points = pts
			}
		}
	}

	return byExam.size ? byExam : null
}

// ─── Prose: ĐỀ THI SỐ n ─────────────────────────────────────────────────────

/**
 * Parse cả file theo cấu trúc bộ đề (nhiều ĐỀ THI SỐ n).
 * Nếu không có header đề → 1 paper duy nhất (tương thích file cũ).
 */
export function parseExamDocumentFromText(text: string): ParsedExamDocument {
	// Mẫu bộ CH + ĐA hoàn chỉnh (ưu tiên cao)
	const bo = parseBoCauHoiDapAnFormat(text)
	if (bo?.papers.length) return bo

	// Ưu tiên bảng TSV/CSV (mẫu ODT đáp án)
	const asTable = tryParseExamTableFromText(text)
	if (asTable?.papers.length) return asTable

	const lines = text.replace(/\r\n/g, '\n').split('\n')

	type Section = {
		examNumber: number | null
		headerRaw: string | null
		map: Map<number, ParsedExamQuestion>
		mode: 'q' | 'a'
		current: ParsedExamQuestion | null
	}

	const sections: Section[] = []
	let documentTitle: string | null = null
	let cur: Section | null = null

	const startSection = (
		examNumber: number | null,
		headerRaw: string | null
	) => {
		cur = {
			examNumber,
			headerRaw,
			map: new Map(),
			mode: 'q',
			current: null
		}
		sections.push(cur)
	}

	for (const raw of lines) {
		const t = raw.trim()
		if (!t) continue

		const eh = t.match(EXAM_HEADER)
		if (eh) {
			startSection(Number(eh[1]), t)
			continue
		}

		if (ANSWER_SECTION.test(t)) {
			if (!cur) startSection(null, null)
			cur!.mode = 'a'
			cur!.current = null
			continue
		}

		if (
			!cur &&
			!sections.length &&
			DOC_TITLE.test(t) &&
			!EXAM_HEADER.test(t)
		) {
			documentTitle = t
			continue
		}

		if (!cur) startSection(null, null)

		const qm = t.match(Q_LINE)
		if (qm) {
			const n = Number(qm[1])
			const pts = qm[2]
				? Number(String(qm[2]).replace(',', '.'))
				: undefined
			const rest = (qm[3] || '').trim()
			const q = ensureQ(cur!.map, n)
			if (pts != null && Number.isFinite(pts) && pts > 0) {
				q.points = pts
			}
			if (cur!.mode === 'a') {
				q.answer = rest
				// Nếu không có điểm trên dòng, cộng ý (x điểm)
				if (pts == null) {
					const idea = sumIdeaPoints(rest)
					if (idea > 0) q.points = idea
				}
			} else {
				q.content = rest
			}
			cur!.current = q
			continue
		}

		const am = t.match(A_LINE)
		if (am) {
			const n = am[1] ? Number(am[1]) : cur!.current?.questionNumber
			const rest = (am[2] || '').trim()
			if (n) {
				const q = ensureQ(cur!.map, n)
				q.answer = rest
					? q.answer
						? `${q.answer}\n${rest}`
						: rest
					: q.answer
				const idea = sumIdeaPoints(q.answer)
				if (idea > 0) q.points = idea
				cur!.current = q
				cur!.mode = 'a'
			}
			continue
		}

		if (cur!.current) {
			if (cur!.mode === 'a') {
				cur!.current.answer = cur!.current.answer
					? `${cur!.current.answer}\n${t}`
					: t
				const idea = sumIdeaPoints(cur!.current.answer)
				if (idea > 0 && cur!.current.points <= 1) {
					cur!.current.points = idea
				}
			} else {
				cur!.current.content = cur!.current.content
					? `${cur!.current.content}\n${t}`
					: t
			}
		}
	}

	let papers: ParsedExamPaper[] = sections
		.map((s, i) => ({
			examNumber: s.examNumber,
			title: paperTitle(s.examNumber, i + 1),
			questions: finalizeQuestions(s.map)
		}))
		.filter((p) => p.questions.length > 0)

	if (!papers.length) {
		const fallback = parseExamQuestionsFallback(text)
		if (fallback.length) {
			papers = [
				{
					examNumber: null,
					title: 'Đề thi',
					questions: fallback
				}
			]
		}
	}

	return { documentTitle, papers, format: 'prose' }
}

/** Parse 1 list câu (file đơn hoặc legacy) */
export function parseExamQuestionsFromText(text: string): ParsedExamQuestion[] {
	const doc = parseExamDocumentFromText(text)
	if (!doc.papers.length) return []
	return doc.papers[0]!.questions
}

function parseExamQuestionsFallback(text: string): ParsedExamQuestion[] {
	const map = new Map<number, ParsedExamQuestion>()

	if (text.includes(',')) {
		const rows = text.replace(/\r\n/g, '\n').split('\n').filter(Boolean)
		for (const row of rows) {
			if (/^stt|^số|^#|question|đề\s*số|câu\s*hỏi/i.test(row.trim()))
				continue
			const parts = splitCsv(row)
			if (parts.length < 2) continue
			const n = Number(parts[0]) || map.size + 1
			const content = parts[1]?.trim() || ''
			const answer = (parts[2] || '').trim()
			let points = Number(parts[3]) || 0
			if (!points && answer) points = sumIdeaPoints(answer)
			if (!content && !answer) continue
			map.set(n, {
				questionNumber: n,
				content,
				answer,
				points: points > 0 ? points : 1
			})
		}
	}

	if (map.size === 0) {
		try {
			const data = JSON.parse(text) as unknown
			const arr = Array.isArray(data)
				? data
				: (data as { questions?: unknown[] })?.questions
			if (Array.isArray(arr)) {
				arr.forEach((item, i) => {
					const o = item as Record<string, unknown>
					const n = Number(o.questionNumber ?? o.stt ?? i + 1)
					const answer = String(o.answer ?? o.dapAn ?? '')
					let points = Number(o.points ?? o.diem ?? 0) || 0
					if (!points && answer) points = sumIdeaPoints(answer)
					map.set(n, {
						questionNumber: n,
						content: String(
							o.content ?? o.cauHoi ?? o.question ?? ''
						),
						answer,
						points: points > 0 ? points : 1
					})
				})
			}
		} catch {
			/* not json */
		}
	}

	if (map.size === 0) {
		const blocks = text
			.replace(/\r\n/g, '\n')
			.split(/\n{2,}/)
			.map((b) => b.trim())
			.filter(Boolean)
			.filter((b) => !EXAM_HEADER.test(b) && !ANSWER_SECTION.test(b))
		blocks.forEach((b, i) => {
			map.set(i + 1, {
				questionNumber: i + 1,
				content: b,
				answer: '',
				points: 1
			})
		})
	}

	return finalizeQuestions(map)
}

function splitCsv(row: string): string[] {
	const out: string[] = []
	let cur = ''
	let inQ = false
	for (let i = 0; i < row.length; i++) {
		const c = row[i]!
		if (c === '"') {
			inQ = !inQ
			continue
		}
		if (c === ',' && !inQ) {
			out.push(cur)
			cur = ''
			continue
		}
		cur += c
	}
	out.push(cur)
	return out
}

/** Merge đáp án từ file đáp án riêng vào list câu hỏi */
export function mergeAnswersIntoQuestions(
	questions: ParsedExamQuestion[],
	answerText: string
): ParsedExamQuestion[] {
	// File đáp án có thể là bảng (nhiều đề) — gộp paper đầu hoặc theo số câu
	const doc = parseExamDocumentFromText(answerText)
	const fromAns =
		doc.papers.length === 1
			? doc.papers[0]!.questions
			: doc.papers.flatMap((p) => p.questions)
	if (!fromAns.length) return questions

	const byNum = new Map(questions.map((q) => [q.questionNumber, { ...q }]))
	if (!byNum.size) {
		return fromAns.map((a) => ({
			...a,
			content: a.content || `(Câu ${a.questionNumber})`,
			answer: a.answer || a.content
		}))
	}

	for (const a of fromAns) {
		const q = byNum.get(a.questionNumber)
		if (q) {
			q.answer = (a.answer || a.content || q.answer).trim()
			if (a.points > 0) q.points = a.points
			else {
				const idea = sumIdeaPoints(q.answer)
				if (idea > 0) q.points = idea
			}
			// Bảng có thể có content chi tiết hơn
			if (a.content && a.content.length > q.content.length) {
				q.content = a.content
			}
		} else {
			byNum.set(a.questionNumber, {
				questionNumber: a.questionNumber,
				content: a.content || '',
				answer: a.answer || a.content,
				points: a.points
			})
		}
	}
	return [...byNum.values()].sort(
		(a, b) => a.questionNumber - b.questionNumber
	)
}

// ─── Extract binary formats ─────────────────────────────────────────────────

function decodeXmlEntities(s: string): string {
	return s
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&')
}

function xmlLocalName(tag: string): string {
	const i = tag.indexOf('}')
	return i >= 0 ? tag.slice(i + 1) : tag
}

/**
 * Trích text từ fragment OOXML (w:t) hoặc ODF (text:span / text:s / line-break).
 * Lưu ý: không dùng /text:s[^/]*\// — sẽ nuốt nhầm nội dung trong <text:span>…/>.
 */
function collectTextFromXmlFragment(xml: string): string {
	const texts: string[] = []
	const tRe = /<w:t(?:\s[^>]*)?>([^<]*)<\/w:t>/gi
	let m: RegExpExecArray | null
	while ((m = tRe.exec(xml))) {
		texts.push(decodeXmlEntities(m[1] ?? ''))
	}
	if (texts.length) return texts.join('').trim()

	// ODF
	const stripped = xml
		.replace(/<text:line-break\b[^>]*\/?>/gi, '\n')
		.replace(/<text:tab\b[^>]*\/?>/gi, '\t')
		// text:s = space (không phải text:span — dùng \b)
		.replace(/<text:s\b[^>]*\/?>/gi, ' ')
		.replace(/<[^>]+>/g, '')
	return decodeXmlEntities(stripped)
		.replace(/[ \t]+\n/g, '\n')
		.replace(/\n[ \t]+/g, '\n')
		.replace(/[ \t]{2,}/g, ' ')
		.replace(/\n{3,}/g, '\n\n')
		.trim()
}

/** Bảng từ .docx */
export function extractTablesFromDocxXml(docXml: string): string[][][] {
	const tables: string[][][] = []
	const tblRe = /<w:tbl[\s>][\s\S]*?<\/w:tbl>/gi
	let tblMatch: RegExpExecArray | null
	while ((tblMatch = tblRe.exec(docXml))) {
		const tbl = tblMatch[0]
		const rows: string[][] = []
		const trRe = /<w:tr[\s>][\s\S]*?<\/w:tr>/gi
		let trMatch: RegExpExecArray | null
		while ((trMatch = trRe.exec(tbl))) {
			const tr = trMatch[0]
			const cells: string[] = []
			const tcRe = /<w:tc[\s>][\s\S]*?<\/w:tc>/gi
			let tcMatch: RegExpExecArray | null
			while ((tcMatch = tcRe.exec(tr))) {
				const tc = tcMatch[0]
				const paras: string[] = []
				const pRe = /<w:p[\s>][\s\S]*?<\/w:p>/gi
				let pMatch: RegExpExecArray | null
				while ((pMatch = pRe.exec(tc))) {
					const line = collectTextFromXmlFragment(pMatch[0])
					if (line) paras.push(line)
				}
				cells.push(paras.join('\n').trim())
			}
			if (cells.length) rows.push(cells)
		}
		if (rows.length >= 2) tables.push(rows)
	}
	return tables
}

/** Bảng từ .odt (content.xml) */
export function extractTablesFromOdtXml(contentXml: string): string[][][] {
	const tables: string[][][] = []
	// table:table ...
	const tblRe = /<table:table\b[\s\S]*?<\/table:table>/gi
	let tblMatch: RegExpExecArray | null
	while ((tblMatch = tblRe.exec(contentXml))) {
		const tbl = tblMatch[0]
		const rows: string[][] = []
		const trRe = /<table:table-row\b[\s\S]*?<\/table:table-row>/gi
		let trMatch: RegExpExecArray | null
		while ((trMatch = trRe.exec(tbl))) {
			const tr = trMatch[0]
			const cells: string[] = []
			// table-cell may have number-columns-repeated
			const tcRe =
				/<table:table-cell\b([^>]*)>([\s\S]*?)<\/table:table-cell>|<table:covered-table-cell\b[^/]*\/>|<table:covered-table-cell\b[^>]*>[\s\S]*?<\/table:covered-table-cell>/gi
			let tcMatch: RegExpExecArray | null
			while ((tcMatch = tcRe.exec(tr))) {
				const full = tcMatch[0]
				if (full.includes('covered-table-cell')) {
					cells.push('')
					continue
				}
				const attrs = tcMatch[1] || ''
				const body = tcMatch[2] || ''
				const paras: string[] = []
				const pRe =
					/<text:p\b[^>]*>([\s\S]*?)<\/text:p>|<text:h\b[^>]*>([\s\S]*?)<\/text:h>/gi
				let pMatch: RegExpExecArray | null
				while ((pMatch = pRe.exec(body))) {
					const inner = pMatch[1] ?? pMatch[2] ?? ''
					const line = collectTextFromXmlFragment(`<x>${inner}</x>`)
					if (line) paras.push(line)
				}
				const text = paras.join('\n').trim()
				const repMatch = attrs.match(
					/number-columns-repeated\s*=\s*"(\d+)"/
				)
				const rep = repMatch ? Number(repMatch[1]) : 1
				for (let i = 0; i < Math.min(rep, 20); i++) cells.push(text)
			}
			if (cells.length) rows.push(cells)
		}
		if (rows.length >= 2) tables.push(rows)
	}
	return tables
}

/** Plain paragraphs from ODT */
function extractParagraphsFromOdtXml(contentXml: string): string {
	// Only top-level-ish paragraphs outside tables: strip tables first
	const withoutTables = contentXml.replace(
		/<table:table\b[\s\S]*?<\/table:table>/gi,
		'\n'
	)
	const paras: string[] = []
	const pRe =
		/<text:p\b[^>]*>([\s\S]*?)<\/text:p>|<text:h\b[^>]*>([\s\S]*?)<\/text:h>/gi
	let pMatch: RegExpExecArray | null
	while ((pMatch = pRe.exec(withoutTables))) {
		const inner = pMatch[1] ?? pMatch[2] ?? ''
		const line = collectTextFromXmlFragment(`<x>${inner}</x>`)
		if (line) paras.push(line)
	}
	return paras.join('\n')
}

export async function extractTextFromDocx(buf: ArrayBuffer): Promise<string> {
	const JSZip = (await import('jszip')).default
	const zip = await JSZip.loadAsync(buf)
	const docXml = await zip.file('word/document.xml')?.async('string')
	if (!docXml) {
		throw new Error('File Word không hợp lệ (thiếu document.xml)')
	}

	// Ưu tiên chèn bảng dạng TSV để parser text nhận ra
	const tables = extractTablesFromDocxXml(docXml)
	const parts: string[] = []
	for (const t of tables) {
		parts.push(t.map((row) => row.join('\t')).join('\n'))
		parts.push('')
	}

	const paras: string[] = []
	// Bỏ paragraph trong table (đã lấy) — đơn giản: lấy mọi p, table TSV trước
	const pRe = /<w:p[\s>][\s\S]*?<\/w:p>/gi
	let pMatch: RegExpExecArray | null
	while ((pMatch = pRe.exec(docXml))) {
		const line = collectTextFromXmlFragment(pMatch[0])
		if (line) paras.push(line)
	}
	if (paras.length) parts.push(paras.join('\n'))
	return parts.join('\n')
}

export async function extractTextFromOdt(buf: ArrayBuffer): Promise<string> {
	const JSZip = (await import('jszip')).default
	const zip = await JSZip.loadAsync(buf)
	const contentXml = await zip.file('content.xml')?.async('string')
	if (!contentXml) {
		throw new Error('File ODT không hợp lệ (thiếu content.xml)')
	}

	const tables = extractTablesFromOdtXml(contentXml)
	const parts: string[] = []
	for (const t of tables) {
		parts.push(t.map((row) => row.join('\t')).join('\n'))
		parts.push('')
	}
	const paras = extractParagraphsFromOdtXml(contentXml)
	if (paras.trim()) parts.push(paras)
	return parts.join('\n')
}

/** Parse trực tiếp bảng từ buffer odt/docx (ưu tiên hơn plain text) */
export async function parseExamTablesFromBuffer(
	buf: ArrayBuffer,
	kind: 'odt' | 'docx'
): Promise<ParsedExamDocument | null> {
	const JSZip = (await import('jszip')).default
	const zip = await JSZip.loadAsync(buf)
	let tables: string[][][] = []
	if (kind === 'odt') {
		const contentXml = await zip.file('content.xml')?.async('string')
		if (!contentXml) return null
		tables = extractTablesFromOdtXml(contentXml)
	} else {
		const docXml = await zip.file('word/document.xml')?.async('string')
		if (!docXml) return null
		tables = extractTablesFromDocxXml(docXml)
	}

	let best: ParsedExamDocument | null = null
	let bestN = 0
	for (const matrix of tables) {
		const doc = parseExamTableMatrix(matrix)
		if (!doc) continue
		const n = doc.papers.reduce((s, p) => s + p.questions.length, 0)
		if (n > bestN) {
			best = doc
			bestN = n
		}
	}
	return best
}

/** Đọc file → plain text (txt/csv/json/docx/odt) */
export async function readFileAsText(file: File): Promise<string> {
	const name = file.name.toLowerCase()
	if (name.endsWith('.docx')) {
		return extractTextFromDocx(await file.arrayBuffer())
	}
	if (name.endsWith('.odt')) {
		return extractTextFromOdt(await file.arrayBuffer())
	}
	if (name.endsWith('.doc')) {
		throw new Error(
			'File .doc (Word cũ) không hỗ trợ. Hãy lưu thành .docx hoặc .odt rồi import lại.'
		)
	}
	if (
		name.endsWith('.pdf') ||
		name.endsWith('.xlsx') ||
		name.endsWith('.xls')
	) {
		return ''
	}
	return file.text()
}

/** Parse document đầy đủ từ File */
export async function parseExamDocumentFromFile(
	file: File
): Promise<ParsedExamDocument> {
	const name = file.name.toLowerCase()
	const buf = await file.arrayBuffer()

	const text = name.endsWith('.odt')
		? await extractTextFromOdt(buf)
		: name.endsWith('.docx')
			? await extractTextFromDocx(buf)
			: await readFileAsText(file)

	// 1) Mẫu «BỘ CÂU HỎI - ĐÁP ÁN hoàn chỉnh» (prose + bảng điểm)
	if (text.trim()) {
		const bo = parseBoCauHoiDapAnFormat(text)
		if (bo?.papers.length) {
			// Bổ sung đáp án từ bảng 2 cột Nội dung|Điểm nếu prose thiếu
			if (name.endsWith('.odt') || name.endsWith('.docx')) {
				const kind = name.endsWith('.odt') ? 'odt' : 'docx'
				const merged = await enrichWithAnswerScoreTables(bo, buf, kind)
				return merged
			}
			return bo
		}
	}

	// 2) Bảng ODT/DOCX (mẫu gộp đề / thang điểm theo ý)
	if (name.endsWith('.odt') || name.endsWith('.docx')) {
		const kind = name.endsWith('.odt') ? 'odt' : 'docx'
		const fromTable = await parseExamTablesFromBuffer(buf, kind)
		// Chỉ nhận khi có đáp án thực sự (tránh nhận nhầm bảng header quốc hiệu)
		if (fromTable?.papers.length) {
			const ansN = fromTable.papers.reduce(
				(n, p) => n + p.questions.filter((q) => q.answer.trim()).length,
				0
			)
			const qN = fromTable.papers.reduce(
				(n, p) => n + p.questions.length,
				0
			)
			if (ansN > 0 || qN >= 3) return fromTable
		}
	}

	if (!text.trim()) {
		throw new Error(
			'Không đọc được nội dung file. Dùng .odt / .docx / .txt theo mẫu bộ đề hoặc bảng đáp án.'
		)
	}
	const doc = parseExamDocumentFromText(text)
	if (!doc.papers.length) {
		throw new Error(
			'Không nhận diện được đề. Hỗ trợ: (1) BỘ CÂU HỎI + ĐÁP ÁN (Đề số n / Câu n), (2) ĐỀ THI SỐ n + Đáp án - Thang điểm, (3) bảng đề số | câu hỏi | nội dung | đáp án | điểm.'
		)
	}
	return doc
}

/** Gộp bảng điểm 2 cột vào papers đã parse */
async function enrichWithAnswerScoreTables(
	doc: ParsedExamDocument,
	buf: ArrayBuffer,
	kind: 'odt' | 'docx'
): Promise<ParsedExamDocument> {
	const JSZip = (await import('jszip')).default
	const zip = await JSZip.loadAsync(buf)
	let tables: string[][][] = []
	if (kind === 'odt') {
		const contentXml = await zip.file('content.xml')?.async('string')
		if (contentXml) tables = extractTablesFromOdtXml(contentXml)
	} else {
		const docXml = await zip.file('word/document.xml')?.async('string')
		if (docXml) tables = extractTablesFromDocxXml(docXml)
	}

	let scoreMaps: Map<number, Map<number, ParsedExamQuestion>> | null = null
	for (const matrix of tables) {
		const m = parseAnswerScoreTable(matrix)
		if (m && m.size) {
			scoreMaps = m
			break
		}
	}
	if (!scoreMaps) return doc

	const papers = doc.papers.map((p) => {
		const en = p.examNumber
		if (en == null) return p
		const amap = scoreMaps!.get(en)
		if (!amap) return p
		const byQ = new Map(
			p.questions.map((q) => [q.questionNumber, { ...q }])
		)
		for (const [qn, a] of amap) {
			const q = byQ.get(qn) || {
				questionNumber: qn,
				content: a.content || '',
				answer: '',
				points: 1
			}
			if (a.answer?.trim()) q.answer = a.answer.trim()
			if (a.content && a.content.length > (q.content || '').length) {
				// tiêu đề câu từ bảng
				if (!q.content) q.content = a.content
			}
			if (a.points > 0) q.points = a.points
			const idea = sumIdeaPoints(q.answer)
			if (idea > 0) q.points = idea
			byQ.set(qn, q)
		}
		return {
			...p,
			questions: [...byQ.values()].sort(
				(a, b) => a.questionNumber - b.questionNumber
			)
		}
	})
	return { ...doc, papers }
}

// silence unused in case tree-shake
void xmlLocalName
