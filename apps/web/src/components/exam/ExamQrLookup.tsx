/**
 * Tra cứu đề đã sử dụng / trong ngân hàng — chỉ nhập mã đề (DT-…).
 * API vẫn nhận QR nếu dán payload EXAM:… nhưng UI ưu tiên mã đề.
 */
import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation } from '@tanstack/react-query'
import { Eye, Loader2, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { LookupExamByQr, type LookupExamByQrResult } from '@/api/exam'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'

type Props = {
	/** compact = chỉ thanh tìm; full = kèm card kết quả */
	variant?: 'full' | 'compact'
	onResult?: (r: LookupExamByQrResult | null) => void
	className?: string
}

export default function ExamQrLookup({
	variant = 'full',
	onResult,
	className
}: Props) {
	const [code, setCode] = useState('')
	const [result, setResult] = useState<LookupExamByQrResult | null>(null)

	const lookupMut = useMutation({
		mutationFn: (text: string) => LookupExamByQr(text),
		onSuccess: (data) => {
			setResult(data)
			onResult?.(data)
			const use = data.activeUse
			if (use) {
				toast.success(
					`Mã ${data.exam.code} · đã/đang dùng lớp ${use.className || '—'} (${use.drawCode})`
				)
			} else {
				toast.success(
					`Tìm thấy ${data.exam.code}` +
						(data.exam.paperNumber != null
							? ` · đề số ${data.exam.paperNumber}`
							: '') +
						' (chưa có phiếu bốc/in)'
				)
			}
		},
		onError: (e: Error) => {
			setResult(null)
			onResult?.(null)
			toast.error(e.message)
		}
	})

	function runLookup() {
		const t = code.trim()
		if (!t) {
			toast.error('Nhập mã đề (vd DT-…)')
			return
		}
		lookupMut.mutate(t)
	}

	function clearAll() {
		setCode('')
		setResult(null)
		onResult?.(null)
	}

	const bar = (
		<div className={`space-y-2 ${className || ''}`}>
			<div className='flex flex-wrap items-end gap-3'>
				<div className='min-w-[16rem] flex-1 space-y-1.5'>
					<Label className='flex items-center gap-1.5'>
						<Search className='h-3.5 w-3.5' />
						Tìm đề đã sử dụng / trong kho
					</Label>
					<div className='relative'>
						<Search className='text-muted-foreground absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2' />
						<Input
							className='pl-9 font-mono text-sm'
							placeholder='Nhập hoặc dán mã đề (vd DT-A_CDDD_…)'
							value={code}
							onChange={(e) => setCode(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') runLookup()
							}}
						/>
					</div>
					<p className='text-muted-foreground text-[11px]'>
						Chỉ cần mã đề — hệ thống dò trong kho và hiển thị đã bốc
						/ in lớp nào (nếu có).
					</p>
				</div>
				<Button
					type='button'
					disabled={!code.trim() || lookupMut.isPending}
					onClick={runLookup}
				>
					{lookupMut.isPending ? (
						<Loader2 className='mr-2 h-4 w-4 animate-spin' />
					) : (
						<Search className='mr-2 h-4 w-4' />
					)}
					Tìm theo mã
				</Button>
				{(code || result) && (
					<Button
						type='button'
						variant='ghost'
						size='icon'
						onClick={clearAll}
						title='Xóa'
					>
						<X className='h-4 w-4' />
					</Button>
				)}
			</div>
		</div>
	)

	if (variant === 'compact') {
		return bar
	}

	return (
		<div className='space-y-4'>
			{bar}
			{result && (
				<Card className='border-emerald-600/40 bg-emerald-500/5'>
					<CardHeader className='pb-2'>
						<CardTitle className='text-base'>
							Kết quả · {result.exam.code}
						</CardTitle>
						<CardDescription>
							Khớp theo {result.matchedBy}
							{result.exam.paperNumber != null
								? ` · Đề số ${result.exam.paperNumber}`
								: ''}
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-3 text-sm'>
						<div className='grid gap-2 sm:grid-cols-2'>
							<div>
								<span className='text-muted-foreground'>
									Mã đề:{' '}
								</span>
								<span className='font-mono font-medium'>
									{result.exam.code}
								</span>
							</div>
							<div>
								<span className='text-muted-foreground'>
									Tiêu đề:{' '}
								</span>
								{result.exam.title}
							</div>
							<div>
								<span className='text-muted-foreground'>
									Môn:{' '}
								</span>
								{result.exam.subjectName ||
									result.exam.subjectCode ||
									'—'}
							</div>
							<div>
								<span className='text-muted-foreground'>
									Trạng thái:{' '}
								</span>
								{result.exam.statusLabel}
								{result.exam.locked ? ' · đã khóa' : ''}
							</div>
						</div>

						{result.activeUse ? (
							<div className='rounded-md border border-amber-500/40 bg-amber-500/10 p-3'>
								<p className='font-medium text-amber-900 dark:text-amber-200'>
									Đang / đã sử dụng
								</p>
								<ul className='mt-1 space-y-0.5 text-xs'>
									<li>
										Mã bốc:{' '}
										<code className='font-mono'>
											{result.activeUse.drawCode}
										</code>
									</li>
									<li>
										Phiếu:{' '}
										{result.activeUse.drawType === 'EVEN'
											? 'Chẵn'
											: 'Lẻ'}
										{result.activeUse.paperNumber != null
											? ` · Đề số ${result.activeUse.paperNumber}`
											: ''}
									</li>
									<li>
										Lớp: {result.activeUse.className || '—'}
									</li>
									<li>Bốc lúc: {result.activeUse.drawnAt}</li>
									{result.activeUse.printedAt && (
										<li>
											Đã in: {result.activeUse.printedAt}
										</li>
									)}
									{result.activeUse.examDate && (
										<li>
											Ngày thi:{' '}
											{result.activeUse.examDate}
										</li>
									)}
								</ul>
							</div>
						) : (
							<p className='text-muted-foreground text-xs'>
								Đề trong kho — chưa có phiếu bốc / in.
							</p>
						)}

						{result.usage.length > 1 && (
							<div>
								<p className='mb-1 text-xs font-medium'>
									Lịch sử sử dụng ({result.usage.length})
								</p>
								<ul className='max-h-28 space-y-1 overflow-y-auto text-xs'>
									{result.usage.map((u) => (
										<li
											key={u.id}
											className='flex flex-wrap gap-2'
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
											{u.printedAt && (
												<span className='text-emerald-700'>
													đã in
												</span>
											)}
										</li>
									))}
								</ul>
							</div>
						)}

						<div className='flex flex-wrap gap-2'>
							<Button size='sm' asChild>
								<Link
									to='/de-thi/chi-tiet/$id'
									params={{
										id: String(result.exam.id)
									}}
								>
									<Eye className='mr-1 h-3.5 w-3.5' />
									Xem chi tiết đề
								</Link>
							</Button>
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	)
}
