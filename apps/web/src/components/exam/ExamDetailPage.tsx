/**
 * Chi tiết đề + lịch sử quy trình + duyệt
 */
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, History, Loader2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import {
	DecideExam,
	GenerateExamQr,
	GetExam,
	ListExamWorkflowLogs
} from '@/api/exam'
import {
	canDecideExamStatus,
	canFinalApproveAndQr,
	isExamBgh
} from '@/lib/exam-roles'
import { ExamStatusBadge, examStatusLabel } from './exam-status'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import ExamQuestionsPanel from './ExamQuestionsPanel'
import ExamQrPanel from './ExamQrPanel'

export default function ExamDetailPage({ examId }: { examId: number }) {
	const qc = useQueryClient()
	const [note, setNote] = useState('')
	const canFinal = canFinalApproveAndQr()

	const examQ = useQuery({
		queryKey: ['exam', examId],
		queryFn: () => GetExam(examId)
	})
	const logsQ = useQuery({
		queryKey: ['exam-logs', examId],
		queryFn: () => ListExamWorkflowLogs(examId)
	})

	const decideMut = useMutation({
		mutationFn: (decision: 'APPROVE' | 'RETURN') =>
			DecideExam(examId, decision, note || undefined),
		onSuccess: (data) => {
			if (data.status === 'APPROVED') {
				toast.success(
					'Đã phê duyệt cuối: QR + khóa · đề đã vào Ngân hàng đề',
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
			} else if (data.status === 'PENDING_BGH') {
				toast.success(
					'Đã thẩm định → chuyển BGH. Chưa vào ngân hàng (cần BGH phê duyệt cuối + QR).'
				)
			} else if (data.status === 'PENDING_EXAM_OFFICE') {
				toast.success('Đã duyệt CNK → chuyển Ban Khảo thí')
			} else {
				toast.success('Đã xử lý')
			}
			setNote('')
			void qc.invalidateQueries({ queryKey: ['exam', examId] })
			void qc.invalidateQueries({ queryKey: ['exam-logs', examId] })
			void qc.invalidateQueries({ queryKey: ['exam-pending'] })
			void qc.invalidateQueries({ queryKey: ['exam-pending-count'] })
			void qc.invalidateQueries({ queryKey: ['exam-approval-board'] })
			void qc.invalidateQueries({ queryKey: ['exam-bank'] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const qrMut = useMutation({
		mutationFn: () => GenerateExamQr(examId),
		onSuccess: () => {
			toast.success('Đã tạo / cập nhật mã QR')
			void qc.invalidateQueries({ queryKey: ['exam', examId] })
		},
		onError: (e: Error) => toast.error(e.message)
	})

	const exam = examQ.data
	const logs = logsQ.data || []
	const pendingStatuses = [
		'PENDING_DEPT',
		'PENDING_EXAM_OFFICE',
		'PENDING_BGH'
	]
	const isPending = exam ? pendingStatuses.includes(exam.status) : false
	// Chỉ đúng cấp mới thấy nút. PENDING_BGH + QR + khóa: chỉ BGH / admin.cdhc2
	const showDecide = exam ? canDecideExamStatus(exam.status) : false
	const bghUser = isExamBgh()

	if (examQ.isLoading) {
		return (
			<div className='flex justify-center p-16'>
				<Loader2 className='h-8 w-8 animate-spin' />
			</div>
		)
	}
	if (!exam) {
		return (
			<div className='p-6'>
				<p>Không tìm thấy đề.</p>
				<Button asChild variant='link'>
					<Link to='/de-thi/duyet'>Quay lại duyệt đề</Link>
				</Button>
			</div>
		)
	}

	return (
		<div className='space-y-6 p-4 md:p-6'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div className='space-y-1'>
					<Button variant='ghost' size='sm' asChild className='-ml-2'>
						<Link to='/de-thi/duyet'>
							<ArrowLeft className='mr-1 h-4 w-4' />
							Hàng đợi duyệt
						</Link>
					</Button>
					<h1 className='text-2xl font-semibold'>{exam.title}</h1>
					<p className='text-muted-foreground font-mono text-sm'>
						{exam.code}
					</p>
				</div>
				<div className='flex flex-wrap items-center gap-2'>
					<ExamStatusBadge
						status={exam.status}
						label={exam.statusLabel}
					/>
					{exam.locked && (
						<Badge variant='secondary'>
							Đã khóa — không xem/sửa (người soạn)
						</Badge>
					)}
					{exam.status === 'APPROVED' && exam.qrCode && (
						<Badge
							variant='outline'
							className='border-emerald-600 text-emerald-700'
						>
							Có QR
						</Badge>
					)}
				</div>
			</div>

			{/* === KHỐI DUYỆT — sticky đầu trang, BGH thấy ngay nút Duyệt / Trả lại === */}
			{isPending && (
				<Card
					className={
						showDecide
							? 'border-2 border-emerald-600 bg-emerald-50/40 shadow-md dark:bg-emerald-950/20 sticky top-0 z-20'
							: 'border-dashed'
					}
				>
					<CardHeader className='pb-2'>
						<CardTitle className='text-lg'>
							{showDecide
								? '➜ Xử lý duyệt tại đây'
								: 'Đề đang chờ duyệt'}
						</CardTitle>
						<CardDescription>
							Bước hiện tại: <strong>{exam.statusLabel}</strong>
							{exam.status === 'PENDING_BGH' &&
								' — BGH: bấm nút xanh để phê duyệt + QR, hoặc Trả lại Ban KT'}
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						{showDecide ? (
							<>
								{exam.status === 'PENDING_DEPT' && (
									<p className='text-muted-foreground text-sm'>
										CNK kiểm duyệt: đạt → Ban Khảo thí;
										không đạt → trả người soạn.
									</p>
								)}
								{exam.status === 'PENDING_EXAM_OFFICE' && (
									<p className='text-muted-foreground text-sm'>
										Ban KT chỉ thẩm định: đạt → chuyển BGH.
										Không đạt → trả CNK. Ban KT{' '}
										<strong>không</strong> tạo QR / khóa đề.
									</p>
								)}
								{exam.status === 'PENDING_BGH' && (
									<p className='text-sm font-medium text-emerald-800 dark:text-emerald-300'>
										Chỉ <strong>BGH / admin.cdhc2</strong>:
										Phê duyệt → Đã phê duyệt + QR + khóa.
										Trả lại → Ban Khảo thí.
									</p>
								)}
								<div>
									<Label>Ghi chú (tuỳ chọn)</Label>
									<Textarea
										value={note}
										onChange={(e) =>
											setNote(e.target.value)
										}
										placeholder={
											exam.status === 'PENDING_BGH'
												? 'Ghi chú phê duyệt hoặc lý do trả lại Ban KT'
												: 'Ghi chú duyệt / lý do trả lại'
										}
										rows={3}
									/>
								</div>
								<div className='flex flex-col gap-3 sm:flex-row'>
									<Button
										size='lg'
										className='flex-1 bg-emerald-600 text-base hover:bg-emerald-700'
										disabled={decideMut.isPending}
										onClick={() =>
											decideMut.mutate('APPROVE')
										}
									>
										{decideMut.isPending ? (
											<Loader2 className='mr-2 h-5 w-5 animate-spin' />
										) : (
											<CheckCircle2 className='mr-2 h-5 w-5' />
										)}
										{exam.status === 'PENDING_BGH'
											? 'Phê duyệt + tạo QR + khóa'
											: exam.status ===
												  'PENDING_EXAM_OFFICE'
												? 'Thẩm định đạt → chuyển BGH'
												: 'Duyệt đạt → chuyển Ban KT'}
									</Button>
									<Button
										size='lg'
										className='flex-1 text-base'
										variant='outline'
										disabled={decideMut.isPending}
										onClick={() =>
											decideMut.mutate('RETURN')
										}
									>
										<Undo2 className='mr-2 h-5 w-5' />
										{exam.status === 'PENDING_EXAM_OFFICE'
											? 'Không đạt — trả CNK'
											: exam.status === 'PENDING_BGH'
												? 'Không đồng ý — trả Ban KT'
												: 'Trả lại người soạn'}
									</Button>
								</div>
							</>
						) : (
							<p className='text-muted-foreground text-sm'>
								Bạn không có quyền xử lý bước này.
								{exam.status === 'PENDING_BGH' &&
									!bghUser &&
									' Cần đăng nhập bgh.cdhc2 (role admin) hoặc admin.cdhc2.'}
								{exam.status === 'PENDING_BGH' &&
									bghUser &&
									' (Nếu đã login BGH mà vẫn không thấy nút — hãy đăng xuất/đăng nhập lại.)'}
							</p>
						)}
					</CardContent>
				</Card>
			)}

			{exam.status === 'APPROVED' && exam.locked && (
				<div className='rounded-lg border border-emerald-600/30 bg-emerald-500/5 px-4 py-3 text-sm'>
					<p className='font-medium text-emerald-800 dark:text-emerald-300'>
						Đã phê duyệt — đề vào ngân hàng
					</p>
					<ul className='text-muted-foreground mt-1 list-inside list-disc text-xs space-y-0.5'>
						<li>
							Ngày phê duyệt:{' '}
							<strong>{exam.approvedAt || '—'}</strong>
						</li>
						<li>
							Người phê duyệt:{' '}
							<strong>
								{exam.approvedByDisplayName ||
									exam.approvedByUsername ||
									'—'}
							</strong>
						</li>
						<li>Đã tạo mã QR (xem mục QR bên dưới)</li>
						<li>
							Đã khóa: không sửa/xóa; người soạn không xem nội
							dung câu hỏi
						</li>
					</ul>
				</div>
			)}

			{/* QR quét được — mục riêng, ảnh lớn */}
			{(exam.qrCode || (canFinal && exam.status === 'APPROVED')) && (
				<ExamQrPanel
					qrPayload={exam.qrCode}
					examCode={exam.code}
					locked={exam.locked}
					onRegenerate={
						canFinal && exam.status === 'APPROVED'
							? () => qrMut.mutate()
							: undefined
					}
					regenerating={qrMut.isPending}
				/>
			)}

			{/* Nội dung câu hỏi */}
			<ExamQuestionsPanel
				questions={exam.questions}
				locked={exam.locked}
				emptyHint={
					exam.questionFileName
						? `Không có câu hỏi form. File đính kèm: ${exam.questionFileName}${exam.answerFileName ? ` / Đáp án: ${exam.answerFileName}` : ''}`
						: undefined
				}
			/>

			<Card>
				<CardHeader>
					<CardTitle className='text-base'>Thông tin</CardTitle>
				</CardHeader>
				<CardContent className='text-sm space-y-2'>
					<div>
						<span className='text-muted-foreground'>Môn: </span>
						{exam.subjectName} ({exam.subjectCode})
					</div>
					<div>
						<span className='text-muted-foreground'>Ngành: </span>
						{exam.majorName || '—'}
					</div>
					<div>
						<span className='text-muted-foreground'>
							Người soạn:{' '}
						</span>
						{exam.createdByDisplayName || exam.createdByUsername}
					</div>
					{exam.approvedAt && (
						<div>
							<span className='text-muted-foreground'>
								Phê duyệt cuối (BGH):{' '}
							</span>
							{exam.approvedByDisplayName} — {exam.approvedAt}
						</div>
					)}
					{exam.questionFileName && (
						<div>
							<span className='text-muted-foreground'>
								File câu hỏi:{' '}
							</span>
							{exam.questionFileUrl ? (
								<a
									href={exam.questionFileUrl}
									target='_blank'
									rel='noreferrer'
									className='text-primary underline'
								>
									{exam.questionFileName}
								</a>
							) : (
								exam.questionFileName
							)}
						</div>
					)}
					{exam.answerFileName && (
						<div>
							<span className='text-muted-foreground'>
								File đáp án:{' '}
							</span>
							{exam.answerFileUrl ? (
								<a
									href={exam.answerFileUrl}
									target='_blank'
									rel='noreferrer'
									className='text-primary underline'
								>
									{exam.answerFileName}
								</a>
							) : (
								exam.answerFileName
							)}
						</div>
					)}
					{exam.returnNote && (
						<div className='text-destructive'>
							Ghi chú trả lại: {exam.returnNote}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<History className='h-4 w-4' />
						Lịch sử quy trình
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Thời gian</TableHead>
								<TableHead>Hành động</TableHead>
								<TableHead>Trạng thái</TableHead>
								<TableHead>Người thực hiện</TableHead>
								<TableHead>Ghi chú</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{logs.map((l) => (
								<TableRow key={l.id}>
									<TableCell className='text-xs whitespace-nowrap'>
										{l.createdAt}
									</TableCell>
									<TableCell>{l.action}</TableCell>
									<TableCell className='text-xs'>
										{l.fromStatus
											? examStatusLabel(l.fromStatus)
											: '—'}{' '}
										→{' '}
										{l.toStatus
											? examStatusLabel(l.toStatus)
											: '—'}
									</TableCell>
									<TableCell>
										{l.actorDisplayName || l.actorUsername}
									</TableCell>
									<TableCell className='text-muted-foreground text-sm'>
										{l.note || '—'}
									</TableCell>
								</TableRow>
							))}
							{!logs.length && (
								<TableRow>
									<TableCell
										colSpan={5}
										className='text-muted-foreground text-center'
									>
										Chưa có log
									</TableCell>
								</TableRow>
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
