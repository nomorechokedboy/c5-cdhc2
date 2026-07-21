/**
 * Rút đề (Ban Khảo thí):
 * - Mỗi lớp cần 2 phiếu: 1 Chẵn + 1 Lẻ (2 đề khác nhau trong ngân hàng)
 * - Rút Chẵn xong vẫn rút Lẻ được (và ngược lại)
 */
import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
	CheckCircle2,
	Download,
	Loader2,
	Search,
	Shuffle,
	XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import {
	DrawExam,
	GetExamDrawPool,
	ListExamClasses,
	ListExamDraws,
	ListExamMajors,
	ListExamSubjects,
	ListOverdueDraws,
	ListUsedExamVault,
	downloadDrawExport,
	printDrawExport,
	printDrawMinutes,
	type LookupExamByQrResult
} from '@/api/exam'
import ExamQrLookup from './ExamQrLookup'
import { canDrawExams } from '@/lib/exam-roles'
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function ExamDrawPage() {
	const qc = useQueryClient()
	const allowed = canDrawExams()
	const [majorId, setMajorId] = useState('')
	const [subjectId, setSubjectId] = useState('')
	const [drawType, setDrawType] = useState<'EVEN' | 'ODD'>('EVEN')
	const [classId, setClassId] = useState('')
	const [examDate, setExamDate] = useState('')
	const [examTime, setExamTime] = useState('')
	const [location, setLocation] = useState('')
	/** Kết quả rút gần nhất — chỉ metadata, không câu hỏi */
	const [lastDrawMeta, setLastDrawMeta] = useState<{
		drawCode: string
		drawType: string
		className: string | null
		examDate: string | null
		drawnAt: string
		id: number
		fileSaved: boolean
		paperNumber?: number | null
		examCode?: string | null
	} | null>(null)
	// Tra cứu: mã đề, ngày rút, lớp, …
	const [searchExamCode, setSearchExamCode] = useState('')
	const [searchDrawnDate, setSearchDrawnDate] = useState('')
	const [searchExamDate, setSearchExamDate] = useState('')
	const [searchClassId, setSearchClassId] = useState('')
	const [searchClassName, setSearchClassName] = useState('')
	const [searchDrawCode, setSearchDrawCode] = useState('')
	const [searchApplied, setSearchApplied] = useState(false)
	const [searchParams, setSearchParams] = useState<{
		examCode?: string
		drawnDate?: string
		examDate?: string
		classId?: number
		className?: string
		drawCode?: string
	} | null>(null)
	/** Kho đề đã in: tra cứu theo mã đề / mã bốc / nội dung QR */
	const [vaultQuery, setVaultQuery] = useState('')

	const majorsQ = useQuery({
		queryKey: ['exam-majors'],
		queryFn: () => ListExamMajors()
	})
	const subjectsQ = useQuery({
		queryKey: ['exam-subjects', majorId],
		queryFn: () =>
			ListExamSubjects(majorId ? { majorId: Number(majorId) } : undefined)
	})
	// Danh mục lớp thi (exam_classes) — không dùng lớp học viên
	const classesQ = useQuery({
		queryKey: ['exam-classes', majorId],
		queryFn: () =>
			ListExamClasses(majorId ? { majorId: Number(majorId) } : undefined)
	})
	const drawsQ = useQuery({
		queryKey: ['exam-draws'],
		queryFn: () => ListExamDraws(),
		enabled: allowed
	})
	const vaultQ = useQuery({
		queryKey: ['exam-used-vault', vaultQuery],
		queryFn: () =>
			ListUsedExamVault({
				printedOnly: true,
				q: vaultQuery.trim() || undefined
			}),
		enabled: allowed
	})
	const overdueQ = useQuery({
		queryKey: ['exam-draws-overdue'],
		queryFn: () => ListOverdueDraws(),
		enabled: allowed
	})
	const [qrVaultFilter, setQrVaultFilter] =
		useState<LookupExamByQrResult | null>(null)
	const [proctorName, setProctorName] = useState('')
	const [studentRep, setStudentRep] = useState('')

	const poolQ = useQuery({
		queryKey: ['exam-draw-pool', subjectId, classId],
		queryFn: () =>
			GetExamDrawPool({
				subjectId: Number(subjectId),
				classId: classId ? Number(classId) : undefined
			}),
		enabled: allowed && !!subjectId
	})

	const pool = poolQ.data

	// Gợi ý loại còn thiếu cho lớp
	useEffect(() => {
		if (!pool || !classId) return
		if (pool.classHasEven && !pool.classHasOdd) {
			setDrawType('ODD')
		} else if (!pool.classHasEven && pool.classHasOdd) {
			setDrawType('EVEN')
		}
	}, [pool?.classHasEven, pool?.classHasOdd, classId])

	const drawMut = useMutation({
		mutationFn: async () => {
			if (!classId) throw new Error('Chọn lớp thi')
			if (!examDate) {
				throw new Error(
					'Nhập ngày thi. Ngày thực hiện rút = ngày hệ thống (tự ghi). |Ngày thi − ngày rút| ≤ 3.'
				)
			}
			const d = await DrawExam({
				subjectId: Number(subjectId),
				drawType,
				classId: Number(classId),
				examDate,
				examTime: examTime || undefined,
				location: location || undefined
			})
			// Rút xong → in đề ngay (hộp thoại in) — trừ khi bị chặn
			if (!d.printBlocked) {
				await printDrawExport(d.id, 'questions')
			}
			return d
		},
		onSuccess: async (d) => {
			const other = d.drawType === 'EVEN' ? 'Lẻ' : 'Chẵn'
			setLastDrawMeta({
				drawCode: d.drawCode,
				drawType: d.drawType,
				className: d.className,
				examDate: d.examDate,
				drawnAt: d.drawnAt,
				id: d.id,
				fileSaved: true,
				paperNumber: d.paperNumber,
				examCode: d.examCode
			})
			toast.success(
				`Đã bốc — mã đề ${d.examCode || '—'} · mã bốc ${d.drawCode}` +
					(d.printBlocked
						? ' — không in (quá 3 ngày).'
						: ' — đang mở in đề (#1).') +
					(classId ? ` Tiếp: rút phiếu «${other}» cho lớp.` : '')
			)
			setDrawType(d.drawType === 'EVEN' ? 'ODD' : 'EVEN')
			void qc.invalidateQueries({ queryKey: ['exam-draws'] })
			void qc.invalidateQueries({ queryKey: ['exam-draw-pool'] })
			void qc.invalidateQueries({ queryKey: ['exam-used-vault'] })
			void qc.invalidateQueries({ queryKey: ['exam-draws-overdue'] })

			// Sau khi lớp đủ Chẵn + Lẻ → in biên bản bốc thăm (#2) với mã đề
			if (classId && subjectId) {
				try {
					const pool = await GetExamDrawPool({
						subjectId: Number(subjectId),
						classId: Number(classId)
					})
					const hasEven = pool.classHasEven || d.drawType === 'EVEN'
					const hasOdd = pool.classHasOdd || d.drawType === 'ODD'
					if (hasEven && hasOdd) {
						const draws = await ListExamDraws({
							subjectId: Number(subjectId),
							classId: Number(classId)
						})
						await printDrawMinutes({
							subjectId: Number(subjectId),
							classId: Number(classId),
							drawIds: draws.map((x) => x.id),
							location: location || undefined,
							proctorName: proctorName || undefined,
							studentName: studentRep || undefined
						})
						toast.message(
							'Đã đủ Chẵn + Lẻ — đang in biên bản bốc thăm đề thi (#2)',
							{ duration: 5000 }
						)
					}
				} catch {
					/* không chặn flow rút */
				}
			}
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const minutesMut = useMutation({
		mutationFn: async () => {
			if (!subjectId) throw new Error('Chọn môn học')
			const ids = classDraws.map((d) => d.id)
			return printDrawMinutes({
				subjectId: Number(subjectId),
				classId: classId ? Number(classId) : undefined,
				drawIds: ids.length ? ids : undefined,
				location: location || undefined,
				proctorName: proctorName || undefined,
				studentName: studentRep || undefined,
				studentClass:
					(classesQ.data || []).find((c) => String(c.id) === classId)
						?.name || undefined
			})
		},
		onSuccess: () => toast.success('Đang in biên bản bốc thăm đề thi'),
		onError: (e: Error) => toast.error(e.message)
	})

	const exportMut = useMutation({
		mutationFn: async ({
			id,
			kind
		}: {
			id: number
			kind: 'questions' | 'answers'
		}) => {
			await printDrawExport(id, kind)
			return { kind }
		},
		onSuccess: (v) => {
			toast.success(
				v.kind === 'answers' ? 'Đang in đáp án' : 'Đang in đề'
			)
			void qc.invalidateQueries({ queryKey: ['exam-used-vault'] })
			void qc.invalidateQueries({ queryKey: ['exam-draws'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	/** In đề rồi in đáp án (2 lần hộp thoại in) */
	const exportBothMut = useMutation({
		mutationFn: async (id: number) => {
			await printDrawExport(id, 'questions')
			await printDrawExport(id, 'answers')
			return id
		},
		onSuccess: () => {
			toast.success('Đã gửi in đề và đáp án')
			void qc.invalidateQueries({ queryKey: ['exam-used-vault'] })
			void qc.invalidateQueries({ queryKey: ['exam-draws'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const searchQ = useQuery({
		queryKey: ['exam-draws-search', searchParams],
		queryFn: () =>
			ListExamDraws({
				examCode: searchParams?.examCode || undefined,
				drawnDate: searchParams?.drawnDate || undefined,
				examDate: searchParams?.examDate || undefined,
				classId: searchParams?.classId,
				className: searchParams?.className || undefined,
				drawCode: searchParams?.drawCode || undefined
			}),
		enabled: allowed && searchApplied && !!searchParams
	})

	function runSearch() {
		const p = {
			examCode: searchExamCode.trim() || undefined,
			drawnDate: searchDrawnDate || undefined,
			examDate: searchExamDate || undefined,
			classId: searchClassId ? Number(searchClassId) : undefined,
			className: searchClassName.trim() || undefined,
			drawCode: searchDrawCode.trim() || undefined
		}
		const hasAny = Object.values(p).some((v) => v !== undefined && v !== '')
		if (!hasAny) {
			toast.error(
				'Nhập ít nhất một điều kiện: mã đề, mã bốc, ngày rút, lớp…'
			)
			return
		}
		setSearchParams(p)
		setSearchApplied(true)
	}

	function clearSearch() {
		setSearchExamCode('')
		setSearchDrawnDate('')
		setSearchExamDate('')
		setSearchClassId('')
		setSearchClassName('')
		setSearchDrawCode('')
		setSearchParams(null)
		setSearchApplied(false)
	}

	const alreadyHasThisType =
		!!classId &&
		pool &&
		((drawType === 'EVEN' && pool.classHasEven) ||
			(drawType === 'ODD' && pool.classHasOdd))

	const canSubmit =
		!!subjectId &&
		!!classId &&
		!!examDate &&
		!drawMut.isPending &&
		(pool?.availableCount ?? 0) > 0 &&
		!alreadyHasThisType

	const classDraws = useMemo(() => {
		if (!classId || !subjectId) return []
		const sid = Number(subjectId)
		const cid = Number(classId)
		return (drawsQ.data || []).filter(
			(d) => d.classId === cid && d.subjectId === sid
		)
	}, [drawsQ.data, classId, subjectId])

	if (!allowed) {
		return (
			<div className='p-6'>
				<p className='text-muted-foreground'>
					Chỉ Ban Khảo thí (cơ quan quản lý) được rút đề.
				</p>
			</div>
		)
	}

	const majors = majorsQ.data || []
	const subjects = subjectsQ.data || []
	const classList = classesQ.data || []
	const draws = drawsQ.data || []

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div>
				<h1 className='text-2xl font-semibold tracking-tight'>
					Rút đề thi
				</h1>
				<p className='text-muted-foreground text-sm'>
					Mỗi lớp cần <strong>2 phiếu</strong> (Chẵn + Lẻ) khi rút.
					Phiếu in chỉ ghi Chẵn/Lẻ (không lộ số đề).{' '}
					<strong>Lịch sử</strong> chỉ hiện mã đề + mã bốc;{' '}
					<strong>kho đã in</strong> hiện Chẵn/Lẻ và tra cứu bằng mã
					đề / mã bốc / QR.
				</p>
			</div>

			{lastDrawMeta && (
				<Card className='border-emerald-600/40 bg-emerald-500/5'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-base text-emerald-800 dark:text-emerald-300'>
							Đã bốc đề — đang in
						</CardTitle>
						<CardDescription>
							Chỉ hiện thông tin phiếu trên app. Chọn máy in trong
							hộp thoại in (hoặc Save as PDF).
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3 text-sm'>
						<div className='grid gap-2 sm:grid-cols-2'>
							<div>
								<span className='text-muted-foreground'>
									Mã đề:{' '}
								</span>
								<span className='font-mono text-base font-semibold'>
									{lastDrawMeta.examCode || '—'}
								</span>
							</div>
							<div>
								<span className='text-muted-foreground'>
									Mã bốc:{' '}
								</span>
								<span className='font-mono font-medium'>
									{lastDrawMeta.drawCode}
								</span>
							</div>
							<div>
								<span className='text-muted-foreground'>
									Lớp:{' '}
								</span>
								{lastDrawMeta.className || '—'}
							</div>
							<div>
								<span className='text-muted-foreground'>
									Ngày thi:{' '}
								</span>
								{lastDrawMeta.examDate || '—'}
							</div>
						</div>
						<div className='flex flex-wrap gap-2'>
							<Button
								size='sm'
								disabled={exportMut.isPending}
								onClick={() =>
									exportMut.mutate({
										id: lastDrawMeta.id,
										kind: 'questions'
									})
								}
							>
								In lại đề
							</Button>
							<Button
								size='sm'
								variant='outline'
								disabled={exportMut.isPending}
								onClick={() =>
									exportMut.mutate({
										id: lastDrawMeta.id,
										kind: 'answers'
									})
								}
							>
								In đáp án
							</Button>
							<Button
								size='sm'
								variant='outline'
								disabled={exportMut.isPending}
								onClick={() =>
									void downloadDrawExport(
										lastDrawMeta.id,
										'questions'
									).then(() =>
										toast.success('Đã tải file đề')
									)
								}
							>
								<Download className='mr-1 h-3.5 w-3.5' />
								Tải file đề
							</Button>
							<Button
								size='sm'
								variant='ghost'
								onClick={() => setLastDrawMeta(null)}
							>
								Đóng
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			<div className='grid gap-6 lg:grid-cols-1 max-w-2xl'>
				<Card>
					<CardHeader>
						<CardTitle className='flex items-center gap-2'>
							<Shuffle className='h-5 w-5' />
							Bốc đề
						</CardTitle>
						<CardDescription>
							Chọn môn → lớp → loại Chẵn/Lẻ → rút → in đề ngay
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3'>
						<div>
							<Label>Ngành đào tạo</Label>
							<Select
								value={majorId}
								onValueChange={(v) => {
									setMajorId(v)
									setSubjectId('')
									setClassId('')
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn ngành đào tạo' />
								</SelectTrigger>
								<SelectContent>
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
						<div>
							<Label>Môn học *</Label>
							<Select
								value={subjectId}
								onValueChange={setSubjectId}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn môn' />
								</SelectTrigger>
								<SelectContent>
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

						{/* Trạng thái pool */}
						{subjectId && pool && (
							<div className='rounded-lg border bg-muted/40 p-3 text-sm space-y-1'>
								<div>
									Ngân hàng môn này:{' '}
									<strong>{pool.approvedTotal}</strong> đề đã
									duyệt · đã bốc{' '}
									<strong>{pool.usedCount}</strong> · còn rút
									được{' '}
									<strong
										className={
											pool.availableCount < 2
												? 'text-amber-600'
												: 'text-emerald-600'
										}
									>
										{pool.availableCount}
									</strong>
								</div>
								{pool.availableCount < 2 && (
									<p className='text-amber-700 dark:text-amber-400 text-xs'>
										Cần ít nhất 2 đề chưa bốc để đủ 1 lớp
										(Chẵn + Lẻ). Hiện còn{' '}
										{pool.availableCount} — hãy duyệt thêm
										đề vào ngân hàng nếu thiếu.
									</p>
								)}
							</div>
						)}

						<div>
							<Label>Lớp thi (danh mục) *</Label>
							<Select
								value={classId || 'none'}
								onValueChange={(v) =>
									setClassId(v === 'none' ? '' : v)
								}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn lớp danh mục' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='none'>
										— Chọn lớp —
									</SelectItem>
									{classList.map((c) => (
										<SelectItem
											key={c.id}
											value={String(c.id)}
										>
											{c.code} — {c.name}
											{c.cohort ? ` (${c.cohort})` : ''}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className='text-muted-foreground mt-1 text-xs'>
								Quản lý tại Đề thi → Danh mục (không dùng lớp
								học viên).
							</p>
						</div>

						{/* Checklist Chẵn / Lẻ theo lớp */}
						{classId && subjectId && pool && (
							<div className='grid grid-cols-2 gap-2'>
								<div
									className={cn(
										'flex items-center gap-2 rounded-md border p-2 text-sm',
										pool.classHasEven
											? 'border-emerald-500/40 bg-emerald-500/10'
											: 'border-dashed'
									)}
								>
									{pool.classHasEven ? (
										<CheckCircle2 className='h-4 w-4 text-emerald-600' />
									) : (
										<XCircle className='text-muted-foreground h-4 w-4' />
									)}
									<span>
										Đề <strong>Chẵn</strong>
										{pool.classHasEven
											? ' — đã rút'
											: ' — chưa'}
									</span>
								</div>
								<div
									className={cn(
										'flex items-center gap-2 rounded-md border p-2 text-sm',
										pool.classHasOdd
											? 'border-emerald-500/40 bg-emerald-500/10'
											: 'border-dashed'
									)}
								>
									{pool.classHasOdd ? (
										<CheckCircle2 className='h-4 w-4 text-emerald-600' />
									) : (
										<XCircle className='text-muted-foreground h-4 w-4' />
									)}
									<span>
										Đề <strong>Lẻ</strong>
										{pool.classHasOdd
											? ' — đã rút'
											: ' — chưa'}
									</span>
								</div>
								{classDraws.length > 0 && (
									<div className='text-muted-foreground col-span-2 text-xs'>
										Đã bốc cho lớp:{' '}
										{classDraws
											.map(
												(d) =>
													`${d.examCode || '?'} (${d.drawCode})`
											)
											.join(' · ')}
									</div>
								)}
							</div>
						)}

						<div>
							<Label>Loại đề lần này *</Label>
							<Select
								value={drawType}
								onValueChange={(v) =>
									setDrawType(v as 'EVEN' | 'ODD')
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='EVEN'>
										Chẵn
										{pool?.classHasEven
											? ' (lớp đã có)'
											: ''}
									</SelectItem>
									<SelectItem value='ODD'>
										Lẻ
										{pool?.classHasOdd
											? ' (lớp đã có)'
											: ''}
									</SelectItem>
								</SelectContent>
							</Select>
							{alreadyHasThisType && (
								<p className='text-destructive mt-1 text-xs'>
									Lớp này đã có đề{' '}
									{drawType === 'EVEN' ? 'Chẵn' : 'Lẻ'}. Hãy
									chọn loại còn lại.
								</p>
							)}
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<Label>Ngày thi *</Label>
								<Input
									type='date'
									value={examDate}
									onChange={(e) =>
										setExamDate(e.target.value)
									}
								/>
								<p className='text-muted-foreground mt-1 text-[11px]'>
									|Ngày thi − ngày rút| ≤ 3 ngày. Ngày rút =
									ngày hệ thống khi bấm rút.
								</p>
							</div>
							<div>
								<Label>Giờ thi</Label>
								<Input
									value={examTime}
									onChange={(e) =>
										setExamTime(e.target.value)
									}
									placeholder='08:00'
								/>
							</div>
						</div>
						<div>
							<Label>Địa điểm thi</Label>
							<Input
								value={location}
								onChange={(e) => setLocation(e.target.value)}
								placeholder='Phòng thi…'
							/>
						</div>
						<div className='grid grid-cols-2 gap-3'>
							<div>
								<Label>Cán bộ coi thi (biên bản)</Label>
								<Input
									value={proctorName}
									onChange={(e) =>
										setProctorName(e.target.value)
									}
									placeholder='Họ tên'
								/>
							</div>
							<div>
								<Label>Đại diện HV (biên bản)</Label>
								<Input
									value={studentRep}
									onChange={(e) =>
										setStudentRep(e.target.value)
									}
									placeholder='Họ tên'
								/>
							</div>
						</div>
						<Button
							className='w-full'
							disabled={!canSubmit || !classId}
							onClick={() => drawMut.mutate()}
						>
							{drawMut.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Rút đề {drawType === 'EVEN' ? 'Chẵn' : 'Lẻ'} & in
							ngay
						</Button>
						<Button
							className='w-full'
							variant='secondary'
							disabled={!subjectId || minutesMut.isPending}
							onClick={() => minutesMut.mutate()}
						>
							{minutesMut.isPending && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							In biên bản bốc thăm đề thi
						</Button>
						{!classId && (
							<p className='text-muted-foreground text-center text-xs'>
								Chọn lớp để theo dõi đủ cặp Chẵn + Lẻ
							</p>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Tra cứu theo mã đề / ngày rút / lớp… → in đề + đáp án */}
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2'>
						<Search className='h-5 w-5' />
						Tra cứu phiếu bốc đề
					</CardTitle>
					<CardDescription>
						Tìm theo mã đề, ngày rút, lớp thi… rồi in đề / đáp án
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
						<div className='space-y-1.5'>
							<Label>Mã đề</Label>
							<Input
								placeholder='VD: DT-RUTDE-…'
								value={searchExamCode}
								onChange={(e) =>
									setSearchExamCode(e.target.value)
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Ngày rút đề</Label>
							<Input
								type='date'
								value={searchDrawnDate}
								onChange={(e) =>
									setSearchDrawnDate(e.target.value)
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Lớp thi (chọn)</Label>
							<Select
								value={searchClassId || 'none'}
								onValueChange={(v) => {
									setSearchClassId(v === 'none' ? '' : v)
									if (v !== 'none') {
										const c = classList.find(
											(x) => String(x.id) === v
										)
										if (c) setSearchClassName(c.name)
									}
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Tất cả lớp' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='none'>
										— Tất cả / gõ tên —
									</SelectItem>
									{classList.map((c) => (
										<SelectItem
											key={c.id}
											value={String(c.id)}
										>
											{c.code} — {c.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-1.5'>
							<Label>Tên lớp (gõ)</Label>
							<Input
								placeholder='VD: Đại đội 2'
								value={searchClassName}
								onChange={(e) =>
									setSearchClassName(e.target.value)
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Ngày thi</Label>
							<Input
								type='date'
								value={searchExamDate}
								onChange={(e) =>
									setSearchExamDate(e.target.value)
								}
							/>
						</div>
						<div className='space-y-1.5'>
							<Label>Mã bốc đề</Label>
							<Input
								placeholder='VD: BD-…'
								value={searchDrawCode}
								onChange={(e) =>
									setSearchDrawCode(e.target.value)
								}
							/>
						</div>
						<div className='flex items-end gap-2'>
							<Button
								className='flex-1'
								onClick={runSearch}
								disabled={searchQ.isFetching}
							>
								{searchQ.isFetching ? (
									<Loader2 className='mr-2 h-4 w-4 animate-spin' />
								) : (
									<Search className='mr-2 h-4 w-4' />
								)}
								Tìm kiếm
							</Button>
							<Button
								type='button'
								variant='outline'
								onClick={clearSearch}
							>
								Xóa
							</Button>
						</div>
					</div>

					{searchApplied && (
						<div className='space-y-2'>
							<p className='text-muted-foreground text-sm'>
								{searchQ.isLoading
									? 'Đang tìm…'
									: `Kết quả: ${searchQ.data?.length ?? 0} phiếu`}
							</p>
							{searchQ.isError && (
								<p className='text-destructive text-sm'>
									{(searchQ.error as Error).message}
								</p>
							)}
							{!searchQ.isLoading &&
								(searchQ.data?.length ?? 0) === 0 && (
									<p className='text-muted-foreground text-sm'>
										Không tìm thấy — thử nới điều kiện (mã
										đề / ngày rút / lớp).
									</p>
								)}
							{(searchQ.data?.length ?? 0) > 0 && (
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Mã đề</TableHead>
											<TableHead>Mã bốc</TableHead>
											<TableHead>Lớp</TableHead>
											<TableHead>Ngày rút</TableHead>
											<TableHead>Ngày thi</TableHead>
											<TableHead>Môn</TableHead>
											<TableHead className='text-right'>
												In
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{(searchQ.data || []).map((d) => (
											<TableRow key={d.id}>
												<TableCell className='font-mono text-xs'>
													{d.examCode}
												</TableCell>
												<TableCell className='font-mono text-xs'>
													{d.drawCode}
												</TableCell>
												<TableCell className='text-sm'>
													{d.className || '—'}
												</TableCell>
												<TableCell className='text-xs whitespace-nowrap'>
													{d.drawnAt}
												</TableCell>
												<TableCell className='text-xs'>
													{d.examDate || '—'}
												</TableCell>
												<TableCell className='text-sm'>
													{d.subjectCode}
												</TableCell>
												<TableCell className='space-x-1 text-right whitespace-nowrap'>
													<Button
														size='sm'
														variant='outline'
														disabled={
															exportMut.isPending ||
															exportBothMut.isPending
														}
														onClick={() =>
															exportMut.mutate({
																id: d.id,
																kind: 'questions'
															})
														}
													>
														In đề
													</Button>
													<Button
														size='sm'
														variant='outline'
														disabled={
															exportMut.isPending ||
															exportBothMut.isPending
														}
														onClick={() =>
															exportMut.mutate({
																id: d.id,
																kind: 'answers'
															})
														}
													>
														In đáp án
													</Button>
													<Button
														size='sm'
														disabled={
															exportMut.isPending ||
															exportBothMut.isPending
														}
														onClick={() =>
															exportBothMut.mutate(
																d.id
															)
														}
													>
														In cả hai
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Kho đề đã in — hiện Chẵn/Lẻ; tra cứu mã đề / mã bốc / QR */}
			<Card>
				<CardHeader>
					<CardTitle>Kho đề đã sử dụng (đã in)</CardTitle>
					<CardDescription>
						Phiếu đã xuất in — biết <strong>Chẵn / Lẻ</strong>. Tra
						cứu bằng <strong>mã đề</strong>, <strong>mã bốc</strong>{' '}
						hoặc <strong>QR</strong> để ra đúng đề đã in.
					</CardDescription>
				</CardHeader>
				<CardContent className='space-y-4'>
					<div className='flex flex-wrap items-end gap-2'>
						<div className='min-w-[220px] flex-1 space-y-1.5'>
							<Label>Tìm theo mã đề / mã bốc / QR text</Label>
							<div className='relative'>
								<Search className='text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2' />
								<Input
									className='pl-9'
									placeholder='VD: DT-TTHCM-… hoặc BD-… hoặc EXAM:…'
									value={vaultQuery}
									onChange={(e) =>
										setVaultQuery(e.target.value)
									}
								/>
							</div>
						</div>
						{vaultQuery && (
							<Button
								type='button'
								variant='outline'
								onClick={() => setVaultQuery('')}
							>
								Xóa lọc mã
							</Button>
						)}
						{qrVaultFilter && (
							<Button
								type='button'
								variant='outline'
								onClick={() => setQrVaultFilter(null)}
							>
								Bỏ lọc QR
							</Button>
						)}
					</div>
					<ExamQrLookup
						variant='full'
						onResult={(r) => {
							setQrVaultFilter(r)
							// Đồng bộ ô tìm với mã đề / mã bốc từ phiếu đang dùng
							const code =
								r.activeUse?.drawCode ||
								r.exam?.code ||
								r.exam?.qrCode ||
								''
							if (code) setVaultQuery(code)
						}}
					/>
					{vaultQ.isLoading ? (
						<div className='flex justify-center py-6'>
							<Loader2 className='h-5 w-5 animate-spin' />
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Phiếu in</TableHead>
									<TableHead>Mã đề</TableHead>
									<TableHead>Mã bốc</TableHead>
									<TableHead>Lớp</TableHead>
									<TableHead>In lúc</TableHead>
									<TableHead className='text-right'>
										In lại
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(() => {
									const rows = (vaultQ.data || []).filter(
										(d) => {
											if (!qrVaultFilter) return true
											// QR → khớp examId hoặc mã bốc phiếu đang dùng
											if (
												d.examId ===
												qrVaultFilter.exam.id
											)
												return true
											const useCode =
												qrVaultFilter.activeUse
													?.drawCode
											if (
												useCode &&
												d.drawCode === useCode
											)
												return true
											return false
										}
									)
									if (!rows.length) {
										return (
											<TableRow>
												<TableCell
													colSpan={6}
													className='text-muted-foreground text-center'
												>
													{qrVaultFilter ||
													vaultQuery.trim()
														? 'Không thấy phiếu in khớp mã / QR — kiểm tra đã in chưa'
														: 'Chưa có đề đã in — rút + in sẽ vào kho này'}
												</TableCell>
											</TableRow>
										)
									}
									return rows.map((d) => (
										<TableRow key={d.id}>
											<TableCell>
												<Badge
													variant={
														d.drawType === 'EVEN'
															? 'default'
															: 'secondary'
													}
												>
													{d.drawType === 'EVEN'
														? 'Chẵn'
														: 'Lẻ'}
												</Badge>
											</TableCell>
											<TableCell className='font-mono text-xs font-semibold'>
												{d.examCode || '—'}
											</TableCell>
											<TableCell className='font-mono text-xs'>
												{d.drawCode}
											</TableCell>
											<TableCell className='text-sm'>
												{d.className || '—'}
											</TableCell>
											<TableCell className='text-xs'>
												{d.printedAt || '—'}
											</TableCell>
											<TableCell className='text-right'>
												<Button
													size='sm'
													variant='ghost'
													onClick={() =>
														exportMut.mutate({
															id: d.id,
															kind: 'questions'
														})
													}
												>
													In đề
												</Button>
											</TableCell>
										</TableRow>
									))
								})()}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Lịch sử bốc đề</CardTitle>
					<CardDescription>
						Chỉ hiện <strong>mã đề</strong> và{' '}
						<strong>mã bốc</strong> (không hiện chẵn/lẻ — xem kho đã
						in). Phiếu quá 3 ngày kể từ ngày rút → không cho in.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{drawsQ.isLoading ? (
						<div className='flex justify-center py-8'>
							<Loader2 className='h-6 w-6 animate-spin' />
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mã đề</TableHead>
									<TableHead>Mã bốc</TableHead>
									<TableHead>Lớp</TableHead>
									<TableHead>Ngày rút</TableHead>
									<TableHead>Đã in</TableHead>
									<TableHead className='text-right'>
										In
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{draws.map((d) => (
									<TableRow key={d.id}>
										<TableCell className='font-mono text-xs font-semibold'>
											{d.examCode || '—'}
										</TableCell>
										<TableCell className='font-mono text-xs'>
											{d.drawCode}
										</TableCell>
										<TableCell className='text-sm'>
											{d.className || '—'}
										</TableCell>
										<TableCell className='text-xs whitespace-nowrap'>
											{d.drawnAt}
											{d.printBlocked ||
											(d.daysSinceDraw != null &&
												d.daysSinceDraw > 3) ? (
												<Badge
													variant='destructive'
													className='ml-1'
												>
													Quá 3 ngày
												</Badge>
											) : null}
										</TableCell>
										<TableCell className='text-xs'>
											{d.printedAt ? (
												<span className='text-emerald-700'>
													{d.printedAt}
												</span>
											) : (
												'—'
											)}
										</TableCell>
										<TableCell className='space-x-1 text-right'>
											<Button
												size='sm'
												variant='ghost'
												disabled={
													exportMut.isPending ||
													!!d.printBlocked ||
													(d.daysSinceDraw != null &&
														d.daysSinceDraw > 3)
												}
												title={
													d.printBlockedReason ||
													undefined
												}
												onClick={() =>
													exportMut.mutate({
														id: d.id,
														kind: 'questions'
													})
												}
											>
												In đề
											</Button>
											<Button
												size='sm'
												variant='ghost'
												disabled={
													exportMut.isPending ||
													!!d.printBlocked ||
													(d.daysSinceDraw != null &&
														d.daysSinceDraw > 3)
												}
												onClick={() =>
													exportMut.mutate({
														id: d.id,
														kind: 'answers'
													})
												}
											>
												In đáp án
											</Button>
										</TableCell>
									</TableRow>
								))}
								{!draws.length && (
									<TableRow>
										<TableCell
											colSpan={6}
											className='text-muted-foreground text-center'
										>
											Chưa có lịch sử bốc đề
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Đề đã rút quá 3 ngày — không cho in */}
			<Card className='border-destructive/40'>
				<CardHeader>
					<CardTitle className='text-destructive'>
						Đề đã rút quá 3 ngày
					</CardTitle>
					<CardDescription>
						Không cho in. Cần rút lại hoặc xử lý theo quy chế.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{overdueQ.isLoading ? (
						<div className='flex justify-center py-6'>
							<Loader2 className='h-5 w-5 animate-spin' />
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Mã đề</TableHead>
									<TableHead>Mã bốc</TableHead>
									<TableHead>Lớp</TableHead>
									<TableHead>Ngày rút</TableHead>
									<TableHead>Số ngày</TableHead>
									<TableHead>Lý do</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{(overdueQ.data || []).map((d) => (
									<TableRow key={d.id}>
										<TableCell className='font-mono text-xs'>
											{d.examCode || '—'}
										</TableCell>
										<TableCell className='font-mono text-xs'>
											{d.drawCode}
										</TableCell>
										<TableCell>
											{d.className || '—'}
										</TableCell>
										<TableCell className='text-xs whitespace-nowrap'>
											{d.drawnAt}
										</TableCell>
										<TableCell>
											{d.daysSinceDraw ?? '—'}
										</TableCell>
										<TableCell className='text-xs text-destructive'>
											{d.printBlockedReason ||
												'Quá 3 ngày'}
										</TableCell>
									</TableRow>
								))}
								{!(overdueQ.data || []).length && (
									<TableRow>
										<TableCell
											colSpan={6}
											className='text-muted-foreground text-center'
										>
											Không có phiếu quá hạn
										</TableCell>
									</TableRow>
								)}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
