/**
 * Duyệt đề theo cấp (CNK → Ban KT → BGH):
 * - Chỉ đề GV đã gửi (pending đúng cấp)
 * - Xem đủ: Đề số · Câu · Nội dung · Đáp án · Điểm (theo ngành / môn)
 * - BGH phê duyệt cuối → APPROVED + QR → ngân hàng đề
 */
import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	CheckCircle2,
	Download,
	FileDown,
	Loader2,
	Printer,
	Upload
} from 'lucide-react'
import { toast } from 'sonner'
import {
	BghApproveBatch,
	DecideExam,
	downloadTeacherExamBoard,
	ListApprovalBoard,
	ListExamMajors,
	ListExamSubjects,
	printTeacherExamBoard,
	type ExamItem
} from '@/api/exam'
import { GetUserInfo, UpdateMySignature } from '@/api'
import { isExamBgh, isExamDeptHead, isExamOffice } from '@/lib/exam-roles'
import { extractSignatureFromImage } from '@/lib/signature-extract'
import { isSuperAdmin } from '@/lib/utils'
import { ExamStatusBadge } from './exam-status'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'

function approveLabel(status: string) {
	if (status === 'PENDING_BGH') return 'Phê duyệt cuối + QR + khóa'
	if (status === 'PENDING_EXAM_OFFICE') return 'Thẩm định đạt → đẩy BGH'
	if (status === 'PENDING_DEPT') return 'Duyệt đạt → đẩy Ban KT'
	return 'Phê duyệt'
}

function returnLabel(status: string) {
	if (status === 'PENDING_BGH') return 'Trả về Ban Khảo thí'
	if (status === 'PENDING_EXAM_OFFICE') return 'Trả về Chủ nhiệm khoa'
	if (status === 'PENDING_DEPT') return 'Trả lại giảng viên soạn'
	return 'Trả lại'
}

function statusHint(status: string) {
	if (status === 'PENDING_BGH')
		return 'Bước 3/3 — BGH: Duyệt → QR + khóa + ngân hàng (chữ ký HT/PHT). Trả → Ban Khảo thí (không vào ngân hàng).'
	if (status === 'PENDING_EXAM_OFFICE')
		return 'Bước 2/3 — Ban KT: Duyệt → chuyển BGH (không QR, không khóa). Trả → Chủ nhiệm khoa.'
	if (status === 'PENDING_DEPT')
		return 'Bước 1/3 — CNK: Duyệt → chuyển Ban KT (chèn chữ ký CNK). Trả → giảng viên soạn lại.'
	return ''
}

