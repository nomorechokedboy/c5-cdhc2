/**
 * Đề thi của tôi — soạn / import Word bộ đề, gửi duyệt
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	Download,
	Eye,
	FilePlus2,
	FileDown,
	Loader2,
	Printer,
	Send,
	Trash2,
	Pencil,
	Upload
} from 'lucide-react'
import { isSuperAdmin } from '@/lib/utils'
import { toast } from 'sonner'
import { GetUserInfo, UpdateMySignature } from '@/api'
import { extractSignatureFromImage } from '@/lib/signature-extract'
import {
	CheckExamDuplicates,
	CreateExam,
	DeleteExam,
	downloadTeacherExamBoard,
	printTeacherExamBoard,
	ListExamAssignments,
	ListExamClasses,
	ListExamMajors,
	ListExamSubjects,
	ListExamSystems,
	ListExams,
	SubmitExam,
	type ExamDuplicateHit,
	type ExamSubject
} from '@/api/exam'
import { ExamStatusBadge } from './exam-status'
import ExamFileImport, { type ExamAttachedFile } from './ExamFileImport'
import type { ParsedExamDocument, ParsedExamPaper } from '@/lib/parse-exam-file'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'

type QForm = { content: string; answer: string; points: string }

export default function MyExamsPage() {
	const qc = useQueryClient()
	const superAdmin = isSuperAdmin()
	const [open, setOpen] = useState(false)
	const [title, setTitle] = useState('')
	/** Cascade GV: Hệ → Ngành → Lớp → Môn (khoa cố định theo phân công) */
	const [systemId, setSystemId] = useState('')
	const [majorId, setMajorId] = useState('')
	const [classId, setClassId] = useState('')
	const [subjectId, setSubjectId] = useState('')
	const [durationMinutes, setDurationMinutes] = useState('60')
	const [note, setNote] = useState('')
	const [qFile, setQFile] = useState<ExamAttachedFile | null>(null)
	const [aFile, setAFile] = useState<ExamAttachedFile | null>(null)
	const [sourceFile, setSourceFile] = useState<ExamAttachedFile | null>(null)
	const [questions, setQuestions] = useState<QForm[]>([])
	const [parsedDoc, setParsedDoc] = useState<ParsedExamDocument | null>(null)
	const [dupWarnings, setDupWarnings] = useState<
		Array<{
			index: number
			paperNumber: number | null
			hard: string[]
			soft: string[]
			blocked: boolean
		}>
	>([])
	/** Bắt GV upload chữ ký sau import (form giấy cần chữ ký) */
	const [sigDialogOpen, setSigDialogOpen] = useState(false)
	const [sigPreview, setSigPreview] = useState<string | null>(null)
	const [sigBusy, setSigBusy] = useState(false)
	const [sigRequired, setSigRequired] = useState(false)
	const sigFileRef = useRef<HTMLInputElement>(null)

	const meQ = useQuery({
		queryKey: ['auth-me-signature'],
		queryFn: GetUserInfo,
		staleTime: 30_000
	})
	const mySignatureUrl =
		(
			meQ.data as { signatureUrl?: string | null } | undefined
		)?.signatureUrl?.trim() || ''

	function openSignatureDialog(required: boolean) {
		setSigRequired(required)
		setSigPreview(null)
		setSigDialogOpen(true)
	}

	async function onSignatureFile(file: File | null) {
		if (!file) return
		setSigBusy(true)
		try {
			const extracted = await extractSignatureFromImage(file)
			setSigPreview(extracted)
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : 'Không xử lý được ảnh chữ ký'
			)
		} finally {
			setSigBusy(false)
		}
	}

	async function saveMySignature() {
		if (!sigPreview) {
			toast.error('Chọn ảnh chữ ký trước')
			return
		}
		setSigBusy(true)
		try {
			// Đã extract nền trong suốt khi chọn file
			await UpdateMySignature(sigPreview)
			await qc.invalidateQueries({ queryKey: ['auth-me-signature'] })
			await qc.invalidateQueries({ queryKey: ['auth', 'user'] })
			toast.success(
				'Đã lưu chữ ký (nét chữ, nền trong suốt) — dùng khi in form giấy'
			)
			setSigDialogOpen(false)
			setSigPreview(null)
			setSigRequired(false)
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e))
		} finally {
			setSigBusy(false)
		}
	}

	const examsQ = useQuery({
		queryKey: ['exam-mine', superAdmin],
		queryFn: () => ListExams(superAdmin ? {} : { mine: true }),
		// Sau BGH duyệt, list GV phải lấy status mới (không giữ «Chờ BGH»)
		staleTime: 0,
		refetchOnWindowFocus: true,
		refetchOnMount: 'always'
	})
	// Môn theo phân công (GV) hoặc toàn bộ (admin)
	const subjectsQ = useQuery({
		queryKey: ['exam-subjects-mine', superAdmin],
		queryFn: () => ListExamSubjects(superAdmin ? {} : { mine: true })
	})
	/** Phân công của GV: Hệ/Ngành/Khoa/Môn/Lớp — giới hạn lớp khi import */
	const myAssignQ = useQuery({
		queryKey: ['exam-assignments-mine'],
		queryFn: () => ListExamAssignments({ mine: true }),
		enabled: !superAdmin
	})
	// Admin: load hệ/ngành từ DMĐT; GV: Hệ/Ngành lấy từ phân công (đúng nguồn)
	const systemsQ = useQuery({
		queryKey: ['exam-systems-import'],
		queryFn: () => ListExamSystems(),
		enabled: superAdmin
	})
	const majorsQ = useQuery({
		queryKey: ['exam-majors-import', systemId],
		queryFn: () =>
			ListExamMajors(systemId ? { systemId: Number(systemId) } : {}),
		enabled: superAdmin && !!systemId
	})

	const allSubjects: ExamSubject[] = subjectsQ.data || []
	const myAssigns = myAssignQ.data || []

	/** Phân công còn hiệu lực (để cascade import) */
	const activeAssigns = useMemo(
		() =>
			myAssigns.filter(
				(a) =>
					a.teachingStatus === 'ACTIVE' ||
					(!a.teachingStatus && !a.teachingEnd)
			),
		[myAssigns]
	)

	/**
	 * Khoa cố định theo phân công GV (không cho chọn).
	 * Ưu tiên: môn đã chọn → phân công lớp/môn → ngành.
	 */
	const fixedFaculty = useMemo(() => {
		const fromSub =
			(subjectId
				? allSubjects.find((x) => String(x.id) === subjectId)
				: null) || null
		if (fromSub?.facultyCode || fromSub?.facultyName) {
			return {
				code: fromSub.facultyCode || '',
				name: fromSub.facultyName || fromSub.facultyCode || '—'
			}
		}
		const fromAssign =
			activeAssigns.find(
				(a) =>
					(subjectId && String(a.subjectId) === subjectId) ||
					(classId &&
						a.classId != null &&
						String(a.classId) === classId) ||
					(majorId &&
						a.majorId != null &&
						String(a.majorId) === majorId)
			) || activeAssigns[0]
		if (!fromAssign?.facultyCode && !fromAssign?.facultyName) return null
		return {
			code: fromAssign.facultyCode || '',
			name: fromAssign.facultyName || fromAssign.facultyCode || '—'
		}
	}, [allSubjects, subjectId, majorId, classId, activeAssigns])

	/** Hệ đào tạo: admin = DMĐT; GV = chỉ hệ có trong phân công */
	const systemOptions = useMemo(() => {
		if (superAdmin) {
			return (systemsQ.data || []).map((s) => ({
				id: s.id,
				code: s.code,
				name: s.name
			}))
		}
		const map = new Map<
			number,
			{ id: number; code: string; name: string }
		>()
		// Ưu tiên phân công (đúng hệ/ngành được gán dạy)
		const source = activeAssigns.length > 0 ? activeAssigns : myAssigns
		for (const a of source) {
			const id = a.systemId != null ? Number(a.systemId) : NaN
			if (!Number.isFinite(id) || id <= 0) continue
			if (!map.has(id)) {
				map.set(id, {
					id,
					code: (a.systemCode || '').trim(),
					name:
						(a.systemName || '').trim() ||
						(a.systemCode || '').trim() ||
						`Hệ #${id}`
				})
			}
		}
		// Bổ sung từ môn (nếu phân công thiếu denorm hệ)
		for (const s of allSubjects) {
			const id = s.systemId != null ? Number(s.systemId) : NaN
			if (!Number.isFinite(id) || id <= 0 || map.has(id)) continue
			map.set(id, {
				id,
				code: (s.systemCode || '').trim(),
				name:
					(s.systemName || '').trim() ||
					(s.systemCode || '').trim() ||
					`Hệ #${id}`
			})
		}
		return [...map.values()].sort((a, b) =>
			a.name.localeCompare(b.name, 'vi')
		)
	}, [superAdmin, systemsQ.data, activeAssigns, myAssigns, allSubjects])

	/** Ngành: admin = DMĐT theo hệ; GV = ngành thuộc hệ đã chọn trong phân công */
	const majorOptions = useMemo(() => {
		if (!systemId) return []
		const sid = Number(systemId)
		if (!Number.isFinite(sid)) return []
		if (superAdmin) {
			return (majorsQ.data || []).map((m) => ({
				id: m.id,
				code: m.code,
				name: m.name
			}))
		}
		const map = new Map<
			number,
			{ id: number; code: string; name: string }
		>()
		const source = activeAssigns.length > 0 ? activeAssigns : myAssigns
		for (const a of source) {
			const aSys = a.systemId != null ? Number(a.systemId) : NaN
			const mid = a.majorId != null ? Number(a.majorId) : NaN
			if (aSys !== sid || !Number.isFinite(mid) || mid <= 0) continue
			if (!map.has(mid)) {
				map.set(mid, {
					id: mid,
					code: (a.majorCode || '').trim(),
					name:
						(a.majorName || '').trim() ||
						(a.majorCode || '').trim() ||
						`Ngành #${mid}`
				})
			}
		}
		for (const s of allSubjects) {
			const sSys = s.systemId != null ? Number(s.systemId) : NaN
			const mid = Number(s.majorId)
			if (sSys !== sid || !Number.isFinite(mid) || mid <= 0) continue
			if (!map.has(mid)) {
				map.set(mid, {
					id: mid,
					code: (s.majorCode || '').trim(),
					name:
						(s.majorName || '').trim() ||
						(s.majorCode || '').trim() ||
						`Ngành #${mid}`
				})
			}
		}
		return [...map.values()].sort((a, b) =>
			a.name.localeCompare(b.name, 'vi')
		)
	}, [
		superAdmin,
		systemId,
		majorsQ.data,
		activeAssigns,
		myAssigns,
		allSubjects
	])

	/**
	 * Lớp khi import (chọn sau ngành, trước môn):
	 * - Admin: theo ngành
	 * - GV: chỉ lớp được phân công trong ngành
	 */
	const classesQ = useQuery({
		queryKey: [
			'exam-classes-import',
			majorId,
			superAdmin,
			myAssignQ.dataUpdatedAt
		],
		queryFn: async () => {
			const mid = Number(majorId)
			const sid = systemId ? Number(systemId) : NaN
			const list = await ListExamClasses({ majorId: mid })
			// Lớp hết niên khóa: không cho import / gán đề
			const active = list.filter((c) => c.status !== 'EXPIRED')
			if (superAdmin) return active
			const allowed = new Set<number>()
			for (const a of activeAssigns) {
				if (a.classId == null) continue
				// Đúng ngành (bắt buộc khớp majorId phân công)
				if (a.majorId == null || Number(a.majorId) !== mid) continue
				// Đúng hệ nếu đã chọn
				if (
					Number.isFinite(sid) &&
					a.systemId != null &&
					Number(a.systemId) !== sid
				)
					continue
				allowed.add(a.classId)
			}
			return active.filter((c) => allowed.has(c.id))
		},
		enabled: !!majorId && (superAdmin || myAssignQ.isSuccess)
	})

	/**
	 * Môn sau khi chọn lớp:
	 * - Admin: môn thuộc ngành (+ khoa nếu có)
	 * - GV: chỉ môn được phân công cho đúng lớp + ngành + hệ
	 */
	const subjectOptions = useMemo(() => {
		if (!systemId || !majorId) return []
		const sid = Number(systemId)
		const mid = Number(majorId)
		let list = allSubjects.filter((s) => {
			if (Number(s.majorId) !== mid) return false
			if (s.systemId != null && Number(s.systemId) !== sid) return false
			return true
		})
		if (!superAdmin && classId) {
			const cid = Number(classId)
			const allowedSub = new Set(
				activeAssigns
					.filter(
						(a) =>
							a.classId != null &&
							Number(a.classId) === cid &&
							a.majorId != null &&
							Number(a.majorId) === mid &&
							(a.systemId == null || Number(a.systemId) === sid)
					)
					.map((a) => a.subjectId)
			)
			list = list.filter((s) => allowedSub.has(s.id))
		} else if (!superAdmin && !classId) {
			// Chưa chọn lớp → chưa liệt kê môn
			list = []
		} else if (superAdmin && fixedFaculty?.code) {
			list = list.filter(
				(s) => !s.facultyCode || s.facultyCode === fixedFaculty.code
			)
		}
		return list.sort((a, b) => a.name.localeCompare(b.name, 'vi'))
	}, [
		allSubjects,
		systemId,
		majorId,
		classId,
		superAdmin,
		activeAssigns,
		fixedFaculty
	])

	// Tự chọn khi chỉ còn 1 lựa chọn (cascade)
	useEffect(() => {
		const only = systemOptions[0]
		if (systemOptions.length === 1 && only && !systemId) {
			setSystemId(String(only.id))
		}
	}, [systemOptions, systemId])

	useEffect(() => {
		if (!systemId) return
		const only = majorOptions[0]
		if (majorOptions.length === 1 && only && !majorId) {
			setMajorId(String(only.id))
		}
	}, [majorOptions, systemId, majorId])

	useEffect(() => {
		if (!majorId || !classesQ.data?.length) return
		const only = classesQ.data[0]
		if (classesQ.data.length === 1 && only && !classId) {
			setClassId(String(only.id))
		}
	}, [classesQ.data, majorId, classId])

	useEffect(() => {
		if (!classId && !superAdmin) return
		const only = subjectOptions[0]
		if (subjectOptions.length === 1 && only && !subjectId) {
			setSubjectId(String(only.id))
		}
	}, [subjectOptions, classId, subjectId, superAdmin])

	function onSystemChange(v: string) {
		setSystemId(v)
		setMajorId('')
		setClassId('')
		setSubjectId('')
	}
	function onMajorChange(v: string) {
		setMajorId(v)
		setClassId('')
		setSubjectId('')
	}
	function onClassChange(v: string) {
		setClassId(v)
		setSubjectId('')
	}
	function onSubjectChange(v: string) {
		setSubjectId(v)
	}

	// Đổi ngành → danh sách lớp mới: bỏ classId không còn hợp lệ
	useEffect(() => {
		if (!classId || !classesQ.data) return
		if (!classesQ.data.some((c) => String(c.id) === classId)) {
			setClassId('')
			setSubjectId('')
		}
	}, [classesQ.data, classId])

	const multiPapers =
		parsedDoc && parsedDoc.papers.length > 1 ? parsedDoc.papers : null
	const hasFormQ = questions.some((q) => q.content.trim())
	const hasFormA = questions.some((q) => q.answer.trim())

	/** Chỉ số đề bị chặn (trùng ≥2 câu) — không được import */
	const blockedPaperIdx = useMemo(() => {
		const s = new Set<number>()
		for (const w of dupWarnings) {
			if (w.blocked) s.add(w.index)
		}
		return s
	}, [dupWarnings])

	const importableCount = multiPapers
		? multiPapers.filter((_, i) => !blockedPaperIdx.has(i)).length
		: blockedPaperIdx.has(0)
			? 0
			: 1

	const canSaveSingle =
		!!subjectId &&
		!!classId &&
		(!!title.trim() || !!multiPapers) &&
		(!!qFile?.fileName ||
			!!sourceFile?.fileName ||
			hasFormQ ||
			!!multiPapers) &&
		(!!aFile?.fileName ||
			!!sourceFile?.fileName ||
			hasFormA ||
			!!(
				multiPapers &&
				multiPapers.every((p) =>
					p.questions.some((q) => q.answer.trim())
				)
			)) &&
		// Đề đơn bị chặn trùng → không cho bấm lưu
		!blockedPaperIdx.has(0)

	const canSaveBulk =
		!!subjectId &&
		!!classId &&
		!!multiPapers &&
		multiPapers.length > 1 &&
		// Chỉ cho lưu khi còn ít nhất 1 đề không trùng
		importableCount > 0

	const canSaveDraft = multiPapers ? canSaveBulk : canSaveSingle

	type CreateResult = {
		mode: 'bulk' | 'single'
		count: number
		codes: string[]
		ids: number[]
		skipped: string[]
		submitAfter: boolean
		submitted: number
		submitErrors: string[]
	}

	const createMut = useMutation({
		mutationFn: async (opts?: {
			submitAfter?: boolean
		}): Promise<CreateResult> => {
			const submitAfter = !!opts?.submitAfter
			// Gửi duyệt bắt buộc có chữ ký (form giấy + Nơi nhận)
			if (submitAfter && !superAdmin && !mySignatureUrl) {
				openSignatureDialog(true)
				throw new Error(
					'Vui lòng tải chữ ký số trước khi gửi duyệt (dùng trên form giấy / Nơi nhận).'
				)
			}
			if (!subjectId) throw new Error('Chọn môn học')
			if (!classId)
				throw new Error('Chọn lớp thi (bắt buộc khi import đề)')
			const sid = Number(subjectId)
			const cid = Number(classId)
			const duration = Math.max(1, Number(durationMinutes) || 60)

			const fileName =
				sourceFile?.fileName || qFile?.fileName || undefined
			const fileUrl = sourceFile?.fileUrl || qFile?.fileUrl || undefined

			const createdIds: number[] = []
			const createdCodes: string[] = []
			const skipped: string[] = []

			// Bulk: nhiều đề từ 1 file Word — chỉ import đề KHÔNG trùng
			if (multiPapers && multiPapers.length > 1) {
				const papersPayload = multiPapers.map((paper) => ({
					paperNumber: paper.examNumber,
					title: buildPaperTitle(paper, title, note),
					questions: paper.questions.map((q) => ({
						content: q.content,
						answer: q.answer
					}))
				}))

				// Dò trùng lần cuối trước khi tạo (≥2 câu giống → chặn cả đề)
				const checks = await CheckExamDuplicates({
					subjectId: sid,
					papers: papersPayload
				})
				const blockedIdx = new Set(
					checks
						.filter((c) => c.blocked || c.duplicates.length > 0)
						.map((c) => c.index)
				)
				const hardMsgs = checks
					.filter((c) => c.blocked || c.duplicates.length > 0)
					.map((c) => {
						const reasons = c.duplicates
							.map((d) => d.reason)
							.join('; ')
						return `Đề số ${c.paperNumber ?? '?'}: ${reasons}`
					})
				const softMsgs = checks
					.filter(
						(c) =>
							(c.warnings?.length ?? 0) > 0 &&
							!blockedIdx.has(c.index)
					)
					.map((c) => {
						const reasons = (c.warnings || [])
							.map((d) => d.reason)
							.join('; ')
						return `Đề số ${c.paperNumber ?? '?'}: ${reasons}`
					})

				// Chỉ lấy đề không bị chặn để CreateExam
				const toImport = multiPapers
					.map((paper, i) => ({ paper, i }))
					.filter(({ i }) => !blockedIdx.has(i))

				if (!toImport.length) {
					throw new Error(
						`Tất cả đề đều có câu hỏi trùng — không import đề nào.\n${hardMsgs.join('\n')}`
					)
				}
				if (blockedIdx.size > 0) {
					toast.warning(
						`Bỏ qua ${blockedIdx.size} đề trùng (không import):\n${hardMsgs.slice(0, 5).join('\n')}${hardMsgs.length > 5 ? `\n… (+${hardMsgs.length - 5})` : ''}\n→ Chỉ import ${toImport.length} đề không trùng.`,
						{ duration: 9000 }
					)
				}
				if (softMsgs.length) {
					toast.message(
						`Cảnh báo (vẫn import): 1 câu trùng hoặc cùng số đề:\n${softMsgs.slice(0, 4).join('\n')}`,
						{ duration: 7000 }
					)
				}

				for (const bi of blockedIdx) {
					const p = multiPapers[bi]
					skipped.push(
						`Đề số ${p?.examNumber ?? bi + 1} (trùng — không import)`
					)
				}
				// Chỉ gọi CreateExam cho đề trong toImport
				for (const { paper, i } of toImport) {
					const paperTitle = buildPaperTitle(paper, title, note)
					const qs = paper.questions.filter(
						(q) => q.content.trim() || q.answer.trim()
					)
					if (!qs.length) {
						skipped.push(
							`Đề số ${paper.examNumber ?? i + 1} (không có câu hỏi)`
						)
						continue
					}
					try {
						const res = await CreateExam({
							title: paperTitle,
							subjectId: sid,
							paperNumber: paper.examNumber,
							classId: cid,
							durationMinutes: duration,
							note: note
								? `${note}${parsedDoc?.documentTitle ? ` | ${parsedDoc.documentTitle}` : ''}`
								: parsedDoc?.documentTitle || undefined,
							questionFileName: fileName,
							questionFileUrl: fileUrl,
							answerFileName: fileName,
							answerFileUrl: fileUrl,
							questions: qs.map((q) => ({
								questionNumber: q.questionNumber,
								content:
									q.content || `(Câu ${q.questionNumber})`,
								answer: q.answer,
								points: q.points || 1
							}))
						})
						createdCodes.push(res.code || paperTitle)
						if (res.id) createdIds.push(res.id)
					} catch (e) {
						const msg = e instanceof Error ? e.message : String(e)
						if (
							/trùng|đã tồn tại|already exists|AlreadyExists/i.test(
								msg
							)
						) {
							// API chặn thêm (race / 1 câu trùng) — không tạo đề này
							skipped.push(
								`Đề số ${paper.examNumber ?? '?'}: ${msg}`
							)
						} else {
							throw e
						}
					}
				}
				if (!createdCodes.length) {
					throw new Error(
						skipped.length
							? `Không import được đề nào — toàn bộ trùng hoặc lỗi:\n${skipped.join('\n')}`
							: 'Không có đề hợp lệ trong file'
					)
				}
			} else {
				// 1 đề
				if (!title.trim() && !parsedDoc?.papers[0]) {
					throw new Error('Nhập tiêu đề đề thi')
				}
				if (!qFile?.fileName && !sourceFile?.fileName && !hasFormQ) {
					throw new Error('Hãy import file đề (Word/txt)')
				}
				const singleTitle =
					title.trim() || parsedDoc?.papers[0]?.title || 'Đề thi'
				const paperNum = parsedDoc?.papers[0]?.examNumber ?? null
				const qs = questions
					.filter((q) => q.content.trim() || q.answer.trim())
					.map((q, i) => ({
						questionNumber: i + 1,
						content: q.content || `(Câu ${i + 1})`,
						answer: q.answer,
						points: Number(q.points) || 1
					}))

				const checks = await CheckExamDuplicates({
					subjectId: sid,
					papers: [
						{
							paperNumber: paperNum,
							title: singleTitle,
							questions: qs.map((q) => ({
								content: q.content,
								answer: q.answer
							}))
						}
					]
				})
				const hard = checks[0]?.duplicates || []
				const soft = checks[0]?.warnings || []
				if (checks[0]?.blocked || hard.length) {
					throw new Error(
						`Đề có ≥2 câu trùng với đề đã có / ngân hàng — không tạo:\n${hard.map((d) => d.reason).join('\n')}`
					)
				}
				if (soft.length) {
					toast.message(
						`Lưu ý: ${soft.map((d) => d.reason).join(' ')}`,
						{ duration: 6000 }
					)
				}

				const res = await CreateExam({
					title: singleTitle,
					subjectId: sid,
					paperNumber: paperNum,
					classId: cid,
					durationMinutes: duration,
					note: note || undefined,
					questionFileName: fileName,
					questionFileUrl: fileUrl,
					answerFileName: aFile?.fileName || fileName,
					answerFileUrl: aFile?.fileUrl || fileUrl,
					questions: qs
				})
				createdCodes.push(res.code || singleTitle)
				if (res.id) createdIds.push(res.id)
			}

			// Gửi duyệt ngay các đề vừa import (nếu chọn)
			let submitted = 0
			const submitErrors: string[] = []
			if (submitAfter && createdIds.length) {
				for (let i = 0; i < createdIds.length; i++) {
					const id = createdIds[i]!
					const code = createdCodes[i] || String(id)
					try {
						await SubmitExam(id)
						submitted++
					} catch (e) {
						const msg = e instanceof Error ? e.message : String(e)
						submitErrors.push(`${code}: ${msg}`)
					}
				}
			}

			return {
				mode:
					multiPapers && multiPapers.length > 1
						? ('bulk' as const)
						: ('single' as const),
				count: createdCodes.length,
				codes: createdCodes,
				ids: createdIds,
				skipped,
				submitAfter,
				submitted,
				submitErrors
			}
		},
		onSuccess: (r) => {
			const skipN = (r.skipped || []).filter((s) =>
				/trùng|không import/i.test(s)
			).length
			const skip =
				skipN > 0
					? ` · Không import ${skipN} đề trùng`
					: r.skipped?.length
						? ` · Bỏ qua ${r.skipped.length} đề`
						: ''

			if (r.submitAfter) {
				const failN = r.submitErrors.length
				if (r.submitted > 0 && !failN) {
					toast.success(
						`Đã import ${r.count} đề và gửi duyệt ${r.submitted} đề lên CNK${skip}`
					)
				} else if (r.submitted > 0 && failN) {
					toast.warning(
						`Import ${r.count} đề · gửi được ${r.submitted}/${r.count}. Lỗi:\n${r.submitErrors.slice(0, 4).join('\n')}`,
						{ duration: 10000 }
					)
				} else {
					toast.error(
						`Đã import ${r.count} đề nháp nhưng không gửi được:\n${r.submitErrors.slice(0, 4).join('\n') || 'Không có id đề'}`,
						{ duration: 10000 }
					)
				}
			} else if (r.mode === 'bulk') {
				toast.success(
					`Đã import ${r.count} đề không trùng vào nháp${skip}`
				)
			} else {
				toast.success('Đã tạo đề nháp từ file import')
			}
			setOpen(false)
			resetForm()
			void qc.invalidateQueries({ queryKey: ['exam-mine'] })
			// Sau import: bắt GV tải chữ ký nếu chưa có
			if (!superAdmin) {
				void meQ.refetch().then((res) => {
					const url = (
						res.data as { signatureUrl?: string | null } | undefined
					)?.signatureUrl?.trim()
					if (!url) {
						toast.message(
							'Vui lòng tải chữ ký số — sẽ in trên form giấy (Nơi nhận / xuất đề).',
							{ duration: 8000 }
						)
						openSignatureDialog(true)
					}
				})
			}
		},
		onError: (e: Error) => {
			if (e.message.includes('chữ ký')) {
				// dialog đã mở
				toast.error(e.message)
				return
			}
			toast.error(e.message, { duration: 10000 })
		}
	})

	const submitMut = useMutation({
		mutationFn: async (id: number) => {
			if (!superAdmin) {
				const me = await meQ.refetch()
				const url = (
					me.data as { signatureUrl?: string | null } | undefined
				)?.signatureUrl?.trim()
				if (!url) {
					openSignatureDialog(true)
					throw new Error(
						'Vui lòng tải chữ ký số trước khi gửi duyệt.'
					)
				}
			}
			return SubmitExam(id)
		},
		onSuccess: () => {
			toast.success('Đã gửi Chủ nhiệm khoa duyệt')
			void qc.invalidateQueries({ queryKey: ['exam-mine'] })
		},
		onError: (e: Error) => {
			if (!e.message.includes('chữ ký')) toast.error(e.message)
			else toast.error(e.message)
		}
	})

	/** Gửi hàng loạt mọi đề Nháp / Trả lại trên danh sách */
	const submitAllMut = useMutation({
		mutationFn: async (ids: number[]) => {
			if (!ids.length) throw new Error('Không có đề cần gửi')
			if (!superAdmin) {
				const me = await meQ.refetch()
				const url = (
					me.data as { signatureUrl?: string | null } | undefined
				)?.signatureUrl?.trim()
				if (!url) {
					openSignatureDialog(true)
					throw new Error(
						'Vui lòng tải chữ ký số trước khi gửi duyệt.'
					)
				}
			}
			let ok = 0
			const errors: string[] = []
			for (const id of ids) {
				try {
					await SubmitExam(id)
					ok++
				} catch (e) {
					const msg = e instanceof Error ? e.message : String(e)
					errors.push(`#${id}: ${msg}`)
				}
			}
			return { ok, total: ids.length, errors }
		},
		onSuccess: (r) => {
			if (r.ok && !r.errors.length) {
				toast.success(`Đã gửi duyệt ${r.ok} đề lên Chủ nhiệm khoa`)
			} else if (r.ok) {
				toast.warning(
					`Gửi được ${r.ok}/${r.total}. Lỗi:\n${r.errors.slice(0, 5).join('\n')}`,
					{ duration: 10000 }
				)
			} else {
				toast.error(
					`Không gửi được đề nào:\n${r.errors.slice(0, 5).join('\n')}`,
					{ duration: 10000 }
				)
			}
			void qc.invalidateQueries({ queryKey: ['exam-mine'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const delMut = useMutation({
		mutationFn: (id: number) => DeleteExam(id),
		onSuccess: () => {
			toast.success('Đã xóa đề')
			void qc.invalidateQueries({ queryKey: ['exam-mine'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	function resetForm() {
		setTitle('')
		setSystemId('')
		setMajorId('')
		setSubjectId('')
		setClassId('')
		setDurationMinutes('60')
		setNote('')
		setQFile(null)
		setAFile(null)
		setSourceFile(null)
		setQuestions([])
		setParsedDoc(null)
		setDupWarnings([])
	}

	// Dò trùng khi đã chọn môn + có đề import
	useEffect(() => {
		if (!subjectId || !open) {
			setDupWarnings([])
			return
		}
		const papers = parsedDoc?.papers?.length
			? parsedDoc.papers.map((p) => ({
					paperNumber: p.examNumber,
					title: p.title,
					questions: p.questions.map((q) => ({
						content: q.content,
						answer: q.answer
					}))
				}))
			: questions.some((q) => q.content.trim())
				? [
						{
							paperNumber: null as number | null,
							title: title || 'Đề thi',
							questions: questions.map((q) => ({
								content: q.content,
								answer: q.answer
							}))
						}
					]
				: []
		if (!papers.length) {
			setDupWarnings([])
			return
		}
		let cancelled = false
		void CheckExamDuplicates({
			subjectId: Number(subjectId),
			papers
		})
			.then((rows) => {
				if (cancelled) return
				// Giữ mọi dòng (kể cả không trùng) để map index → blocked khi import
				setDupWarnings(
					rows.map((r) => ({
						index: r.index,
						paperNumber: r.paperNumber,
						hard: r.duplicates.map(
							(d: ExamDuplicateHit) => d.reason
						),
						soft: (r.warnings || []).map(
							(d: ExamDuplicateHit) => d.reason
						),
						blocked: !!r.blocked || r.duplicates.length > 0
					}))
				)
			})
			.catch(() => {
				if (!cancelled) setDupWarnings([])
			})
		return () => {
			cancelled = true
		}
	}, [subjectId, parsedDoc, questions, title, open])

	function applyParsedQuestions(
		qs: {
			questionNumber: number
			content: string
			answer: string
			points: number
		}[]
	) {
		setQuestions(
			qs.map((q) => ({
				content: q.content,
				answer: q.answer,
				points: String(q.points || 1)
			}))
		)
	}

	function handleDocumentParsed(doc: ParsedExamDocument) {
		setParsedDoc(doc)
		if (doc.papers.length === 1) {
			const p = doc.papers[0]!
			if (!title.trim()) setTitle(p.title)
			applyParsedQuestions(p.questions)
		} else if (doc.papers.length > 1) {
			// Tiêu đề gốc có thể để trống — mỗi đề lấy "Đề thi số n"
			if (!title.trim() && doc.documentTitle) {
				// prefix gợi ý, không ghi đè bắt buộc
			}
			// Form tay: hiện paper đầu để xem trước
			applyParsedQuestions(doc.papers[0]!.questions)
		}
	}

	const exams = examsQ.data || []
	/** Đề nháp / trả lại — cần gửi duyệt */
	const pendingSubmitExams = useMemo(
		() =>
			exams.filter(
				(e) => e.status === 'DRAFT' || e.status === 'RETURNED'
			),
		[exams]
	)

	const [exportBusy, setExportBusy] = useState(false)
	/**
	 * Hộp thoại: có ký / không ký trước khi in hoặc tải form giấy.
	 */
	const [exportDialog, setExportDialog] = useState<{
		format: 'a' | 'b' | 'c'
		mode: 'print' | 'download'
	} | null>(null)

	/** Chỉ đề đã BGH phê duyệt mới xuất bảng */
	const approvedExams = useMemo(
		() => exams.filter((e) => e.status === 'APPROVED'),
		[exams]
	)

	/** Key người duyệt BGH: title + username/displayName */
	function bghApproverKey(e: {
		approvedByTitle?: string | null
		approvedByUsername?: string | null
		approvedByDisplayName?: string | null
	}): string {
		const t = (e.approvedByTitle || '').trim() || 'BGH'
		const who =
			(e.approvedByUsername || '').trim() ||
			(e.approvedByDisplayName || '').trim() ||
			'unknown'
		return `${t}::${who}`
	}
	function bghApproverLabel(e: {
		approvedByTitle?: string | null
		approvedByDisplayName?: string | null
		approvedByUsername?: string | null
	}): string {
		const title = (e.approvedByTitle || '').trim()
		const name =
			(e.approvedByDisplayName || '').trim() ||
			(e.approvedByUsername || '').trim() ||
			'—'
		return title ? `${title} — ${name}` : name
	}

	/** Danh sách BGH đã duyệt (để lọc xuất) */
	const bghApproverOptions = useMemo(() => {
		const map = new Map<string, string>()
		for (const e of approvedExams) {
			const k = bghApproverKey(e)
			if (!map.has(k)) map.set(k, bghApproverLabel(e))
		}
		return [...map.entries()]
			.map(([key, label]) => ({ key, label }))
			.sort((a, b) => a.label.localeCompare(b.label, 'vi'))
	}, [approvedExams])

	const [exportApprover, setExportApprover] = useState<string>('all')

	/**
	 * Đề được xuất:
	 * - Đã BGH duyệt
	 * - Lọc người BGH (tuỳ chọn)
	 * - GV: chỉ khi đã hết thời gian giảng dạy lớp đó (teachingStatus = EXPIRED)
	 */
	const exportableExams = useMemo(() => {
		let list =
			exportApprover === 'all'
				? approvedExams
				: approvedExams.filter(
						(e) => bghApproverKey(e) === exportApprover
					)
		if (!superAdmin) {
			const assigns = myAssignQ.data || []
			const endedKeys = new Set(
				assigns
					.filter((a) => a.teachingStatus === 'EXPIRED')
					.map((a) => `${a.subjectId}:${a.classId ?? ''}`)
			)
			const endedSubjects = new Set(
				assigns
					.filter((a) => a.teachingStatus === 'EXPIRED')
					.map((a) => a.subjectId)
			)
			list = list.filter((e) => {
				const key = `${e.subjectId}:${e.classId ?? ''}`
				if (endedKeys.has(key)) return true
				// Đề không gắn classId: cho phép nếu có bất kỳ phân công môn đã hết hạn
				if (e.classId == null && endedSubjects.has(e.subjectId))
					return true
				return false
			})
		}
		return list
	}, [approvedExams, exportApprover, superAdmin, myAssignQ.data])

	const stillTeachingApprovedCount = useMemo(() => {
		if (superAdmin) return 0
		return approvedExams.length - exportableExams.length
	}, [superAdmin, approvedExams.length, exportableExams.length])

	function openExportDialog(
		format: 'a' | 'b' | 'c',
		mode: 'print' | 'download'
	) {
		if (!exportableExams.length) {
			toast.error(
				exportApprover === 'all'
					? stillTeachingApprovedCount > 0
						? 'Đề đã duyệt nhưng lớp vẫn trong thời gian giảng dạy — chỉ xuất sau khi hết khóa dạy.'
						: 'Chưa có đề đã phê duyệt để xuất.'
					: 'Không có đề đã duyệt bởi người BGH đã chọn (hoặc lớp chưa hết khóa dạy).'
			)
			return
		}
		// Mẫu A/B không có chữ ký → xuất thẳng
		if (format !== 'c') {
			void runExport(format, mode, true)
			return
		}
		setExportDialog({ format, mode })
	}

	async function runExport(
		format: 'a' | 'b' | 'c',
		mode: 'print' | 'download',
		withSignatures: boolean
	) {
		if (!exportableExams.length) return
		setExportBusy(true)
		setExportDialog(null)
		try {
			const sid = subjectId
				? Number(subjectId)
				: exportableExams[0]?.subjectId
			const sameSubject = exportableExams.filter(
				(e) => !sid || e.subjectId === sid
			)
			const ids = (
				sameSubject.length ? sameSubject : exportableExams
			).map((e) => e.id)
			const payload = {
				format,
				subjectId: sid || undefined,
				examIds: ids,
				withSignatures
			}
			const r =
				mode === 'print'
					? await printTeacherExamBoard(payload)
					: await downloadTeacherExamBoard(payload)
			const who =
				exportApprover === 'all'
					? 'tất cả BGH'
					: bghApproverOptions.find((o) => o.key === exportApprover)
							?.label || 'BGH'
			const label =
				format === 'a'
					? 'Mẫu A (ĐỀ THI SỐ)'
					: format === 'b'
						? 'Mẫu B (bảng gộp)'
						: 'Form giấy (BỘ CÂU HỎI - ĐÁP ÁN)'
			const sigNote =
				format === 'c'
					? withSignatures
						? ' · có chữ ký số'
						: ' · không ký (để ký tay)'
					: ''
			toast.success(
				mode === 'print'
					? `Đang in ${label}${sigNote} — ${r.paperCount} đề · ${who}`
					: `Đã tải ${label}${sigNote} — ${r.paperCount} đề · ${who} (${r.filename})`
			)
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : 'Không xuất được bảng đề'
			)
		} finally {
			setExportBusy(false)
		}
	}
	const selectedSubject = useMemo(
		() => allSubjects.find((s) => String(s.id) === subjectId) || null,
		[allSubjects, subjectId]
	)
	/** GV: chọn Hệ → Ngành → Lớp → Môn; khoa cố định theo phân công */
	const lockCatalog = !superAdmin

	return (
		<div className='space-y-6 p-4 md:p-6'>
			{!superAdmin && meQ.isSuccess && !mySignatureUrl && (
				<div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm'>
					<strong>Chưa có chữ ký số.</strong> Sau khi import đề, hãy
					tải chữ ký để in form giấy.{' '}
					<button
						type='button'
						className='text-primary font-medium underline'
						onClick={() => openSignatureDialog(true)}
					>
						Tải chữ ký ngay
					</button>
				</div>
			)}
			<div className='flex flex-wrap items-center justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						{superAdmin ? 'Danh sách đề thi' : 'Đề thi của tôi'}
					</h1>
					<p className='text-muted-foreground text-sm'>
						{superAdmin
							? 'Admin: bấm «Xem nội dung» để rà soát câu hỏi + đáp án (kể cả đã phê duyệt)'
							: 'Import Word bộ đề → tải chữ ký số → gửi duyệt'}
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button variant='outline' asChild>
						<a
							href='/samples/exam-import/bo-de-mau.txt'
							download='bo-de-mau.txt'
						>
							<Download className='mr-2 h-4 w-4' />
							Mẫu A (bộ đề)
						</a>
					</Button>
					<Button variant='outline' asChild>
						<a
							href='/samples/exam-import/mau-de-gop.docx'
							download='mau-de-gop.docx'
						>
							<Download className='mr-2 h-4 w-4' />
							Mẫu B (gộp đề .docx)
						</a>
					</Button>
					<Button onClick={() => setOpen(true)}>
						<FilePlus2 className='mr-2 h-4 w-4' />
						Import / soạn đề
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<CardTitle>Danh sách đề</CardTitle>
						<CardDescription>
							{exams.length} đề · Nháp → gửi duyệt → theo dõi
							trạng thái
							{pendingSubmitExams.length > 0
								? ` · ${pendingSubmitExams.length} đề cần gửi`
								: ''}
							. Xuất form giấy:{' '}
							<strong>chỉ đề BGH đã duyệt</strong>
							{!superAdmin && (
								<>
									{' '}
									và{' '}
									<strong>
										đã hết thời gian giảng dạy lớp
									</strong>
								</>
							)}
							. Khi in sẽ hỏi <strong>có ký</strong> /{' '}
							<strong>không ký</strong>.
						</CardDescription>
					</div>
					<div className='flex flex-wrap items-center gap-2'>
						{approvedExams.length > 0 && (
							<>
								<div className='flex items-center gap-1.5'>
									<span className='text-muted-foreground text-xs whitespace-nowrap'>
										Xuất theo BGH:
									</span>
									<Select
										value={exportApprover}
										onValueChange={setExportApprover}
									>
										<SelectTrigger className='h-8 w-[200px] text-xs'>
											<SelectValue placeholder='Người duyệt' />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value='all'>
												Tất cả ({approvedExams.length}{' '}
												đề)
											</SelectItem>
											{bghApproverOptions.map((o) => {
												const n = approvedExams.filter(
													(e) =>
														bghApproverKey(e) ===
														o.key
												).length
												return (
													<SelectItem
														key={o.key}
														value={o.key}
													>
														{o.label} ({n})
													</SelectItem>
												)
											})}
										</SelectContent>
									</Select>
								</div>
								<span className='text-muted-foreground text-xs'>
									({exportableExams.length} đề xuất được
									{stillTeachingApprovedCount > 0
										? ` · ${stillTeachingApprovedCount} đang giảng dạy`
										: ''}
									)
								</span>
								<Button
									size='sm'
									variant='outline'
									disabled={
										exportBusy || !exportableExams.length
									}
									onClick={() =>
										openExportDialog('a', 'download')
									}
									title='Tải Mẫu A'
								>
									{exportBusy ? (
										<Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
									) : (
										<FileDown className='mr-1 h-3.5 w-3.5' />
									)}
									Mẫu A
								</Button>
								<Button
									size='sm'
									variant='outline'
									disabled={
										exportBusy || !exportableExams.length
									}
									onClick={() =>
										openExportDialog('b', 'download')
									}
									title='Tải Mẫu B'
								>
									{exportBusy ? (
										<Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
									) : (
										<FileDown className='mr-1 h-3.5 w-3.5' />
									)}
									Mẫu B
								</Button>
								<Button
									size='sm'
									variant='default'
									disabled={
										exportBusy || !exportableExams.length
									}
									onClick={() =>
										openExportDialog('c', 'print')
									}
									title='In form giấy — hỏi có ký / không ký'
								>
									{exportBusy ? (
										<Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
									) : (
										<Printer className='mr-1 h-3.5 w-3.5' />
									)}
									In form giấy
								</Button>
								<Button
									size='sm'
									variant='secondary'
									disabled={
										exportBusy || !exportableExams.length
									}
									onClick={() =>
										openExportDialog('c', 'download')
									}
									title='Tải form giấy — hỏi có ký / không ký'
								>
									{exportBusy ? (
										<Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
									) : (
										<Download className='mr-1 h-3.5 w-3.5' />
									)}
									Tải form giấy
								</Button>
							</>
						)}
						{pendingSubmitExams.length > 0 && (
							<Button
								variant='default'
								disabled={
									submitAllMut.isPending ||
									submitMut.isPending
								}
								onClick={() => {
									if (
										!confirm(
											`Gửi duyệt ${pendingSubmitExams.length} đề (Nháp / Trả lại) lên Chủ nhiệm khoa?`
										)
									) {
										return
									}
									submitAllMut.mutate(
										pendingSubmitExams.map((e) => e.id)
									)
								}}
							>
								{submitAllMut.isPending ? (
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								) : (
									<Send className='mr-2 h-4 w-4' />
								)}
								Gửi tất cả đề cần gửi (
								{pendingSubmitExams.length})
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{examsQ.isLoading ? (
						<div className='flex justify-center py-10'>
							<Loader2 className='h-6 w-6 animate-spin' />
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mã</TableHead>
									<TableHead>Tiêu đề</TableHead>
									<TableHead>Môn</TableHead>
									<TableHead className='whitespace-nowrap'>
										Thời gian import
									</TableHead>
									<TableHead>Trạng thái</TableHead>
									<TableHead>CNK duyệt</TableHead>
									<TableHead>BGH duyệt</TableHead>
									<TableHead>Câu hỏi</TableHead>
									<TableHead className='text-right'>
										Thao tác
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{exams.map((e) => (
									<TableRow key={e.id}>
										<TableCell className='font-mono text-xs'>
											{e.code}
										</TableCell>
										<TableCell>
											<Link
												to='/de-thi/chi-tiet/$id'
												params={{ id: String(e.id) }}
												className='font-medium hover:underline'
											>
												{e.title}
											</Link>
											{e.paperNumber != null && (
												<span className='text-muted-foreground ml-1 text-xs'>
													· Đề số {e.paperNumber}
												</span>
											)}
										</TableCell>
										<TableCell className='text-sm'>
											{e.subjectCode}
										</TableCell>
										<TableCell className='text-muted-foreground whitespace-nowrap text-xs'>
											{formatImportTime(e.createdAt)}
										</TableCell>
										<TableCell>
											<ExamStatusBadge
												status={
													// Phòng cache / lệch: đã khóa + QR → đã phê duyệt
													e.locked && e.qrCode
														? 'APPROVED'
														: e.status
												}
												label={
													e.locked && e.qrCode
														? 'Đã phê duyệt'
														: e.statusLabel
												}
											/>
											{e.locked && e.qrCode ? (
												<p className='text-muted-foreground mt-0.5 text-[10px]'>
													Đã khóa · có QR
												</p>
											) : null}
											{e.returnNote && (
												<p className='text-destructive mt-1 text-xs'>
													{e.returnNote}
												</p>
											)}
										</TableCell>
										<TableCell className='max-w-[9rem] text-xs'>
											{e.deptHeadDisplayName ? (
												<div>
													<div className='font-medium'>
														{e.deptHeadDisplayName}
													</div>
													{e.deptHeadRank && (
														<div className='text-muted-foreground'>
															{e.deptHeadRank}
														</div>
													)}
												</div>
											) : (
												<span className='text-muted-foreground'>
													—
												</span>
											)}
										</TableCell>
										<TableCell className='max-w-[10rem] text-xs'>
											{e.approvedByDisplayName ||
											e.approvedByTitle ? (
												<div>
													{e.approvedByTitle && (
														<div className='text-primary font-medium'>
															{e.approvedByTitle}
														</div>
													)}
													<div>
														{e.approvedByDisplayName ||
															'—'}
													</div>
													{e.approvedByRank && (
														<div className='text-muted-foreground'>
															{e.approvedByRank}
														</div>
													)}
												</div>
											) : (
												<span className='text-muted-foreground'>
													—
												</span>
											)}
										</TableCell>
										<TableCell>
											{e.questionCount ?? 0}
										</TableCell>
										<TableCell className='space-x-1 text-right whitespace-nowrap'>
											<Button
												size='sm'
												variant='default'
												asChild
											>
												<Link
													to='/de-thi/chi-tiet/$id'
													params={{
														id: String(e.id)
													}}
												>
													<Eye className='mr-1 h-3.5 w-3.5' />
													Xem nội dung
												</Link>
											</Button>
											{(e.status === 'DRAFT' ||
												e.status === 'RETURNED') && (
												<>
													<Button
														size='sm'
														variant='outline'
														asChild
													>
														<Link
															to='/de-thi/soan/$id'
															params={{
																id: String(e.id)
															}}
														>
															<Pencil className='mr-1 h-3 w-3' />
															Sửa
														</Link>
													</Button>
													<Button
														size='sm'
														variant='outline'
														disabled={
															submitMut.isPending ||
															submitAllMut.isPending
														}
														onClick={() =>
															submitMut.mutate(
																e.id
															)
														}
													>
														<Send className='mr-1 h-3 w-3' />
														Gửi duyệt
													</Button>
													<Button
														size='sm'
														variant='ghost'
														onClick={() => {
															if (
																confirm(
																	'Xóa đề này?'
																)
															)
																delMut.mutate(
																	e.id
																)
														}}
													>
														<Trash2 className='h-3 w-3 text-destructive' />
													</Button>
												</>
											)}
										</TableCell>
									</TableRow>
								))}
								{!exams.length && (
									<TableRow>
										<TableCell
											colSpan={8}
											className='text-muted-foreground text-center'
										>
											Chưa có đề — bấm «Import / soạn đề»
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
					<DialogHeader>
						<DialogTitle>Import đề thi từ Word / txt</DialogTitle>
					</DialogHeader>
					<div className='space-y-4'>
						<p className='text-muted-foreground text-sm'>
							<strong>Mẫu A:</strong> ĐỀ THI SỐ n → câu hỏi → Đáp
							án - Thang điểm. <strong>Mẫu B:</strong> Word bảng
							gộp đề — Đề số | Câu hỏi | Nội dung | Đáp án (ý{' '}
							<code>(1,0đ)</code>) | Điểm. Một file có thể tạo
							nhiều đề nháp.
						</p>

						{/* GV: Hệ → Ngành → Lớp → Môn (khoa cố định theo phân công) */}
						<div className='space-y-3 rounded-md border bg-muted/30 p-3'>
							<p className='text-sm font-medium'>
								Phạm vi giảng dạy
								{lockCatalog ? (
									<span className='text-muted-foreground font-normal'>
										{' '}
										— chọn{' '}
										<strong>
											Hệ → Ngành → Lớp → Môn
										</strong>{' '}
										(khoa cố định theo phân công)
									</span>
								) : (
									<span className='text-muted-foreground font-normal'>
										{' '}
										(admin: Hệ → Ngành → Lớp → Môn)
									</span>
								)}
							</p>
							<div className='grid gap-3 sm:grid-cols-2'>
								<div>
									<Label>Hệ đào tạo *</Label>
									<Select
										value={systemId}
										onValueChange={onSystemChange}
										disabled={!systemOptions.length}
									>
										<SelectTrigger className='mt-1'>
											<SelectValue placeholder='Chọn hệ đào tạo' />
										</SelectTrigger>
										<SelectContent>
											{systemOptions.map((s) => (
												<SelectItem
													key={s.id}
													value={String(s.id)}
												>
													{s.name}
													{s.code
														? ` (${s.code})`
														: ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Ngành *</Label>
									<Select
										value={majorId}
										onValueChange={onMajorChange}
										disabled={
											!systemId || !majorOptions.length
										}
									>
										<SelectTrigger className='mt-1'>
											<SelectValue
												placeholder={
													systemId
														? 'Chọn ngành'
														: 'Chọn hệ trước'
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{majorOptions.map((m) => (
												<SelectItem
													key={m.id}
													value={String(m.id)}
												>
													{m.name}
													{m.code
														? ` (${m.code})`
														: ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Lớp thi *</Label>
									<Select
										value={classId}
										onValueChange={onClassChange}
										disabled={!majorId}
									>
										<SelectTrigger className='mt-1'>
											<SelectValue
												placeholder={
													majorId
														? classesQ.isLoading
															? 'Đang tải lớp…'
															: (
																		classesQ.data ||
																		[]
																  ).length
																? 'Chọn lớp'
																: lockCatalog
																	? 'Chưa được phân công lớp trong ngành này'
																	: 'Chưa có lớp cho ngành này'
														: 'Chọn ngành trước'
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{(classesQ.data || []).map((c) => (
												<SelectItem
													key={c.id}
													value={String(c.id)}
												>
													{c.name}
													{c.code
														? ` (${c.code})`
														: ''}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								<div>
									<Label>Môn học *</Label>
									<Select
										value={subjectId}
										onValueChange={onSubjectChange}
										disabled={
											lockCatalog
												? !classId ||
													!subjectOptions.length
												: !majorId ||
													!subjectOptions.length
										}
									>
										<SelectTrigger className='mt-1'>
											<SelectValue
												placeholder={
													lockCatalog
														? !classId
															? 'Chọn lớp trước'
															: subjectOptions.length
																? 'Chọn môn'
																: 'Không có môn phân công cho lớp này'
														: majorId
															? subjectOptions.length
																? 'Chọn môn'
																: 'Không có môn'
															: 'Chọn ngành trước'
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{subjectOptions.map((s) => (
												<SelectItem
													key={s.id}
													value={String(s.id)}
												>
													{s.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								{lockCatalog && (
									<div className='sm:col-span-2'>
										<Label className='text-muted-foreground text-xs'>
											Khoa (cố định theo phân công)
										</Label>
										<Input
											readOnly
											disabled
											value={
												selectedSubject
													? `${selectedSubject.facultyName || selectedSubject.facultyCode || '—'}${
															selectedSubject.facultyCode
																? ` (${selectedSubject.facultyCode})`
																: ''
														}`
													: fixedFaculty
														? fixedFaculty.code
															? `${fixedFaculty.name} (${fixedFaculty.code})`
															: fixedFaculty.name
														: '— chọn lớp / môn'
											}
											className='bg-muted mt-1'
										/>
									</div>
								)}
								<div>
									<Label>Thời gian thi (phút)</Label>
									<Input
										type='number'
										min={1}
										className='mt-1'
										value={durationMinutes}
										onChange={(e) =>
											setDurationMinutes(e.target.value)
										}
									/>
								</div>
							</div>
							{(selectedSubject || classId || systemId) && (
								<p className='text-muted-foreground text-xs'>
									Đề sẽ gắn:{' '}
									<strong>
										{systemOptions.find(
											(s) => String(s.id) === systemId
										)?.name ||
											selectedSubject?.systemName ||
											selectedSubject?.systemCode ||
											'—'}
									</strong>
									{' · '}
									<strong>
										{majorOptions.find(
											(m) => String(m.id) === majorId
										)?.name ||
											selectedSubject?.majorName ||
											selectedSubject?.majorCode ||
											'—'}
									</strong>
									{' · '}
									<strong>
										{(classesQ.data || []).find(
											(c) => String(c.id) === classId
										)?.name || '—'}
									</strong>
									{' · '}
									<strong>
										{selectedSubject?.name || '—'}
									</strong>
									{selectedSubject?.facultyName ||
									fixedFaculty?.name ? (
										<>
											{' · khoa '}
											<strong>
												{selectedSubject?.facultyName ||
													fixedFaculty?.name}
											</strong>
										</>
									) : null}
								</p>
							)}
							{lockCatalog && !allSubjects.length && (
								<p className='text-destructive text-xs'>
									Bạn chưa được phân công môn nào. Liên hệ Chủ
									nhiệm khoa để gán môn theo khoa trước khi
									import đề.
								</p>
							)}
						</div>

						{dupWarnings.some(
							(w) => w.blocked || w.soft.length > 0
						) && (
							<div className='space-y-2'>
								{dupWarnings.some((w) => w.blocked) && (
									<div className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm'>
										<p className='font-semibold text-destructive'>
											Đề bị chặn —{' '}
											<strong>không import</strong> (≥
											<strong>2 câu</strong> trùng với đề
											đã có / ngân hàng / trong file)
										</p>
										<ul className='mt-1 list-inside list-disc text-xs'>
											{dupWarnings
												.filter((w) => w.blocked)
												.map((w) => (
													<li key={w.index}>
														Đề số{' '}
														{w.paperNumber ?? '—'}:{' '}
														{w.hard.join(' · ')}
													</li>
												))}
										</ul>
										{multiPapers && importableCount > 0 && (
											<p className='mt-2 text-xs font-medium'>
												→ Chỉ import {importableCount}/
												{multiPapers.length} đề không
												trùng.
											</p>
										)}
									</div>
								)}
								{dupWarnings.some(
									(w) => !w.blocked && w.soft.length
								) && (
									<div className='rounded-md border border-amber-500/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100'>
										<p className='font-semibold'>
											Cảnh báo (vẫn cho import): 1 câu
											trùng hoặc cùng số đề nhưng câu khác
										</p>
										<ul className='mt-1 list-inside list-disc text-xs'>
											{dupWarnings
												.filter(
													(w) =>
														!w.blocked &&
														w.soft.length
												)
												.map((w) => (
													<li key={w.index}>
														Đề số{' '}
														{w.paperNumber ?? '—'}:{' '}
														{w.soft.join(' · ')}
													</li>
												))}
										</ul>
									</div>
								)}
							</div>
						)}

						<ExamFileImport
							sourceFile={sourceFile}
							onSourceFileChange={setSourceFile}
							questionFile={qFile}
							answerFile={aFile}
							onQuestionFileChange={setQFile}
							onAnswerFileChange={setAFile}
							currentQuestions={questions.map((q, i) => ({
								questionNumber: i + 1,
								content: q.content,
								answer: q.answer,
								points: Number(q.points) || 1
							}))}
							onQuestionsParsed={applyParsedQuestions}
							onDocumentParsed={handleDocumentParsed}
						/>

						{multiPapers && (
							<div className='rounded-md border border-emerald-600/30 bg-emerald-500/5 px-3 py-2 text-sm'>
								<strong>
									Sẽ import {importableCount}/
									{multiPapers.length} đề không trùng
									{blockedPaperIdx.size > 0
										? ` · bỏ qua ${blockedPaperIdx.size} đề trùng`
										: ''}
								</strong>
								<ul className='mt-1 list-inside list-disc text-xs'>
									{multiPapers.map((p, i) => {
										const blocked = blockedPaperIdx.has(i)
										const hard =
											dupWarnings.find(
												(w) => w.index === i
											)?.hard?.[0] || ''
										return (
											<li
												key={i}
												className={
													blocked
														? 'text-destructive line-through decoration-destructive/60'
														: ''
												}
											>
												{blocked ? (
													<span className='font-medium'>
														[Không import]{' '}
													</span>
												) : (
													<span className='text-emerald-700 dark:text-emerald-400 font-medium'>
														[Import]{' '}
													</span>
												)}
												{buildPaperTitle(
													p,
													title,
													note
												)}{' '}
												— {p.questions.length} câu ·{' '}
												{p.questions.reduce(
													(s, q) => s + q.points,
													0
												)}{' '}
												điểm
												{blocked && hard
													? ` — ${hard}`
													: ''}
											</li>
										)
									})}
								</ul>
								{title.trim() && (
									<p className='text-muted-foreground mt-1 text-xs'>
										Tiền tố tiêu đề: «{title.trim()} — …»
									</p>
								)}
							</div>
						)}

						{!multiPapers && (
							<div>
								<Label>Tiêu đề đề thi *</Label>
								<Input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder='Đề thi số 1 — Giáo dục chính trị'
								/>
							</div>
						)}

						{multiPapers && (
							<div>
								<Label>Tiền tố tiêu đề (tuỳ chọn)</Label>
								<Input
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder='VD: GDCT — sẽ thành «GDCT — Đề thi số 1»'
								/>
							</div>
						)}

						{(sourceFile || qFile || aFile) && !multiPapers && (
							<div className='rounded-md border border-emerald-600/30 bg-emerald-500/5 px-3 py-2 text-sm'>
								{sourceFile && (
									<div>
										✓ File:{' '}
										<strong>{sourceFile.fileName}</strong>
									</div>
								)}
								{hasFormQ && (
									<div className='text-muted-foreground text-xs'>
										Đã nạp{' '}
										{
											questions.filter(
												(q) =>
													q.content.trim() ||
													q.answer.trim()
											).length
										}{' '}
										câu từ file
									</div>
								)}
							</div>
						)}

						<details className='rounded-lg border p-3'>
							<summary className='cursor-pointer text-sm font-medium'>
								Tuỳ chọn: xem / chỉnh câu
								{multiPapers
									? ' (đề đầu — chỉ xem trước)'
									: ' (không bắt buộc)'}
							</summary>
							<div className='mt-3 space-y-3'>
								{!multiPapers && (
									<div className='flex justify-end'>
										<Button
											type='button'
											size='sm'
											variant='outline'
											onClick={() =>
												setQuestions((qs) => [
													...qs,
													{
														content: '',
														answer: '',
														points: '1'
													}
												])
											}
										>
											Thêm câu
										</Button>
									</div>
								)}
								{questions.map((q, idx) => (
									<div
										key={idx}
										className='space-y-2 rounded-md border p-3'
									>
										<div className='flex items-center justify-between'>
											<span className='text-sm font-medium'>
												Câu {idx + 1}
											</span>
											<div className='flex items-center gap-2'>
												<Label className='text-xs'>
													Điểm
												</Label>
												<Input
													className='w-16'
													value={q.points}
													disabled={!!multiPapers}
													onChange={(e) => {
														const v = e.target.value
														setQuestions((qs) =>
															qs.map((x, i) =>
																i === idx
																	? {
																			...x,
																			points: v
																		}
																	: x
															)
														)
													}}
												/>
											</div>
										</div>
										<Textarea
											placeholder='Nội dung câu hỏi'
											value={q.content}
											disabled={!!multiPapers}
											onChange={(e) => {
												const v = e.target.value
												setQuestions((qs) =>
													qs.map((x, i) =>
														i === idx
															? {
																	...x,
																	content: v
																}
															: x
													)
												)
											}}
										/>
										<Textarea
											placeholder='Đáp án'
											value={q.answer}
											disabled={!!multiPapers}
											onChange={(e) => {
												const v = e.target.value
												setQuestions((qs) =>
													qs.map((x, i) =>
														i === idx
															? {
																	...x,
																	answer: v
																}
															: x
													)
												)
											}}
										/>
									</div>
								))}
							</div>
						</details>

						<div>
							<Label>Ghi chú</Label>
							<Textarea
								value={note}
								onChange={(e) => setNote(e.target.value)}
							/>
						</div>
					</div>
					<DialogFooter className='flex-col gap-2 sm:flex-row sm:justify-end'>
						<Button
							variant='outline'
							onClick={() => setOpen(false)}
							disabled={createMut.isPending}
						>
							Hủy
						</Button>
						<Button
							variant='secondary'
							disabled={createMut.isPending || !canSaveDraft}
							onClick={() =>
								createMut.mutate({ submitAfter: false })
							}
						>
							{createMut.isPending &&
								!createMut.variables?.submitAfter && (
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								)}
							{multiPapers
								? blockedPaperIdx.size > 0
									? `Lưu nháp ${importableCount} đề`
									: `Lưu nháp ${multiPapers.length} đề`
								: blockedPaperIdx.has(0)
									? 'Đề trùng — không import'
									: 'Lưu nháp'}
						</Button>
						<Button
							disabled={createMut.isPending || !canSaveDraft}
							onClick={() =>
								createMut.mutate({ submitAfter: true })
							}
						>
							{createMut.isPending &&
							createMut.variables?.submitAfter ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								<Send className='mr-2 h-4 w-4' />
							)}
							{multiPapers
								? blockedPaperIdx.size > 0
									? `Import & gửi ${importableCount} đề`
									: `Import & gửi ${multiPapers.length} đề`
								: blockedPaperIdx.has(0)
									? 'Đề trùng — không gửi'
									: 'Import & gửi duyệt'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Bắt buộc tải chữ ký sau import / trước gửi duyệt */}
			<Dialog
				open={sigDialogOpen}
				onOpenChange={(v) => {
					// Bắt buộc: không cho đóng bằng click ngoài khi required
					if (!v && sigRequired && !mySignatureUrl) {
						toast.message(
							'Cần có chữ ký số để xuất form giấy và gửi duyệt.'
						)
						return
					}
					setSigDialogOpen(v)
					if (!v) {
						setSigPreview(null)
						setSigRequired(false)
					}
				}}
			>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>Tải chữ ký số (giáo viên)</DialogTitle>
						<DialogDescription>
							Sau khi import đề, bạn cần tải ảnh chữ ký. Chữ ký
							được in trên form giấy (phần{' '}
							<strong>Nơi nhận</strong> / Giảng viên soạn đề). PNG
							hoặc JPG, tối đa ~1.5MB.
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-3'>
						{mySignatureUrl && !sigPreview ? (
							<div className='rounded-md border bg-muted/30 p-3 text-center'>
								<p className='text-muted-foreground mb-2 text-xs'>
									Chữ ký hiện tại
								</p>
								<img
									src={mySignatureUrl}
									alt='Chữ ký'
									className='mx-auto max-h-24 object-contain'
								/>
							</div>
						) : null}
						<input
							ref={sigFileRef}
							type='file'
							accept='image/png,image/jpeg,image/webp,image/*'
							className='hidden'
							onChange={(e) => {
								const f = e.target.files?.[0]
								if (!f) return
								void onSignatureFile(f)
							}}
						/>
						<Button
							type='button'
							variant='outline'
							className='w-full'
							disabled={sigBusy}
							onClick={() => sigFileRef.current?.click()}
						>
							{sigBusy ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								<Upload className='mr-2 h-4 w-4' />
							)}
							{sigPreview || mySignatureUrl
								? 'Chọn ảnh chữ ký khác'
								: 'Chọn ảnh chữ ký'}
						</Button>
						{sigPreview ? (
							<img
								src={sigPreview}
								alt='Xem chữ ký (đã bỏ nền)'
								className='mx-auto max-h-28 border bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] p-2 object-contain'
							/>
						) : (
							!mySignatureUrl && (
								<p className='text-muted-foreground text-center text-xs'>
									Chưa chọn ảnh — nền trắng, nét chữ ký đậm
								</p>
							)
						)}
					</div>
					<DialogFooter>
						{!sigRequired && (
							<Button
								variant='outline'
								onClick={() => {
									setSigDialogOpen(false)
									setSigPreview(null)
								}}
							>
								Để sau
							</Button>
						)}
						<Button
							disabled={!sigPreview || sigBusy}
							onClick={() => void saveMySignature()}
						>
							{sigBusy && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Lưu chữ ký
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* In / tải form giấy: hỏi có ký hay không */}
			<Dialog
				open={!!exportDialog}
				onOpenChange={(v) => {
					if (!v) setExportDialog(null)
				}}
			>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>
							{exportDialog?.mode === 'print'
								? 'In form giấy'
								: 'Tải form giấy'}
						</DialogTitle>
						<DialogDescription>
							Biểu mẫu <strong>BỘ CÂU HỎI - ĐÁP ÁN</strong> (phê
							duyệt BGH, chủ nhiệm khoa, giảng viên). Chọn in kèm
							chữ ký số đã lưu hay để trống ô để ký tay.
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-2 sm:grid-cols-2'>
						<Button
							disabled={exportBusy}
							onClick={() =>
								exportDialog &&
								void runExport(
									exportDialog.format,
									exportDialog.mode,
									true
								)
							}
						>
							{exportBusy ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : exportDialog?.mode === 'print' ? (
								<Printer className='mr-2 h-4 w-4' />
							) : (
								<Download className='mr-2 h-4 w-4' />
							)}
							Có ký (chữ ký số)
						</Button>
						<Button
							variant='outline'
							disabled={exportBusy}
							onClick={() =>
								exportDialog &&
								void runExport(
									exportDialog.format,
									exportDialog.mode,
									false
								)
							}
						>
							Không ký (ký tay)
						</Button>
					</div>
					<DialogFooter>
						<Button
							variant='ghost'
							onClick={() => setExportDialog(null)}
						>
							Hủy
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	)
}

/** Ngày/giờ import (= createdAt lúc tạo đề) — dd/mm/yyyy HH:mm */
function formatImportTime(raw?: string | null): string {
	if (!raw) return '—'
	const s = String(raw).trim()
	// DB: YYYY-MM-DD HH:mm:ss hoặc ISO
	const m = s.match(
		/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/
	)
	if (m) {
		const [, y, mo, d, hh, mm] = m
		if (hh != null && mm != null) return `${d}/${mo}/${y} ${hh}:${mm}`
		return `${d}/${mo}/${y}`
	}
	const t = Date.parse(s)
	if (!Number.isFinite(t)) return s.slice(0, 16)
	const dt = new Date(t)
	const pad = (n: number) => String(n).padStart(2, '0')
	return `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

function buildPaperTitle(
	paper: ParsedExamPaper,
	prefix: string,
	_note: string
): string {
	const base = paper.title || `Đề thi số ${paper.examNumber ?? ''}`
	const p = prefix.trim()
	if (!p) return base
	// Tránh lặp "Đề thi số 1 — Đề thi số 1"
	if (p.toLowerCase() === base.toLowerCase()) return base
	return `${p} — ${base}`
}
