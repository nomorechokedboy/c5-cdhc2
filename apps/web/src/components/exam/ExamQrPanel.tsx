/**
 * Hiển thị mã QR — quét camera mở trang thông tin đề (/de-thi/qr?c=…)
 */
import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Loader2, QrCode, ExternalLink } from 'lucide-react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { canFinalApproveAndQr } from '@/lib/exam-roles'
import { buildExamQrScanUrl } from '@/lib/exam-qr-url'

export default function ExamQrPanel({
	qrPayload,
	examCode,
	locked,
	onRegenerate,
	regenerating
}: {
	qrPayload: string | null | undefined
	examCode?: string | null
	locked?: boolean
	onRegenerate?: () => void
	regenerating?: boolean
}) {
	const [dataUrl, setDataUrl] = useState<string | null>(null)
	const [err, setErr] = useState<string | null>(null)
	const canQr = canFinalApproveAndQr()

	/** URL mở khi quét — có thông tin đề trên web */
	const scanUrl = useMemo(() => {
		const p = (qrPayload || '').trim()
		if (!p) return ''
		return buildExamQrScanUrl(p)
	}, [qrPayload])

	useEffect(() => {
		let cancelled = false
		setDataUrl(null)
		setErr(null)
		if (!scanUrl) return

		void QRCode.toDataURL(scanUrl, {
			width: 360,
			margin: 2,
			errorCorrectionLevel: 'M',
			color: { dark: '#000000', light: '#ffffff' }
		})
			.then((url) => {
				if (!cancelled) setDataUrl(url)
			})
			.catch((e: Error) => {
				if (!cancelled) setErr(e.message || 'Không tạo được QR')
			})

		return () => {
			cancelled = true
		}
	}, [scanUrl])

	if (!qrPayload) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className='flex items-center gap-2 text-base'>
						<QrCode className='h-5 w-5' />
						Mã QR
					</CardTitle>
					<CardDescription>
						Chưa có mã QR — chỉ BGH / admin phê duyệt cuối mới tạo.
					</CardDescription>
				</CardHeader>
				{canQr && onRegenerate && (
					<CardContent>
						<Button
							size='sm'
							disabled={regenerating}
							onClick={onRegenerate}
						>
							{regenerating && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Tạo mã QR
						</Button>
					</CardContent>
				)}
			</Card>
		)
	}

	return (
		<Card className='border-primary/30'>
			<CardHeader>
				<CardTitle className='flex items-center gap-2 text-base'>
					<QrCode className='h-5 w-5' />
					Mã QR đề thi
					{locked && (
						<span className='text-muted-foreground text-xs font-normal'>
							(đã khóa)
						</span>
					)}
				</CardTitle>
				<CardDescription>
					Quét bằng camera điện thoại → mở trang thông tin đề (số đề,
					môn, lớp đang dùng…)
					{examCode ? ` · ${examCode}` : ''}
				</CardDescription>
			</CardHeader>
			<CardContent className='flex flex-col items-center gap-4'>
				{err && <p className='text-destructive text-sm'>{err}</p>}
				{!dataUrl && !err && (
					<Loader2 className='text-muted-foreground h-8 w-8 animate-spin' />
				)}
				{dataUrl && (
					<div className='rounded-lg border-2 border-foreground/10 bg-white p-4 shadow-sm'>
						<img
							src={dataUrl}
							alt='Mã QR đề thi'
							width={320}
							height={320}
							className='h-64 w-64 sm:h-80 sm:w-80'
						/>
					</div>
				)}
				<div className='w-full space-y-1 text-center'>
					<p className='text-muted-foreground text-xs font-medium'>
						Link khi quét (mở trang thông tin):
					</p>
					<a
						href={scanUrl}
						target='_blank'
						rel='noreferrer'
						className='text-primary inline-flex max-w-full items-center gap-1 break-all text-xs underline'
					>
						<ExternalLink className='h-3 w-3 shrink-0' />
						{scanUrl}
					</a>
				</div>
				<div className='flex flex-wrap justify-center gap-2'>
					<Button size='sm' variant='secondary' asChild>
						<a href={scanUrl} target='_blank' rel='noreferrer'>
							Xem thông tin đề
						</a>
					</Button>
					{canQr && onRegenerate && (
						<Button
							size='sm'
							variant='outline'
							disabled={regenerating}
							onClick={onRegenerate}
						>
							{regenerating && (
								<Loader2 className='mr-2 h-4 w-4 animate-spin' />
							)}
							Tạo lại mã QR
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	)
}
