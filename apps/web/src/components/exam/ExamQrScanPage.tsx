/**
 * Trang mở khi quét QR đề thi — hiển thị thông tin đề + phiếu đang dùng.
 */
import { useMemo } from 'react'
import { Link, useSearch } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
	ArrowLeft,
	Loader2,
	QrCode,
	BookOpen,
	Building2,
	Users
} from 'lucide-react'
import { LookupExamByQr } from '@/api/exam'
import { extractExamQrToken } from '@/lib/exam-qr-url'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExamStatusBadge } from './exam-status'

export default function ExamQrScanPage() {
	// search từ route: ?c=EXAM:... hoặc ?id=12
	const search = useSearch({ strict: false }) as {
		c?: string
		code?: string
		q?: string
		id?: string
	}

	const token = useMemo(() => {
		const raw = search?.c || search?.code || search?.q || ''
		if (raw) return extractExamQrToken(String(raw))
		if (search?.id && /^\d+$/.test(String(search.id))) {
			// LookupExamByQr parse EXAM:{id}:...
			return `EXAM:${search.id}:ID`
		}
		// Fallback query string (trước khi router hydrate)
		if (typeof window !== 'undefined') {
			const sp = new URLSearchParams(window.location.search)
			const c = sp.get('c') || sp.get('code') || sp.get('q')
			if (c) return extractExamQrToken(c)
			const id = sp.get('id')
			if (id && /^\d+$/.test(id)) return `EXAM:${id}:ID`
		}
		return ''
	}, [search])

	const lookupQ = useQuery({
		queryKey: ['exam-qr-scan', token],
		queryFn: () => LookupExamByQr(token),
		enabled: !!token && token.length > 4,
		retry: 1
	})

	const effective = token
	const data = lookupQ.data
	const exam = data?.exam
	const active = data?.activeUse

	return (
		<div className='mx-auto max-w-lg space-y-4 p-4 md:p-6'>
			<div className='flex items-center gap-2'>
				<Button variant='ghost' size='sm' asChild className='-ml-2'>
					<Link to='/de-thi/ngan-hang'>
						<ArrowLeft className='mr-1 h-4 w-4' />
						Ngân hàng đề
					</Link>
				</Button>
			</div>

			<div>
				<h1 className='flex items-center gap-2 text-2xl font-semibold tracking-tight'>
					<QrCode className='h-7 w-7' />
					Thông tin đề từ QR
				</h1>
				<p className='text-muted-foreground text-sm'>
					Kết quả quét mã QR đề thi (sau BGH phê duyệt).
				</p>
			</div>

			{!effective && (
				<Card>
					<CardContent className='text-muted-foreground py-8 text-center text-sm'>
						Không có mã QR trên đường dẫn. Hãy quét lại QR hoặc mở
						từ Ngân hàng đề → Tra cứu QR.
					</CardContent>
				</Card>
			)}

			{lookupQ.isLoading && (
				<div className='flex justify-center py-12'>
					<Loader2 className='h-8 w-8 animate-spin' />
				</div>
			)}

			{lookupQ.isError && (
				<Card className='border-destructive/40'>
					<CardHeader>
						<CardTitle className='text-destructive text-base'>
							Không tìm thấy đề
						</CardTitle>
						<CardDescription>
							{(lookupQ.error as Error)?.message ||
								'Mã QR không khớp đề trong hệ thống'}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<code className='bg-muted block break-all rounded p-2 text-xs'>
							{effective}
						</code>
					</CardContent>
				</Card>
			)}

			{exam && (
				<>
					<Card className='border-primary/30'>
						<CardHeader>
							<div className='flex flex-wrap items-center gap-2'>
								<Badge variant='default' className='text-sm'>
									Đề số {exam.paperNumber ?? '—'}
								</Badge>
								<ExamStatusBadge
									status={exam.status}
									label={exam.statusLabel}
								/>
								{exam.locked && (
									<Badge variant='secondary'>Đã khóa</Badge>
								)}
							</div>
							<CardTitle className='text-xl'>
								{exam.title}
							</CardTitle>
							<CardDescription className='font-mono text-xs'>
								{exam.code}
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-3 text-sm'>
							<div className='grid gap-2 sm:grid-cols-2'>
								<div className='flex items-start gap-2'>
									<BookOpen className='text-muted-foreground mt-0.5 h-4 w-4' />
									<div>
										<p className='text-muted-foreground text-xs'>
											Môn học
										</p>
										<p className='font-medium'>
											{exam.subjectName ||
												exam.subjectCode ||
												'—'}
										</p>
									</div>
								</div>
								<div className='flex items-start gap-2'>
									<Building2 className='text-muted-foreground mt-0.5 h-4 w-4' />
									<div>
										<p className='text-muted-foreground text-xs'>
											Ngành đào tạo
										</p>
										<p className='font-medium'>
											{exam.majorName ||
												exam.majorCode ||
												'—'}
										</p>
									</div>
								</div>
							</div>
							{exam.approvedAt && (
								<p className='text-muted-foreground text-xs'>
									Phê duyệt: {exam.approvedAt}
									{exam.approvedByDisplayName
										? ` · ${exam.approvedByDisplayName}`
										: ''}
								</p>
							)}
							{exam.questionCount != null && (
								<p className='text-xs'>
									Số câu hỏi form: <b>{exam.questionCount}</b>
								</p>
							)}
						</CardContent>
					</Card>

					{active ? (
						<Card className='border-amber-500/40 bg-amber-500/5'>
							<CardHeader className='pb-2'>
								<CardTitle className='flex items-center gap-2 text-base'>
									<Users className='h-4 w-4' />
									Đang / đã sử dụng
								</CardTitle>
							</CardHeader>
							<CardContent className='space-y-1 text-sm'>
								<p>
									<span className='text-muted-foreground'>
										Mã bốc:{' '}
									</span>
									<code className='font-mono font-medium'>
										{active.drawCode}
									</code>
								</p>
								<p>
									<span className='text-muted-foreground'>
										Phiếu:{' '}
									</span>
									{active.drawType === 'EVEN' ? 'Chẵn' : 'Lẻ'}
									{active.paperNumber != null
										? ` · Đề số ${active.paperNumber}`
										: ''}
								</p>
								<p>
									<span className='text-muted-foreground'>
										Lớp:{' '}
									</span>
									{active.className || '—'}
								</p>
								<p>
									<span className='text-muted-foreground'>
										Bốc lúc:{' '}
									</span>
									{active.drawnAt}
								</p>
								{active.printedAt && (
									<p>
										<span className='text-muted-foreground'>
											Đã in:{' '}
										</span>
										{active.printedAt}
									</p>
								)}
								{active.examDate && (
									<p>
										<span className='text-muted-foreground'>
											Ngày thi:{' '}
										</span>
										{active.examDate}
									</p>
								)}
							</CardContent>
						</Card>
					) : (
						<Card>
							<CardContent className='text-muted-foreground py-4 text-sm'>
								Đề trong ngân hàng — chưa có phiếu bốc/in gắn
								với đề này.
							</CardContent>
						</Card>
					)}

					{data && data.usage.length > 1 && (
						<Card>
							<CardHeader className='pb-2'>
								<CardTitle className='text-base'>
									Lịch sử sử dụng ({data.usage.length})
								</CardTitle>
							</CardHeader>
							<CardContent>
								<ul className='space-y-2 text-xs'>
									{data.usage.map((u) => (
										<li
											key={u.id}
											className='flex flex-wrap gap-2 border-b pb-2 last:border-0'
										>
											<Badge variant='outline'>
												{u.drawType === 'EVEN'
													? 'Chẵn'
													: 'Lẻ'}
											</Badge>
											<span className='font-mono'>
												{u.drawCode}
											</span>
											<span>{u.className || '—'}</span>
										</li>
									))}
								</ul>
							</CardContent>
						</Card>
					)}

					<div className='flex flex-wrap gap-2'>
						<Button asChild>
							<Link
								to='/de-thi/chi-tiet/$id'
								params={{ id: String(exam.id) }}
							>
								Xem chi tiết đầy đủ
							</Link>
						</Button>
						<Button variant='outline' asChild>
							<Link to='/de-thi/ngan-hang'>Ngân hàng đề</Link>
						</Button>
					</div>
				</>
			)}
		</div>
	)
}