export default function ExamApprovalPage() {
	const qc = useQueryClient()
	const canReview =
		isExamBgh() || isExamDeptHead() || isExamOffice() || isSuperAdmin()
	const isFinalLevel = isExamBgh() || isSuperAdmin()
	const [selected, setSelected] = useState<ExamItem | null>(null)
	const [note, setNote] = useState('')
	const [numbersText, setNumbersText] = useState('')
	const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
	/** Lọc theo ngành / môn / giáo viên */
	const [filterMajor, setFilterMajor] = useState<string>('all')
	const [filterSubject, setFilterSubject] = useState<string>('all')
	const [filterTeacher, setFilterTeacher] = useState<string>('all')
	/** Dialog upload chữ ký khi duyệt CNK / BGH */
	const [sigDialogOpen, setSigDialogOpen] = useState(false)
	const [pendingApprove, setPendingApprove] = useState<{
		mode: 'single' | 'batch'
		id?: number
		note?: string
	} | null>(null)
	const [sigPreview, setSigPreview] = useState<string | null>(null)
	const [sigBusy, setSigBusy] = useState(false)
	const sigFileRef = useRef<HTMLInputElement>(null)
	/** Xuất form giấy mẫu C (BỘ CÂU HỎI - ĐÁP ÁN) — hỏi có ký / không ký */
	const [exportBusy, setExportBusy] = useState(false)
	const [exportDialog, setExportDialog] = useState<{
		mode: 'print' | 'download'
		examIds: number[]
	} | null>(null)

	const meQ = useQuery({
		queryKey: ['auth-me-signature'],
		queryFn: GetUserInfo,
		enabled: canReview,
		staleTime: 30_000
	})
	const mySignatureUrl =
		(meQ.data as { signatureUrl?: string | null; id?: number } | undefined)
			?.signatureUrl || null

	/**
	 * Chữ ký thật (ảnh): bỏ placeholder SVG seed ngắn.
	 * HT/PHT/BGH cần upload PNG/JPG trước khi phê duyệt.
	 */
	function hasRealSignature(url?: string | null): boolean {
		const u = (url || '').trim()
		if (!u) return false
		if (u.includes('image/svg+xml') && u.length < 800) return false
		if (u.length < 200) return false
		return true
	}
	const hasMySignature = hasRealSignature(mySignatureUrl)

	/** CNK hoặc BGH khi duyệt APPROVE cần chữ ký (super admin vận hành: không bắt buộc) */
	function needsSignatureForStatus(status?: string) {
		if (isSuperAdmin()) return false
		if (status === 'PENDING_BGH') return isExamBgh()
		if (status === 'PENDING_DEPT') return isExamDeptHead()
		return false
	}

	/** BGH / CNK luôn được tải / đổi chữ ký trên trang duyệt */
	const canManageSignature =
		canReview && (isExamBgh() || isExamDeptHead() || isSuperAdmin())

	async function processSignatureFile(file: File): Promise<string> {
		if (file.size > 2_000_000) {
			throw new Error('Ảnh chữ ký tối đa ~2MB')
		}
		// Chỉ lấy nét chữ ký, bỏ nền trắng
		return extractSignatureFromImage(file)
	}

	const majorsQ = useQuery({
		queryKey: ['exam-majors'],
		queryFn: () => ListExamMajors(),
		enabled: canReview
	})
	const subjectsQ = useQuery({
		queryKey: ['exam-subjects', filterMajor],
		queryFn: () =>
			ListExamSubjects(
				filterMajor !== 'all'
					? { majorId: Number(filterMajor) }
					: undefined
			),
		enabled: canReview
	})

	const boardQ = useQuery({
		queryKey: ['exam-approval-board', filterMajor, filterSubject],
		queryFn: () =>
			ListApprovalBoard({
				majorId:
					filterMajor !== 'all' ? Number(filterMajor) : undefined,
				subjectId:
					filterSubject !== 'all' ? Number(filterSubject) : undefined
			}),
		enabled: canReview
	})

	const decideMut = useMutation({
		mutationFn: async (vars: {
			id: number
			decision: 'APPROVE' | 'RETURN'
			note?: string
			status?: string
		}) => {
			if (
				vars.decision === 'APPROVE' &&
				needsSignatureForStatus(vars.status)
			) {
				const me = await meQ.refetch()
				const url = (me.data as { signatureUrl?: string } | undefined)
					?.signatureUrl
				if (!hasRealSignature(url)) {
					setPendingApprove({
						mode: 'single',
						id: vars.id,
						note: vars.note
					})
					setSigPreview(null)
					setSigDialogOpen(true)
					throw new Error(
						'Hiệu trưởng / Phó HT / CNK cần tải ảnh chữ ký số (PNG/JPG) trước khi phê duyệt.'
					)
				}
			}
			return DecideExam(vars.id, vars.decision, vars.note)
		},
		onSuccess: (data) => {
			toast.success(
				data.status === 'APPROVED'
					? 'Đã phê duyệt: QR · khóa · chữ ký BGH · vào ngân hàng'
					: data.status === 'PENDING_BGH'
						? 'Đã chuyển BGH'
						: data.status === 'PENDING_EXAM_OFFICE'
							? 'Đã chuyển Ban Khảo thí (đã chèn chữ ký CNK)'
							: data.status === 'PENDING_DEPT'
								? 'Đã trả về CNK'
								: 'Đã trả lại người soạn'
			)
			setSelected(null)
			setNote('')
			setSigDialogOpen(false)
			setPendingApprove(null)
			void qc.invalidateQueries({ queryKey: ['exam-pending'] })
			void qc.invalidateQueries({ queryKey: ['exam-pending-count'] })
			void qc.invalidateQueries({ queryKey: ['exam-approval-board'] })
			void qc.invalidateQueries({ queryKey: ['exam-bgh-board'] })
			void qc.invalidateQueries({ queryKey: ['exam-bank'] })
			// Cập nhật list «Đề của tôi» (GV) ngay sau duyệt
			void qc.invalidateQueries({ queryKey: ['exam-mine'] })
			void qc.invalidateQueries({ queryKey: ['exam-exams'] })
			void qc.invalidateQueries({ queryKey: ['auth-me-signature'] })
		},
		onError: (e: Error) => {
			if (e.message.includes('chữ ký')) {
				// dialog may already be open
				toast.error(e.message)
				return
			}
			toast.error(e.message)
		}
	})

	/** Mở dialog nếu chưa có chữ ký thật — trả false nếu cần dừng */
	async function ensureSignatureBeforeApprove(): Promise<boolean> {
		const me = await meQ.refetch()
		const url = (me.data as { signatureUrl?: string } | undefined)
			?.signatureUrl
		if (hasRealSignature(url)) return true
		setPendingApprove(null)
		setSigPreview(null)
		setSigDialogOpen(true)
		toast.error(
			'Hiệu trưởng / Phó HT / CNK: tải ảnh chữ ký số (PNG/JPG) trước khi duyệt.'
		)
		return false
	}

	async function saveSignatureAndContinue() {
		if (!sigPreview) {
			toast.error('Chọn ảnh chữ ký trước')
			return
		}
		setSigBusy(true)
		try {
			await UpdateMySignature(sigPreview)
			await qc.invalidateQueries({ queryKey: ['auth-me-signature'] })
			await qc.invalidateQueries({ queryKey: ['auth', 'user'] })
			toast.success('Đã lưu chữ ký (nét chữ, nền trong suốt)')
			const pend = pendingApprove
			setSigDialogOpen(false)
			setSigPreview(null)
			// Có pending duyệt → tiếp tục; không thì chỉ lưu (HT/PHT đổi chữ ký sau duyệt)
			if (pend?.mode === 'single' && pend.id) {
				await decideMut.mutateAsync({
					id: pend.id,
					decision: 'APPROVE',
					note: pend.note,
					status: selected?.status
				})
			} else if (pend?.mode === 'batch') {
				batchMut.mutate()
			}
			setPendingApprove(null)
		} catch (e) {
			toast.error(e instanceof Error ? e.message : String(e))
		} finally {
			setSigBusy(false)
		}
	}

	const scopeMajorId = filterMajor !== 'all' ? Number(filterMajor) : undefined
	const scopeSubjectId =
		filterSubject !== 'all' ? Number(filterSubject) : undefined

	const board = boardQ.data?.data || []
	const levelLabel = boardQ.data?.levelLabel || 'Hàng đợi duyệt'
	const majors = majorsQ.data || []
	const subjects = subjectsQ.data || []
	const canActOnSelected = !!selected

	/** Parse "1, 3, 5-7" → tập số đề */
	function parsePaperNumbers(text: string): number[] {
		const set = new Set<number>()
		const parts = text
			.trim()
			.split(/[,;.\s]+/)
			.map((s) => s.trim())
			.filter(Boolean)
		for (const p of parts) {
			const range = p.match(/^(\d+)\s*[-–—~]\s*(\d+)$/)
			if (range) {
				const a = Number(range[1])
				const b = Number(range[2])
				if (!Number.isFinite(a) || !Number.isFinite(b)) continue
				const lo = Math.min(a, b)
				const hi = Math.max(a, b)
				for (let i = lo; i <= hi && i < lo + 500; i++) set.add(i)
			} else {
				const n = Number(p.replace(/[^\d]/g, ''))
				if (Number.isFinite(n) && n > 0) set.add(n)
			}
		}
		return [...set].sort((a, b) => a - b)
	}

	/** Mở dialog xuất mẫu C (form giấy như bang-de-mau-C-…) */
	function openExportFormC(mode: 'print' | 'download', examIds?: number[]) {
		const ids =
			examIds && examIds.length
				? examIds
				: checkedIds.size
					? [...checkedIds]
					: examList.map((e) => e.id)
		if (!ids.length) {
			toast.error('Chọn ít nhất 1 đề (hoặc có đề trong hàng đợi) để xuất')
			return
		}
		setExportDialog({ mode, examIds: ids })
	}

	/** Xuất form giấy mẫu C — cùng layout BỘ CÂU HỎI - ĐÁP ÁN (file mau-C) */
	async function runExportFormC(withSignatures: boolean) {
		if (!exportDialog) return
		const { mode, examIds } = exportDialog
		setExportBusy(true)
		setExportDialog(null)
		try {
			const payload = {
				format: 'c' as const,
				examIds,
				forReview: true,
				withSignatures
			}
			const r =
				mode === 'print'
					? await printTeacherExamBoard(payload)
					: await downloadTeacherExamBoard(payload)
			const sig = withSignatures ? 'có chữ ký số' : 'không ký (ký tay)'
			toast.success(
				mode === 'print'
					? `Đang in mẫu C (${sig}) — ${r.paperCount} đề`
					: `Đã tải mẫu C (${sig}) — ${r.paperCount} đề · ${r.filename}`
			)
		} catch (e) {
			toast.error(
				e instanceof Error ? e.message : 'Không xuất được mẫu C'
			)
		} finally {
			setExportBusy(false)
		}
	}

	/**
	 * Chỉ lấy đề trong bảng đang hiển thị (đã lọc ngành/môn).
	 * Tick → theo id; không tick → khớp số đề đang hiện.
	 */
	function resolveTargetsFromVisibleBoard(): {
		ids: number[]
		matchedPapers: number[]
		missingPapers: number[]
		availablePapers: number[]
	} {
		const availablePapers = [
			...new Set(
				board
					.map((p) => p.exam.paperNumber)
					.filter((n): n is number => n != null && n > 0)
			)
		].sort((a, b) => a - b)

		if (checkedIds.size > 0) {
			const ids = board
				.filter((p) => checkedIds.has(p.exam.id))
				.map((p) => p.exam.id)
			return {
				ids,
				matchedPapers: board
					.filter((p) => checkedIds.has(p.exam.id))
					.map((p) => p.exam.paperNumber)
					.filter((n): n is number => n != null),
				missingPapers: [],
				availablePapers
			}
		}

		const wanted = parsePaperNumbers(numbersText)
		if (!wanted.length) {
			return {
				ids: [],
				matchedPapers: [],
				missingPapers: [],
				availablePapers
			}
		}

		const wantedSet = new Set(wanted)
		const matched = board.filter(
			(p) =>
				p.exam.paperNumber != null && wantedSet.has(p.exam.paperNumber)
		)
		const matchedPapers = matched
			.map((p) => p.exam.paperNumber!)
			.filter((n, i, a) => a.indexOf(n) === i)
		const missingPapers = wanted.filter((n) => !matchedPapers.includes(n))

		return {
			ids: matched.map((p) => p.exam.id),
			matchedPapers,
			missingPapers,
			availablePapers
		}
	}

	/**
	 * Duyệt danh sách id:
	 * - Super admin: mọi cấp chờ → thẳng ngân hàng (BghApproveBatch / DecideExam full)
	 * - BGH: chỉ PENDING_BGH → ngân hàng
	 * - CNK / Ban KT: DecideExam chuyển đúng 1 cấp
	 */
	async function approveExamIdsByStatus(ids: number[]): Promise<{
		approved: number
		toBank: number
		advanced: number
		failed: Array<{ id?: number; error: string }>
	}> {
		const superAdmin = isSuperAdmin()
		const finalIds: number[] = []
		const stepIds: number[] = []
		for (const id of ids) {
			const st = board.find((b) => b.exam.id === id)?.exam.status
			if (superAdmin) {
				// Admin: mọi pending → phê duyệt cuối
				if (
					st === 'PENDING_BGH' ||
					st === 'PENDING_DEPT' ||
					st === 'PENDING_EXAM_OFFICE'
				) {
					finalIds.push(id)
				} else {
					stepIds.push(id)
				}
			} else if (st === 'PENDING_BGH') {
				finalIds.push(id)
			} else {
				stepIds.push(id)
			}
		}

		// Chữ ký: CNK / BGH thường bắt buộc; super bỏ qua
		const needsSigStep =
			finalIds.length > 0 ||
			stepIds.some((id) => {
				const st = board.find((b) => b.exam.id === id)?.exam.status
				return st === 'PENDING_DEPT'
			})
		if (needsSigStep && !superAdmin) {
			const me = await meQ.refetch()
			const url = (me.data as { signatureUrl?: string } | undefined)
				?.signatureUrl
			if (!hasRealSignature(url)) {
				setPendingApprove({ mode: 'batch' })
				setSigPreview(null)
				setSigDialogOpen(true)
				throw new Error(
					'Cần tải ảnh chữ ký số (PNG/JPG) trước khi duyệt.'
				)
			}
		}

		let approved = 0
		let toBank = 0
		let advanced = 0
		const failed: Array<{ id?: number; error: string }> = []

		if (finalIds.length) {
			try {
				const res = await BghApproveBatch({
					examIds: finalIds,
					note: note || undefined,
					majorId: scopeMajorId,
					subjectId: scopeSubjectId
				})
				approved += res.approved
				toBank += res.approved
				for (const f of res.failed || []) {
					failed.push({
						id: f.id,
						error: f.error
					})
				}
				// Batch có thể bỏ sót id (lỗi status) → DecideExam từng cái
				const okIds = new Set(
					(res.data || []).map((e: { id: number }) => e.id)
				)
				for (const id of finalIds) {
					if (okIds.has(id)) continue
					const alreadyFailed = failed.some((f) => f.id === id)
					if (alreadyFailed) continue
					try {
						await DecideExam(id, 'APPROVE', note || undefined)
						approved++
						toBank++
					} catch (err) {
						failed.push({
							id,
							error:
								err instanceof Error ? err.message : String(err)
						})
					}
				}
			} catch {
				for (const id of finalIds) {
					try {
						await DecideExam(id, 'APPROVE', note || undefined)
						approved++
						toBank++
					} catch (err) {
						failed.push({
							id,
							error:
								err instanceof Error ? err.message : String(err)
						})
					}
				}
			}
		}

		for (const id of stepIds) {
			try {
				const d = await DecideExam(id, 'APPROVE', note || undefined)
				approved++
				if (d.status === 'APPROVED') toBank++
				else advanced++
			} catch (e) {
				failed.push({
					id,
					error: e instanceof Error ? e.message : String(e)
				})
			}
		}

		return { approved, toBank, advanced, failed }
	}

	/** Duyệt hàng loạt — chỉ các đề trong phạm vi ngành/môn đang xem */
	const batchMut = useMutation({
		mutationFn: async () => {
			if (!board.length) {
				throw new Error(
					'Chưa có đề trong phạm vi đã chọn. Chọn ngành đào tạo + môn trước.'
				)
			}

			const { ids, matchedPapers, missingPapers, availablePapers } =
				resolveTargetsFromVisibleBoard()

			if (!ids.length) {
				const avail =
					availablePapers.length > 0
						? `Các đề số đang hiện: ${availablePapers.join(', ')}.`
						: 'Không có đề số nào trong bảng.'
				const miss = numbersText.trim()
					? ` Bạn nhập «${numbersText.trim()}» — không khớp đề nào trong ngành/môn này.`
					: ' Hãy tick đề hoặc nhập số đề (vd. 1,3,5).'
				throw new Error(`${miss} ${avail}`)
			}

			if (missingPapers.length) {
				toast.warning(
					`Không thấy đề số ${missingPapers.join(', ')} trong phạm vi hiện tại — chỉ duyệt: ${matchedPapers.join(', ')}`,
					{ duration: 6000 }
				)
			}

			const result = await approveExamIdsByStatus(ids)
			return { ...result, matchedPapers }
		},
		onSuccess: (r) => {
			const papers = r.matchedPapers?.length
				? ` (đề số ${r.matchedPapers.join(', ')})`
				: ''
			const failSuffix = r.failed?.length
				? ` · ${r.failed.length} lỗi`
				: ''
			if (r.toBank > 0 && r.advanced === 0) {
				toast.success(
					`Đã phê duyệt ${r.toBank} đề${papers} → Ngân hàng đề (QR + khóa)${failSuffix}`,
					{
						duration: 8000,
						action: {
							label: 'Mở ngân hàng',
							onClick: () => {
								window.location.href = '/de-thi/ngan-hang'
							}
						}
					}
				)
			} else if (r.toBank > 0 && r.advanced > 0) {
				toast.success(
					`Đã duyệt ${r.approved} đề${papers}: ${r.toBank} vào ngân hàng, ${r.advanced} chuyển cấp tiếp${failSuffix}`,
					{ duration: 8000 }
				)
			} else {
				toast.success(
					`Đã duyệt ${r.approved} đề${papers} → chuyển cấp tiếp (chưa vào ngân hàng)${failSuffix}`
				)
			}
			if (r.failed?.length) {
				toast.error(
					r.failed
						.map((f) => f.error)
						.slice(0, 3)
						.join('\n')
				)
			}
			setCheckedIds(new Set())
			setNumbersText('')
			setNote('')
			void qc.invalidateQueries({ queryKey: ['exam-pending'] })
			void qc.invalidateQueries({ queryKey: ['exam-pending-count'] })
			void qc.invalidateQueries({ queryKey: ['exam-approval-board'] })
			void qc.invalidateQueries({ queryKey: ['exam-bank'] })
			void qc.invalidateQueries({ queryKey: ['exam-mine'] })
			void qc.invalidateQueries({ queryKey: ['exam-exams'] })
		},
		onError: (e: Error) => toast.error(e.message, { duration: 8000 })
	})

	/** Danh sách GV có đề trong hàng đợi (để lọc) */
	const teacherOptions = useMemo(() => {
		const map = new Map<
			string,
			{ key: string; name: string; username: string }
		>()
		for (const paper of board) {
			const uid = paper.exam.createdByUserId
			const username = paper.exam.createdByUsername || ''
			const name =
				paper.exam.createdByDisplayName || username || 'Giáo viên ?'
			const key =
				uid != null
					? `u:${uid}`
					: username
						? `n:${username}`
						: `x:${name}`
			if (!map.has(key)) {
				map.set(key, { key, name, username })
			}
		}
		return [...map.values()].sort((a, b) =>
			a.name.localeCompare(b.name, 'vi')
		)
	}, [board])

	const filteredBoard = useMemo(() => {
		if (filterTeacher === 'all') return board
		return board.filter((paper) => {
			const uid = paper.exam.createdByUserId
			const username = paper.exam.createdByUsername || ''
			const name =
				paper.exam.createdByDisplayName || username || 'Giáo viên ?'
			const key =
				uid != null
					? `u:${uid}`
					: username
						? `n:${username}`
						: `x:${name}`
			return key === filterTeacher
		})
	}, [board, filterTeacher])

	/**
	 * Nhóm: Giáo viên → Môn (ngành)
	 * List chi tiết: từng câu hỏi của từng đề trong nhóm
	 */
	const grouped = useMemo(() => {
		type Row = {
			examId: number
			paperNumber: number | null
			code: string
			title: string
			questionNumber: number
			content: string
			answer: string
			points: number
			isFirst: boolean
			rowSpan: number
			className: string | null
			durationMinutes: number | null
		}
		const groups = new Map<
			string,
			{
				key: string
				teacherKey: string
				teacherName: string
				teacherUsername: string
				majorId: number | null
				majorName: string
				subjectId: number
				subjectName: string
				subjectCode: string
				rows: Row[]
				examIds: number[]
				/** Tóm tắt từng đề trong nhóm */
				examSummaries: Array<{
					id: number
					paperNumber: number | null
					code: string
					title: string
					questionCount: number
					className: string | null
				}>
			}
		>()

		for (const paper of filteredBoard) {
			const majorId = paper.exam.majorId ?? null
			const majorName =
				paper.exam.majorName || paper.exam.majorCode || 'Chưa gán ngành'
			const subjectId = paper.exam.subjectId
			const subjectName =
				paper.exam.subjectName || paper.exam.subjectCode || 'Môn ?'
			const subjectCode = paper.exam.subjectCode || ''
			const uid = paper.exam.createdByUserId
			const teacherUsername = paper.exam.createdByUsername || ''
			const teacherName =
				paper.exam.createdByDisplayName ||
				teacherUsername ||
				'Giáo viên ?'
			const teacherKey =
				uid != null
					? `u:${uid}`
					: teacherUsername
						? `n:${teacherUsername}`
						: `x:${teacherName}`
			const key = `${teacherKey}|${majorId ?? 'x'}|${subjectId}`
			if (!groups.has(key)) {
				groups.set(key, {
					key,
					teacherKey,
					teacherName,
					teacherUsername,
					majorId,
					majorName,
					subjectId,
					subjectName,
					subjectCode,
					rows: [],
					examIds: [],
					examSummaries: []
				})
			}
			const g = groups.get(key)!
			g.examIds.push(paper.exam.id)

			const pn =
				paper.exam.paperNumber ?? paper.rows[0]?.paperNumber ?? null
			const n = Math.max(paper.rows.length, 1)
			g.examSummaries.push({
				id: paper.exam.id,
				paperNumber: pn,
				code: paper.exam.code,
				title: paper.exam.title,
				questionCount: paper.rows.length,
				className: paper.exam.className ?? null
			})

			const className = paper.exam.className ?? null
			const durationMinutes = paper.exam.durationMinutes ?? null

			if (!paper.rows.length) {
				g.rows.push({
					examId: paper.exam.id,
					paperNumber: pn,
					code: paper.exam.code,
					title: paper.exam.title,
					questionNumber: 0,
					content: '(Chưa có câu hỏi form)',
					answer: '',
					points: 0,
					isFirst: true,
					rowSpan: 1,
					className,
					durationMinutes
				})
				continue
			}
			paper.rows.forEach((r, i) => {
				g.rows.push({
					examId: paper.exam.id,
					paperNumber: pn,
					code: paper.exam.code,
					title: paper.exam.title,
					questionNumber: r.questionNumber,
					content: r.content,
					answer: r.answer,
					points: r.points,
					isFirst: i === 0,
					rowSpan: n,
					className,
					durationMinutes
				})
			})
		}
		return [...groups.values()].sort((a, b) => {
			const t = a.teacherName.localeCompare(b.teacherName, 'vi')
			if (t !== 0) return t
			return a.subjectName.localeCompare(b.subjectName, 'vi')
		})
	}, [filteredBoard])

	/** List tóm tắt: mỗi dòng = 1 đề (GV · môn · đề số · số câu) */
	const examList = useMemo(() => {
		return filteredBoard
			.map((p) => ({
				id: p.exam.id,
				code: p.exam.code,
				title: p.exam.title,
				paperNumber: p.exam.paperNumber,
				status: p.exam.status,
				statusLabel: p.exam.statusLabel,
				teacher:
					p.exam.createdByDisplayName ||
					p.exam.createdByUsername ||
					'—',
				teacherUsername: p.exam.createdByUsername || '',
				subject: p.exam.subjectName || p.exam.subjectCode || '—',
				subjectCode: p.exam.subjectCode || '',
				major: p.exam.majorName || p.exam.majorCode || '—',
				className: p.exam.className || '—',
				questionCount: p.rows.length,
				durationMinutes: p.exam.durationMinutes
			}))
			.sort((a, b) => {
				const t = a.teacher.localeCompare(b.teacher, 'vi')
				if (t !== 0) return t
				const s = a.subject.localeCompare(b.subject, 'vi')
				if (s !== 0) return s
				return (a.paperNumber ?? 0) - (b.paperNumber ?? 0)
			})
	}, [filteredBoard])

	function toggleExam(id: number) {
		setCheckedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	function selectGroup(examIds: number[]) {
		setCheckedIds(new Set(examIds))
	}

	const canBatch = checkedIds.size > 0 || numbersText.trim().length > 0

	const scopeLabel = useMemo(() => {
		const parts: string[] = []
		if (filterTeacher !== 'all') {
			const t = teacherOptions.find((x) => x.key === filterTeacher)
			parts.push(t ? `GV ${t.name}` : 'GV đã chọn')
		}
		if (filterMajor !== 'all') {
			const m = majors.find((x) => String(x.id) === filterMajor)
			parts.push(m ? `Ngành ${m.code}` : 'Ngành đã chọn')
		}
		if (filterSubject !== 'all') {
			const s = subjects.find((x) => String(x.id) === filterSubject)
			parts.push(s ? `Môn ${s.code}` : 'Môn đã chọn')
		}
		return parts.length ? parts.join(' · ') : 'Tất cả GV / ngành / môn'
	}, [
		filterTeacher,
		filterMajor,
		filterSubject,
		majors,
		subjects,
		teacherOptions
	])

	if (!canReview) {
		return (
			<div className='space-y-3 p-6'>
				<h1 className='text-2xl font-semibold'>Duyệt đề thi</h1>
				<p className='text-muted-foreground text-sm'>
					Chỉ CNK, Ban Khảo thí hoặc BGH được xét duyệt đề GV đã gửi.
					Giảng viên soạn đề tại «Đề của tôi» rồi bấm Gửi duyệt.
				</p>
			</div>
		)
	}

	const boardLevel = boardQ.data?.level || ''
	const stepActive = (key: string) => {
		if (boardLevel === 'MULTI' || isSuperAdmin()) return true
		if (key === 'CNK') return boardLevel === 'CNK' || isExamDeptHead()
		if (key === 'KT') return boardLevel === 'EXAM_OFFICE' || isExamOffice()
		if (key === 'BGH') return boardLevel === 'BGH' || isExamBgh()
		return false
	}

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-2xl font-semibold tracking-tight'>
						Duyệt đề thi
					</h1>
					<p className='text-muted-foreground text-sm'>
						<strong>Chỉ đề giáo viên đã gửi</strong> (nháp không
						hiện). Duyệt <b>tuần tự 3 cấp</b> — không bỏ cấp.
					</p>
					<p className='text-primary mt-1 text-sm font-medium'>
						Cấp của bạn: {levelLabel}
					</p>
				</div>
				{canManageSignature && (
					<div className='flex flex-col items-end gap-1'>
						<Button
							type='button'
							variant={hasMySignature ? 'outline' : 'default'}
							onClick={() => {
								setPendingApprove(null)
								setSigPreview(null)
								setSigDialogOpen(true)
							}}
						>
							<Upload className='mr-2 h-4 w-4' />
							{hasMySignature ? 'Đổi chữ ký số' : 'Tải chữ ký số'}
						</Button>
						{hasMySignature ? (
							<p className='text-muted-foreground max-w-[14rem] text-right text-[11px]'>
								Đã có chữ ký — có thể đổi bất cứ lúc nào (trước
								hoặc sau phê duyệt).
							</p>
						) : (
							<p className='text-amber-700 max-w-[14rem] text-right text-[11px]'>
								HT / PHT / CNK: tải chữ ký trước khi duyệt.
							</p>
						)}
					</div>
				)}
			</div>

			{canManageSignature && !hasMySignature && (
				<div className='rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm'>
					<strong>
						{isExamBgh()
							? 'Hiệu trưởng / Phó HT / BGH'
							: 'Chủ nhiệm khoa'}
					</strong>{' '}
					chưa có chữ ký số (ảnh). Bấm «Tải chữ ký số» để upload
					PNG/JPG — bắt buộc trước khi phê duyệt.
				</div>
			)}

			{/* Sơ đồ quy trình 3 cấp */}
			<div className='grid gap-2 rounded-lg border bg-muted/40 p-3 text-xs sm:grid-cols-4 md:text-sm'>
				<div className='rounded-md border bg-background px-3 py-2'>
					<div className='text-muted-foreground font-medium'>
						0. Giảng viên
					</div>
					<div>
						Soạn / import → <b>Gửi duyệt</b>
					</div>
				</div>
				<div
					className={`rounded-md border px-3 py-2 ${stepActive('CNK') ? 'border-amber-400 bg-amber-50' : 'bg-background'}`}
				>
					<div className='font-medium text-amber-900'>
						1. Chủ nhiệm khoa
					</div>
					<div>
						Duyệt → Ban KT
						<br />
						Trả → GV soạn lại
					</div>
				</div>
				<div
					className={`rounded-md border px-3 py-2 ${stepActive('KT') ? 'border-orange-400 bg-orange-50' : 'bg-background'}`}
				>
					<div className='font-medium text-orange-900'>
						2. Ban Khảo thí
					</div>
					<div>
						Duyệt → BGH
						<br />
						Trả → CNK
					</div>
				</div>
				<div
					className={`rounded-md border px-3 py-2 ${stepActive('BGH') ? 'border-blue-400 bg-blue-50' : 'bg-background'}`}
				>
					<div className='font-medium text-blue-900'>
						3. BGH (cuối)
					</div>
					<div>
						Duyệt → QR + khóa + ngân hàng
						<br />
						Trả → Ban KT
					</div>
				</div>
			</div>

			{/* ── Hàng đợi: list đề + chi tiết câu hỏi ── */}
			<Card>
				<CardHeader>
					<CardTitle>Hàng đợi xét duyệt</CardTitle>
					<CardDescription>
						List đề GV đã gửi trong khoa/phạm vi của bạn — mỗi dòng:{' '}
						<strong>Giáo viên · Môn · Đề số · Câu hỏi</strong>. Có
						thể <strong>In / Tải mẫu C</strong> (form giấy BỘ CÂU
						HỎI - ĐÁP ÁN).
						{isSuperAdmin()
							? ' Admin: bấm Duyệt = phê duyệt cuối (QR + khóa → ngân hàng), đề biến khỏi hàng đợi.'
							: isFinalLevel
								? ' BGH duyệt xong → ngân hàng.'
								: ' Duyệt chuyển đúng 1 cấp tiếp theo.'}
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					{/* Lọc ngành / môn / GV */}
					<div className='grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2 lg:grid-cols-4'>
						<div className='space-y-1.5'>
							<Label>Giáo viên</Label>
							<Select
								value={filterTeacher}
								onValueChange={(v) => {
									setFilterTeacher(v)
									setCheckedIds(new Set())
									setNumbersText('')
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Tất cả GV' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										Tất cả giáo viên
									</SelectItem>
									{teacherOptions.map((t) => (
										<SelectItem key={t.key} value={t.key}>
											{t.name}
											{t.username
												? ` (${t.username})`
												: ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-1.5'>
							<Label>Ngành đào tạo</Label>
							<Select
								value={filterMajor}
								onValueChange={(v) => {
									setFilterMajor(v)
									setFilterSubject('all')
									setCheckedIds(new Set())
									setNumbersText('')
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Tất cả ngành' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										Tất cả ngành đào tạo
									</SelectItem>
									{majors.map((m) => (
										<SelectItem
											key={m.id}
											value={String(m.id)}
										>
											{m.code} — {m.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-1.5'>
							<Label>Môn học</Label>
							<Select
								value={filterSubject}
								onValueChange={(v) => {
									setFilterSubject(v)
									setCheckedIds(new Set())
									setNumbersText('')
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Tất cả môn' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										Tất cả môn
										{filterMajor !== 'all'
											? ' (trong ngành)'
											: ''}
									</SelectItem>
									{subjects.map((s) => (
										<SelectItem
											key={s.id}
											value={String(s.id)}
										>
											{s.code} — {s.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='flex items-end'>
							<p className='text-muted-foreground text-xs'>
								<strong className='text-foreground'>
									{examList.length}
								</strong>{' '}
								đề ·{' '}
								<strong className='text-foreground'>
									{examList.reduce(
										(s, e) => s + e.questionCount,
										0
									)}
								</strong>{' '}
								câu · {scopeLabel}
							</p>
						</div>
					</div>

					{/* List tóm tắt: GV · môn · đề · số câu */}
					{!boardQ.isLoading && examList.length > 0 && (
						<div className='overflow-x-auto rounded-lg border'>
							<div className='bg-muted/50 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2'>
								<span className='text-sm font-medium'>
									Danh sách đề chờ duyệt
								</span>
								<div className='flex flex-wrap gap-1.5'>
									<Button
										type='button'
										size='sm'
										variant='default'
										disabled={exportBusy}
										title='In form giấy mẫu C (BỘ CÂU HỎI - ĐÁP ÁN)'
										onClick={() => openExportFormC('print')}
									>
										{exportBusy ? (
											<Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' />
										) : (
											<Printer className='mr-1 h-3.5 w-3.5' />
										)}
										In mẫu C
										{checkedIds.size
											? ` (${checkedIds.size})`
											: ''}
									</Button>
									<Button
										type='button'
										size='sm'
										variant='outline'
										disabled={exportBusy}
										title='Tải form giấy mẫu C'
										onClick={() =>
											openExportFormC('download')
										}
									>
										<FileDown className='mr-1 h-3.5 w-3.5' />
										Tải mẫu C
										{checkedIds.size
											? ` (${checkedIds.size})`
											: ''}
									</Button>
								</div>
							</div>
							<Table>
								<TableHeader>
									<TableRow className='bg-muted/30'>
										<TableHead className='w-10' />
										<TableHead>Giáo viên</TableHead>
										<TableHead>Môn</TableHead>
										<TableHead>Ngành</TableHead>
										<TableHead className='w-16'>
											Đề số
										</TableHead>
										<TableHead>Lớp</TableHead>
										<TableHead className='w-16 text-center'>
											Số câu
										</TableHead>
										<TableHead className='w-28'>
											Mã đề
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{examList.map((e) => (
										<TableRow
											key={e.id}
											className={
												checkedIds.has(e.id)
													? 'bg-emerald-50/80'
													: undefined
											}
										>
											<TableCell>
												<Checkbox
													checked={checkedIds.has(
														e.id
													)}
													onCheckedChange={() =>
														toggleExam(e.id)
													}
												/>
											</TableCell>
											<TableCell className='text-sm font-medium'>
												{e.teacher}
												{e.teacherUsername ? (
													<span className='text-muted-foreground block text-[11px] font-normal'>
														{e.teacherUsername}
													</span>
												) : null}
											</TableCell>
											<TableCell className='text-sm'>
												{e.subject}
												{e.subjectCode ? (
													<span className='text-muted-foreground block font-mono text-[10px]'>
														{e.subjectCode}
													</span>
												) : null}
											</TableCell>
											<TableCell className='text-muted-foreground text-xs'>
												{e.major}
											</TableCell>
											<TableCell className='font-mono font-semibold'>
												{e.paperNumber ?? '—'}
											</TableCell>
											<TableCell className='text-sm'>
												{e.className}
											</TableCell>
											<TableCell className='text-center tabular-nums'>
												{e.questionCount}
											</TableCell>
											<TableCell className='font-mono text-[11px]'>
												{e.code}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}

					<div className='flex flex-wrap items-end gap-3 rounded-lg border bg-muted/30 p-3'>
						<div className='min-w-[12rem] flex-1'>
							<Label>
								Phê duyệt các đề số (trong ngành/môn đang xem)
							</Label>
							<Input
								value={numbersText}
								onChange={(e) => setNumbersText(e.target.value)}
								placeholder='VD: 1, 3, 5-7'
								className='mt-1 font-mono'
							/>
							{board.length > 0 && (
								<p className='text-muted-foreground mt-1 text-[11px]'>
									Số đề đang hiện:{' '}
									<span className='font-mono font-medium text-foreground'>
										{[
											...new Set(
												board
													.map(
														(p) =>
															p.exam.paperNumber
													)
													.filter(
														(n): n is number =>
															n != null && n > 0
													)
											)
										]
											.sort((a, b) => a - b)
											.join(', ') || '—'}
									</span>
									. Chỉ duyệt đúng các số này (sau khi chọn
									ngành + môn).
								</p>
							)}
						</div>
						<div className='min-w-[12rem] flex-1'>
							<Label>Ghi chú (tuỳ chọn)</Label>
							<Input
								value={note}
								onChange={(e) => setNote(e.target.value)}
								placeholder='Ghi chú phê duyệt'
								className='mt-1'
							/>
						</div>
						<Button
							className='bg-emerald-600 hover:bg-emerald-700'
							disabled={!canBatch || batchMut.isPending}
							onClick={() => batchMut.mutate()}
						>
							{batchMut.isPending ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								<CheckCircle2 className='mr-2 h-4 w-4' />
							)}
							Phê duyệt
							{checkedIds.size
								? ` (${checkedIds.size} đã chọn)`
								: numbersText.trim()
									? ' theo số'
									: ''}
						</Button>
					</div>

					{boardQ.isLoading ? (
						<div className='flex justify-center py-10'>
							<Loader2 className='h-6 w-6 animate-spin' />
						</div>
					) : !grouped.length ? (
						<p className='text-muted-foreground py-8 text-center text-sm'>
							Không có đề chờ bạn duyệt
							{filterMajor !== 'all' || filterSubject !== 'all'
								? ' trong ngành/môn đã chọn'
								: ''}
							. Chỉ hiện đề GV đã gửi lên đúng cấp của bạn.
						</p>
					) : (
						<div className='space-y-6'>
							<p className='text-sm font-medium'>
								Chi tiết câu hỏi theo giáo viên · môn
							</p>
							{grouped.map((g) => (
								<div
									key={g.key}
									className='overflow-hidden rounded-lg border'
								>
									<div className='bg-muted/60 flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2'>
										<div className='min-w-0 space-y-0.5'>
											<p className='text-sm font-semibold'>
												<span className='text-primary'>
													{g.teacherName}
												</span>
												{g.teacherUsername ? (
													<span className='text-muted-foreground font-normal'>
														{' '}
														({g.teacherUsername})
													</span>
												) : null}
											</p>
											<p className='text-sm'>
												<strong>Môn:</strong>{' '}
												{g.subjectName}
												{g.subjectCode ? (
													<span className='text-muted-foreground font-mono text-xs'>
														{' '}
														· {g.subjectCode}
													</span>
												) : null}
											</p>
											<p className='text-muted-foreground text-xs'>
												Ngành: {g.majorName} ·{' '}
												{g.examIds.length} đề ·{' '}
												{g.rows.length} câu
												{g.examSummaries.some(
													(s) => s.className
												)
													? ` · Lớp: ${[
															...new Set(
																g.examSummaries
																	.map(
																		(s) =>
																			s.className
																	)
																	.filter(
																		Boolean
																	)
															)
														].join(', ')}`
													: ''}
											</p>
										</div>
										<div className='flex flex-wrap gap-2'>
											<Button
												size='sm'
												variant='outline'
												onClick={() =>
													selectGroup(g.examIds)
												}
											>
												Chọn cả khối
											</Button>
											<Button
												size='sm'
												variant='secondary'
												disabled={exportBusy}
												title='In mẫu C khối này (form giấy)'
												onClick={() =>
													openExportFormC(
														'print',
														g.examIds
													)
												}
											>
												<Printer className='mr-1 h-3.5 w-3.5' />
												Mẫu C
											</Button>
											<Button
												size='sm'
												className='bg-emerald-600 hover:bg-emerald-700'
												disabled={batchMut.isPending}
												onClick={() => {
													setCheckedIds(
														new Set(g.examIds)
													)
													void (async () => {
														try {
															const r =
																await approveExamIdsByStatus(
																	g.examIds
																)
															if (
																r.toBank > 0 &&
																r.advanced === 0
															) {
																toast.success(
																	`Đã phê duyệt ${r.toBank} đề → Ngân hàng · ${g.subjectName}`,
																	{
																		duration: 8000,
																		action: {
																			label: 'Mở ngân hàng',
																			onClick:
																				() => {
																					window.location.href =
																						'/de-thi/ngan-hang'
																				}
																		}
																	}
																)
															} else {
																toast.success(
																	`Đã duyệt ${r.approved} đề · ${g.subjectName}` +
																		(r.toBank
																			? ` (${r.toBank} vào NH, ${r.advanced} chuyển cấp)`
																			: ' → chuyển cấp tiếp')
																)
															}
															if (
																r.failed?.length
															) {
																toast.error(
																	r.failed
																		.map(
																			(
																				f
																			) =>
																				f.error
																		)
																		.slice(
																			0,
																			2
																		)
																		.join(
																			'\n'
																		)
																)
															}
															void qc.invalidateQueries(
																{
																	queryKey: [
																		'exam-approval-board'
																	]
																}
															)
															void qc.invalidateQueries(
																{
																	queryKey: [
																		'exam-pending-count'
																	]
																}
															)
															void qc.invalidateQueries(
																{
																	queryKey: [
																		'exam-bank'
																	]
																}
															)
															void qc.invalidateQueries(
																{
																	queryKey: [
																		'exam-mine'
																	]
																}
															)
															setCheckedIds(
																new Set()
															)
														} catch (e) {
															toast.error(
																e instanceof
																	Error
																	? e.message
																	: 'Lỗi duyệt'
															)
														}
													})()
												}}
											>
												<CheckCircle2 className='mr-1 h-3.5 w-3.5' />
												Duyệt cả môn
											</Button>
										</div>
									</div>
									<div className='overflow-x-auto'>
										<Table>
											<TableHeader>
												<TableRow className='bg-muted/30'>
													<TableHead className='w-10' />
													<TableHead className='w-16'>
														Đề số
													</TableHead>
													<TableHead className='w-14'>
														Câu
													</TableHead>
													<TableHead>
														Nội dung câu hỏi
													</TableHead>
													<TableHead>
														Đáp án
													</TableHead>
													<TableHead className='w-14'>
														Điểm
													</TableHead>
													<TableHead className='w-24'>
														Lớp / phút
													</TableHead>
													<TableHead className='w-28 text-right'>
														Thao tác
													</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{g.rows.map((r, idx) => (
													<TableRow
														key={`${r.examId}-${idx}`}
													>
														{r.isFirst && (
															<>
																<TableCell
																	rowSpan={
																		r.rowSpan
																	}
																	className='align-top'
																>
																	<Checkbox
																		checked={checkedIds.has(
																			r.examId
																		)}
																		onCheckedChange={() =>
																			toggleExam(
																				r.examId
																			)
																		}
																	/>
																</TableCell>
																<TableCell
																	rowSpan={
																		r.rowSpan
																	}
																	className='align-top font-mono font-semibold'
																>
																	{r.paperNumber ??
																		'—'}
																	<div className='text-muted-foreground mt-1 text-[10px] font-normal'>
																		{r.code}
																	</div>
																</TableCell>
															</>
														)}
														<TableCell className='align-top font-mono text-xs'>
															{r.questionNumber ||
																'—'}
														</TableCell>
														<TableCell className='align-top text-sm whitespace-pre-wrap'>
															{r.content}
														</TableCell>
														<TableCell className='align-top text-sm whitespace-pre-wrap'>
															{r.answer || (
																<span className='text-muted-foreground'>
																	—
																</span>
															)}
														</TableCell>
														<TableCell className='align-top text-center'>
															{r.points || '—'}
														</TableCell>
														{r.isFirst && (
															<TableCell
																rowSpan={
																	r.rowSpan
																}
																className='text-muted-foreground align-top text-xs'
															>
																{r.className ||
																	'—'}
																{r.durationMinutes
																	? ` · ${r.durationMinutes}p`
																	: ''}
															</TableCell>
														)}
														{r.isFirst && (
															<TableCell
																rowSpan={
																	r.rowSpan
																}
																className='align-top text-right'
															>
																<div className='flex flex-col gap-1'>
																	<Button
																		size='sm'
																		className='bg-emerald-600 hover:bg-emerald-700'
																		disabled={
																			batchMut.isPending ||
																			decideMut.isPending
																		}
																		onClick={() => {
																			const finish =
																				() => {
																					void qc.invalidateQueries(
																						{
																							queryKey:
																								[
																									'exam-approval-board'
																								]
																						}
																					)
																					void qc.invalidateQueries(
																						{
																							queryKey:
																								[
																									'exam-pending-count'
																								]
																						}
																					)
																					void qc.invalidateQueries(
																						{
																							queryKey:
																								[
																									'exam-bank'
																								]
																						}
																					)
																					void qc.invalidateQueries(
																						{
																							queryKey:
																								[
																									'exam-mine'
																								]
																						}
																					)
																				}
																			void (async () => {
																				const st =
																					board.find(
																						(
																							b
																						) =>
																							b
																								.exam
																								.id ===
																							r.examId
																					)
																						?.exam
																						.status
																				const needSig =
																					st ===
																						'PENDING_BGH' ||
																					st ===
																						'PENDING_DEPT'
																				if (
																					needSig &&
																					!(await ensureSignatureBeforeApprove())
																				) {
																					return
																				}
																				try {
																					if (
																						isExamBgh() &&
																						st ===
																							'PENDING_BGH'
																					) {
																						await BghApproveBatch(
																							{
																								examIds:
																									[
																										r.examId
																									],
																								subjectId:
																									g.subjectId,
																								majorId:
																									g.majorId ??
																									undefined,
																								note:
																									note ||
																									undefined
																							}
																						)
																						toast.success(
																							`Đã phê duyệt đề số ${r.paperNumber ?? r.code} → Ngân hàng đề (QR + khóa)`,
																							{
																								duration: 8000,
																								action: {
																									label: 'Mở ngân hàng',
																									onClick:
																										() => {
																											window.location.href =
																												'/de-thi/ngan-hang'
																										}
																								}
																							}
																						)
																					} else {
																						const d =
																							await DecideExam(
																								r.examId,
																								'APPROVE',
																								note ||
																									undefined
																							)
																						toast.success(
																							`Đã duyệt đề số ${r.paperNumber ?? r.code} → ${d.statusLabel}`
																						)
																					}
																					finish()
																				} catch (e) {
																					toast.error(
																						e instanceof
																							Error
																							? e.message
																							: String(
																									e
																								)
																					)
																				}
																			})()
																		}}
																	>
																		Duyệt
																	</Button>
																	<Button
																		size='sm'
																		variant='outline'
																		onClick={() => {
																			const ex =
																				board.find(
																					(
																						b
																					) =>
																						b
																							.exam
																							.id ===
																						r.examId
																				)?.exam
																			if (
																				ex
																			) {
																				setSelected(
																					ex
																				)
																				setNote(
																					''
																				)
																			}
																		}}
																	>
																		Trả lại
																	</Button>
																</div>
															</TableCell>
														)}
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Dialog trả lại / duyệt đơn */}
			<Dialog
				open={!!selected}
				onOpenChange={(open) => {
					if (!open) {
						setSelected(null)
						setNote('')
					}
				}}
			>
				<DialogContent className='max-w-lg'>
					{selected && (
						<>
							<DialogHeader>
								<DialogTitle>Xử lý duyệt đề</DialogTitle>
								<DialogDescription asChild>
									<div className='space-y-2 text-left text-sm'>
										<p className='font-semibold text-foreground'>
											{selected.title}
										</p>
										<p className='font-mono text-xs'>
											{selected.code}
											{selected.paperNumber != null
												? ` · Đề số ${selected.paperNumber}`
												: ''}
										</p>
										<p className='rounded-md border border-primary/20 bg-primary/5 px-3 py-2'>
											{statusHint(selected.status)}
										</p>
									</div>
								</DialogDescription>
							</DialogHeader>
							{canActOnSelected && (
								<div className='space-y-3'>
									<div>
										<Label>Ghi chú</Label>
										<Textarea
											value={note}
											onChange={(e) =>
												setNote(e.target.value)
											}
											rows={3}
											className='mt-1'
										/>
									</div>
									<DialogFooter className='flex-col gap-2 sm:flex-col'>
										{hasMySignature &&
											needsSignatureForStatus(
												selected.status
											) && (
												<p className='text-muted-foreground w-full text-left text-xs'>
													Chữ ký số đã có — sẽ chèn
													vào bộ đề khi duyệt.{' '}
													<button
														type='button'
														className='text-primary underline'
														onClick={() => {
															setPendingApprove(
																null
															)
															setSigPreview(null)
															setSigDialogOpen(
																true
															)
														}}
													>
														Đổi chữ ký
													</button>
												</p>
											)}
										{!hasMySignature &&
											needsSignatureForStatus(
												selected.status
											) && (
												<p className='text-amber-700 w-full text-left text-xs'>
													Chưa có chữ ký số — bấm
													duyệt sẽ mở form tải ảnh,
													hoặc{' '}
													<button
														type='button'
														className='font-medium underline'
														onClick={() => {
															setPendingApprove(
																null
															)
															setSigDialogOpen(
																true
															)
														}}
													>
														tải chữ ký trước
													</button>
													.
												</p>
											)}
										<Button
											className='w-full bg-emerald-600 hover:bg-emerald-700'
											disabled={decideMut.isPending}
											onClick={() =>
												decideMut.mutate({
													id: selected.id,
													decision: 'APPROVE',
													note: note || undefined,
													status: selected.status
												})
											}
										>
											{approveLabel(selected.status)}
										</Button>
										<Button
											variant='outline'
											className='w-full'
											disabled={decideMut.isPending}
											onClick={() =>
												decideMut.mutate({
													id: selected.id,
													decision: 'RETURN',
													note: note || undefined,
													status: selected.status
												})
											}
										>
											{returnLabel(selected.status)}
										</Button>
									</DialogFooter>
								</div>
							)}
						</>
					)}
				</DialogContent>
			</Dialog>

			{/* Upload / đổi chữ ký — CNK, Hiệu trưởng, Phó HT, BGH */}
			<Dialog open={sigDialogOpen} onOpenChange={setSigDialogOpen}>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>
							{hasMySignature ? 'Đổi chữ ký số' : 'Tải chữ ký số'}
						</DialogTitle>
						<DialogDescription>
							Hiệu trưởng / Phó hiệu trưởng / BGH / CNK tải ảnh
							chữ ký (PNG/JPG, ≤ 1.5MB) để chèn vào bộ đề khi phê
							duyệt. Có thể tải hoặc đổi{' '}
							<strong>bất cứ lúc nào</strong> (trước hoặc sau khi
							duyệt).
						</DialogDescription>
					</DialogHeader>
					<div className='space-y-3'>
						{hasMySignature && !sigPreview && mySignatureUrl ? (
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
								void processSignatureFile(f)
									.then(setSigPreview)
									.catch((err: Error) =>
										toast.error(err.message)
									)
							}}
						/>
						<Button
							type='button'
							variant='outline'
							className='w-full'
							onClick={() => sigFileRef.current?.click()}
						>
							<Upload className='mr-2 h-4 w-4' />
							{sigPreview || hasMySignature
								? 'Chọn ảnh chữ ký mới'
								: 'Chọn ảnh chữ ký'}
						</Button>
						{sigPreview ? (
							<img
								src={sigPreview}
								alt='Xem chữ ký (đã bỏ nền)'
								className='mx-auto max-h-28 border bg-[repeating-conic-gradient(#e5e5e5_0%_25%,#fff_0%_50%)] bg-[length:12px_12px] p-2 object-contain'
							/>
						) : (
							!hasMySignature && (
								<p className='text-muted-foreground text-center text-xs'>
									Chưa chọn ảnh
								</p>
							)
						)}
					</div>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => {
								setSigDialogOpen(false)
								setPendingApprove(null)
								setSigPreview(null)
							}}
						>
							Đóng
						</Button>
						<Button
							disabled={!sigPreview || sigBusy}
							onClick={() => void saveSignatureAndContinue()}
						>
							{sigBusy && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							{pendingApprove
								? 'Lưu chữ ký & duyệt'
								: 'Lưu chữ ký'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Xuất mẫu C — form giấy như bang-de-mau-C-… */}
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
								? 'In bộ đề mẫu C'
								: 'Tải bộ đề mẫu C'}
						</DialogTitle>
						<DialogDescription>
							Form giấy{' '}
							<strong>BỘ CÂU HỎI - ĐÁP ÁN THI TỰ LUẬN</strong>
							{exportDialog?.examIds.length
								? ` · ${exportDialog.examIds.length} đề`
								: ''}{' '}
							(cùng layout file mẫu C). Chọn in kèm chữ ký số hay
							để trống ô để ký tay.
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-2 sm:grid-cols-2'>
						<Button
							disabled={exportBusy}
							onClick={() => void runExportFormC(true)}
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
							onClick={() => void runExportFormC(false)}
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
