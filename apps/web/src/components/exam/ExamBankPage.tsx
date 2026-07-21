/**
 * Ngân hàng đề đã phê duyệt — lọc theo ngành / môn / từ khóa / QR
 * In: tick chọn nhiều đề → bấm In đã chọn
 */
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
	Download,
	Eye,
	Loader2,
	Printer,
	QrCode,
	Search,
	X
} from 'lucide-react'
import { toast } from 'sonner'
import {
	ListExamMajors,
	ListExamSubjects,
	ListExams,
	downloadExamPackage,
	downloadExamPackageSelected,
	printExamPackage,
	printExamPackageSelected,
	type LookupExamByQrResult
} from '@/api/exam'
import ExamQrLookup from './ExamQrLookup'
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'

export default function ExamBankPage() {
	const [majorId, setMajorId] = useState<string>('all')
	const [subjectId, setSubjectId] = useState<string>('all')
	const [keyword, setKeyword] = useState('')
	const [qrHit, setQrHit] = useState<LookupExamByQrResult | null>(null)
	const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set())
	const [printBusy, setPrintBusy] = useState(false)
	/** Hỏi có ký / không ký trước khi in hoặc tải */
	const [signDialog, setSignDialog] = useState<{
		mode: 'print' | 'download'
		/** null = selectedIds; number = 1 đề */
		examId: number | null
	} | null>(null)

	const majorsQ = useQuery({
		queryKey: ['exam-majors'],
		queryFn: () => ListExamMajors()
	})
	const subjectsQ = useQuery({
		queryKey: ['exam-subjects', majorId],
		queryFn: () =>
			ListExamSubjects(
				majorId !== 'all' ? { majorId: Number(majorId) } : undefined
			)
	})

	const bankQ = useQuery({
		queryKey: ['exam-bank', majorId, subjectId],
		queryFn: () =>
			ListExams({
				bank: true,
				majorId: majorId !== 'all' ? Number(majorId) : undefined,
				subjectId: subjectId !== 'all' ? Number(subjectId) : undefined
			}),
		refetchOnMount: 'always',
		staleTime: 0
	})

	const majors = majorsQ.data || []
	const subjects = subjectsQ.data || []
	const rawExams = bankQ.data || []

	const exams = useMemo(() => {
		let list = rawExams
		if (qrHit?.exam?.id) {
			list = list.filter((e) => e.id === qrHit.exam.id)
			if (!list.length) {
				list = [qrHit.exam]
			}
		}
		const kw = keyword.trim().toLowerCase()
		if (!kw) return list
		return list.filter((e) => {
			const hay = [
				e.code,
				e.title,
				e.subjectCode,
				e.subjectName,
				e.majorCode,
				e.majorName,
				e.approvedByDisplayName,
				e.qrCode,
				e.paperNumber != null ? String(e.paperNumber) : ''
			]
				.filter(Boolean)
				.join(' ')
				.toLowerCase()
			return hay.includes(kw)
		})
	}, [rawExams, keyword, qrHit])

	const approvedVisible = useMemo(
		() => exams.filter((e) => e.status === 'APPROVED'),
		[exams]
	)

	const allVisibleSelected =
		approvedVisible.length > 0 &&
		approvedVisible.every((e) => checkedIds.has(e.id))

	function clearFilters() {
		setMajorId('all')
		setSubjectId('all')
		setKeyword('')
		setQrHit(null)
		setCheckedIds(new Set())
	}

	function toggleOne(id: number) {
		setCheckedIds((prev) => {
			const next = new Set(prev)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})
	}

	function toggleAllVisible() {
		if (allVisibleSelected) {
			setCheckedIds((prev) => {
				const next = new Set(prev)
				for (const e of approvedVisible) next.delete(e.id)
				return next
			})
		} else {
			setCheckedIds((prev) => {
				const next = new Set(prev)
				for (const e of approvedVisible) next.add(e.id)
				return next
			})
		}
	}

	const selectedIds = useMemo(
		() =>
			[...checkedIds].filter((id) =>
				approvedVisible.some((e) => e.id === id)
			),
		[checkedIds, approvedVisible]
	)

	function openSignDialog(
		mode: 'print' | 'download',
		examId: number | null = null
	) {
		if (examId == null && !selectedIds.length) {
			toast.error(
				mode === 'print'
					? 'Chọn ít nhất 1 đề đã phê duyệt để in'
					: 'Chọn ít nhất 1 đề đã phê duyệt để tải'
			)
			return
		}
		setSignDialog({ mode, examId })
	}

	async function runWithSignatures(withSignatures: boolean) {
		if (!signDialog) return
		const { mode, examId } = signDialog
		setPrintBusy(true)
		setSignDialog(null)
		try {
			if (examId != null) {
				if (mode === 'print') {
					await printExamPackage(examId, { withSignatures })
					toast.success(
						withSignatures
							? 'Đang in bộ đề (có chữ ký số)'
							: 'Đang in bộ đề (không ký — để ký tay)'
					)
				} else {
					const r = await downloadExamPackage(examId, {
						withSignatures
					})
					toast.success(`Đã tải ${r.filename}`)
				}
			} else {
				if (mode === 'print') {
					const r = await printExamPackageSelected(selectedIds, {
						withSignatures
					})
					toast.success(
						`Đang in ${r.paperCount} đề` +
							(withSignatures ? ' (có chữ ký số)' : ' (không ký)')
					)
				} else {
					const r = await downloadExamPackageSelected(selectedIds, {
						withSignatures
					})
					toast.success(`Đã tải ${r.paperCount} đề (${r.filename})`)
				}
			}
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Không thực hiện được')
		} finally {
			setPrintBusy(false)
		}
	}

	const hasFilter =
		majorId !== 'all' ||
		subjectId !== 'all' ||
		keyword.trim() !== '' ||
		!!qrHit

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div>
				<h1 className='text-2xl font-semibold tracking-tight'>
					Ngân hàng đề thi
				</h1>
				<p className='text-muted-foreground text-sm'>
					Đề đã <strong>BGH phê duyệt cuối</strong> (tự tạo QR + khóa)
					mới vào đây. Đề <strong>trùng</strong> (cùng môn + số đề) tự
					loại — chỉ giữ bản mới nhất. <strong>Tick chọn đề</strong>{' '}
					cần in → bấm <strong>In đã chọn</strong>. Khi in/tải sẽ hỏi{' '}
					<strong>có ký</strong> hoặc <strong>không ký</strong>.
				</p>
			</div>

			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='flex items-center gap-2 text-base'>
						<Search className='h-5 w-5' />
						Tìm đề đã sử dụng / trong kho
					</CardTitle>
					<CardDescription>
						Nhập hoặc dán <strong>mã đề</strong> (vd DT-…) — chỉ dò
						theo mã, xem đã bốc/in lớp nào.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ExamQrLookup
						variant='full'
						onResult={(r) => setQrHit(r)}
					/>
				</CardContent>
			</Card>

			<Card>
				<CardHeader className='flex flex-col gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between'>
					<div>
						<CardTitle>Đề trong ngân hàng</CardTitle>
						<CardDescription>
							{bankQ.isLoading
								? 'Đang tải…'
								: hasFilter
									? `Hiển thị ${exams.length} / ${rawExams.length} đề (đã lọc)`
									: `${exams.length} đề`}
							{selectedIds.length > 0
								? ` · Đã chọn ${selectedIds.length}`
								: ''}
						</CardDescription>
					</div>
					<div className='flex flex-wrap gap-2'>
						<Button
							variant='default'
							disabled={printBusy || selectedIds.length === 0}
							onClick={() => openSignDialog('print')}
						>
							{printBusy ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : (
								<Printer className='mr-2 h-4 w-4' />
							)}
							In đã chọn
							{selectedIds.length
								? ` (${selectedIds.length})`
								: ''}
						</Button>
						<Button
							variant='outline'
							disabled={printBusy || selectedIds.length === 0}
							onClick={() => openSignDialog('download')}
						>
							<Download className='mr-2 h-4 w-4' />
							Tải đã chọn
						</Button>
						{selectedIds.length > 0 && (
							<Button
								variant='ghost'
								size='sm'
								onClick={() => setCheckedIds(new Set())}
							>
								Bỏ chọn
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className='space-y-4'>
					{/* Bộ lọc */}
					<div className='grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4'>
						<div className='space-y-1.5'>
							<Label>Ngành học</Label>
							<Select
								value={majorId}
								onValueChange={(v) => {
									setMajorId(v)
									setSubjectId('all')
									setCheckedIds(new Set())
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Tất cả ngành đào tạo' />
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
								value={subjectId}
								onValueChange={(v) => {
									setSubjectId(v)
									setCheckedIds(new Set())
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Tất cả môn' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='all'>
										Tất cả môn
										{majorId !== 'all'
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
						<div className='space-y-1.5 sm:col-span-2 lg:col-span-1'>
							<Label>Tìm nhanh</Label>
							<div className='relative'>
								<Search className='text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2' />
								<Input
									className='pl-9'
									placeholder='Mã đề, tiêu đề, tên ngành/môn…'
									value={keyword}
									onChange={(e) => setKeyword(e.target.value)}
								/>
							</div>
						</div>
						<div className='flex items-end'>
							<Button
								type='button'
								variant='outline'
								className='w-full'
								disabled={
									!hasFilter && selectedIds.length === 0
								}
								onClick={clearFilters}
							>
								<X className='mr-1 h-4 w-4' />
								Xóa lọc
							</Button>
						</div>
					</div>

					{bankQ.isError ? (
						<div className='rounded-md border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive'>
							Không tải được ngân hàng đề:{' '}
							{(bankQ.error as Error)?.message || 'lỗi mạng'}
						</div>
					) : bankQ.isLoading ? (
						<div className='flex justify-center py-10'>
							<Loader2 className='h-6 w-6 animate-spin' />
						</div>
					) : exams.length === 0 ? (
						<div className='text-muted-foreground rounded-md border border-dashed px-4 py-10 text-center text-sm'>
							<p className='font-medium'>
								Chưa có đề trong ngân hàng
							</p>
							<p className='mt-1 text-xs'>
								Chỉ đề BGH phê duyệt cuối (status Đã phê duyệt +
								QR + khóa) mới hiện ở đây và mới được in bộ đề.
							</p>
						</div>
					) : (
						<div className='overflow-x-auto rounded-md border'>
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className='w-10'>
											<Checkbox
												checked={
													allVisibleSelected
														? true
														: selectedIds.length > 0
															? 'indeterminate'
															: false
												}
												onCheckedChange={() =>
													toggleAllVisible()
												}
												aria-label='Chọn tất cả đề đang hiện'
											/>
										</TableHead>
										<TableHead>Mã đề</TableHead>
										<TableHead>Tiêu đề</TableHead>
										<TableHead>Môn</TableHead>
										<TableHead>Ngành</TableHead>
										<TableHead className='whitespace-nowrap'>
											Thời gian import
										</TableHead>
										<TableHead>Đề số</TableHead>
										<TableHead>QR</TableHead>
										<TableHead>Câu hỏi</TableHead>
										<TableHead className='text-right'>
											Thao tác
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{exams.map((e) => {
										const canSelect =
											e.status === 'APPROVED'
										return (
											<TableRow
												key={e.id}
												className={
													checkedIds.has(e.id)
														? 'bg-emerald-50/70 dark:bg-emerald-950/20'
														: undefined
												}
											>
												<TableCell>
													<Checkbox
														disabled={!canSelect}
														checked={checkedIds.has(
															e.id
														)}
														onCheckedChange={() =>
															canSelect &&
															toggleOne(e.id)
														}
														aria-label={`Chọn ${e.code}`}
													/>
												</TableCell>
												<TableCell className='font-mono text-xs'>
													{e.code}
												</TableCell>
												<TableCell>{e.title}</TableCell>
												<TableCell className='text-sm'>
													<div className='font-medium'>
														{e.subjectCode}
													</div>
													<div className='text-muted-foreground text-xs'>
														{e.subjectName}
													</div>
												</TableCell>
												<TableCell className='text-sm'>
													<div className='font-medium'>
														{e.majorCode}
													</div>
													<div className='text-muted-foreground text-xs'>
														{e.majorName}
													</div>
												</TableCell>
												<TableCell className='text-muted-foreground whitespace-nowrap text-xs'>
													{formatImportTime(
														e.createdAt
													)}
												</TableCell>
												<TableCell className='font-mono font-semibold'>
													{e.paperNumber ?? '—'}
												</TableCell>
												<TableCell>
													{e.qrCode ? (
														<Badge
															variant='outline'
															className='gap-1'
														>
															<QrCode className='h-3 w-3' />
															Có QR
														</Badge>
													) : (
														'—'
													)}
												</TableCell>
												<TableCell>
													{e.questionCount ?? 0}
												</TableCell>
												<TableCell className='space-x-1 text-right whitespace-nowrap'>
													<Button size='sm' asChild>
														<Link
															to='/de-thi/chi-tiet/$id'
															params={{
																id: String(e.id)
															}}
														>
															<Eye className='mr-1 h-3.5 w-3.5' />
															Xem
														</Link>
													</Button>
													{canSelect && (
														<>
															<Button
																size='sm'
																variant='secondary'
																title='In riêng đề này — hỏi có ký / không ký'
																disabled={
																	printBusy
																}
																onClick={() =>
																	openSignDialog(
																		'print',
																		e.id
																	)
																}
															>
																<Printer className='mr-1 h-3.5 w-3.5' />
																In
															</Button>
															<Button
																size='sm'
																variant='outline'
																title='Tải riêng đề này — hỏi có ký / không ký'
																disabled={
																	printBusy
																}
																onClick={() =>
																	openSignDialog(
																		'download',
																		e.id
																	)
																}
															>
																<Download className='mr-1 h-3.5 w-3.5' />
																Tải
															</Button>
														</>
													)}
												</TableCell>
											</TableRow>
										)
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<Dialog
				open={!!signDialog}
				onOpenChange={(v) => {
					if (!v) setSignDialog(null)
				}}
			>
				<DialogContent className='max-w-md'>
					<DialogHeader>
						<DialogTitle>
							{signDialog?.mode === 'print'
								? 'In bộ đề'
								: 'Tải bộ đề'}
						</DialogTitle>
						<DialogDescription>
							Form giấy <strong>BỘ CÂU HỎI - ĐÁP ÁN</strong> kèm ô
							phê duyệt BGH, chủ nhiệm khoa, giảng viên. Chọn in
							kèm chữ ký số hay để trống để ký tay.
						</DialogDescription>
					</DialogHeader>
					<div className='grid gap-2 sm:grid-cols-2'>
						<Button
							disabled={printBusy}
							onClick={() => void runWithSignatures(true)}
						>
							{printBusy ? (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							) : signDialog?.mode === 'print' ? (
								<Printer className='mr-2 h-4 w-4' />
							) : (
								<Download className='mr-2 h-4 w-4' />
							)}
							Có ký (chữ ký số)
						</Button>
						<Button
							variant='outline'
							disabled={printBusy}
							onClick={() => void runWithSignatures(false)}
						>
							Không ký (ký tay)
						</Button>
					</div>
					<DialogFooter>
						<Button
							variant='ghost'
							onClick={() => setSignDialog(null)}
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
