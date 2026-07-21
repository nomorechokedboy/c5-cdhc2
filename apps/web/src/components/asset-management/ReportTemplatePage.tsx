/**
 * Form mẫu đầu trang / cuối trang Word báo cáo.
 * Sửa tại đây → mọi lần xuất Word dùng nội dung đã lưu.
 */
import { useEffect, useState } from 'react'
import { FileType, RotateCcw, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
	DEFAULT_REPORT_TEMPLATE,
	loadReportTemplate,
	resetReportTemplate,
	saveReportTemplate,
	type ReportTemplate
} from '@/lib/report-template'
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

export default function ReportTemplatePage() {
	const [form, setForm] = useState<ReportTemplate>(() => loadReportTemplate())
	const [dirty, setDirty] = useState(false)

	useEffect(() => {
		setForm(loadReportTemplate())
	}, [])

	function patch<K extends keyof ReportTemplate>(
		key: K,
		value: ReportTemplate[K]
	) {
		setForm((prev) => ({ ...prev, [key]: value }))
		setDirty(true)
	}

	function onSave() {
		if (!form.superiorUnitName.trim() || !form.unitName.trim()) {
			toast.error('Cần nhập đơn vị cấp trên và tên trường/đơn vị')
			return
		}
		saveReportTemplate(form)
		setDirty(false)
		toast.success(
			'Đã lưu mẫu. Lần xuất Word tiếp theo sẽ dùng đầu trang / cuối trang mới.'
		)
	}

	function onReset() {
		const d = resetReportTemplate()
		setForm(d)
		setDirty(false)
		toast.success('Đã khôi phục mẫu mặc định (như ảnh công văn)')
	}

	const today = new Date()
	const day = String(today.getDate()).padStart(2, '0')
	const month = String(today.getMonth() + 1).padStart(2, '0')
	const year = today.getFullYear()

	return (
		<div className='p-4 md:p-6 max-w-4xl mx-auto space-y-4'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-xl font-semibold flex items-center gap-2'>
						<FileType className='w-5 h-5' />
						Mẫu báo cáo Word
					</h1>
					<p className='text-sm text-muted-foreground mt-1 max-w-2xl'>
						Chỉnh <strong>đầu trang</strong> (ảnh #1) và{' '}
						<strong>cuối trang</strong> (ảnh #2). Mọi báo cáo Word
						xuất ra sẽ lấy nội dung đã lưu — không cần sửa từng
						file.
					</p>
				</div>
				<div className='flex flex-wrap gap-2'>
					<Button variant='outline' onClick={onReset}>
						<RotateCcw className='w-4 h-4 mr-1.5' />
						Mặc định
					</Button>
					<Button onClick={onSave} disabled={!dirty}>
						<Save className='w-4 h-4 mr-1.5' />
						Lưu mẫu
					</Button>
				</div>
			</div>

			{/* ── Preview header ── */}
			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>
						Đầu trang (xem trước)
					</CardTitle>
					<CardDescription>
						Giống khung 2 cột trên file Word
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-2 gap-4 border rounded-lg p-4 text-center text-sm'>
						<div className='space-y-1'>
							<div className='font-bold uppercase tracking-wide'>
								{form.superiorUnitName || '—'}
							</div>
							<div className='font-bold uppercase'>
								{form.unitName || '—'}
							</div>
							<div className='text-muted-foreground'>———</div>
							<div>
								Số:{' '}
								<span className='font-mono'>
									{form.docNumber || '—'}
								</span>
							</div>
						</div>
						<div className='space-y-1'>
							<div className='font-bold uppercase text-[13px] leading-snug'>
								{form.republic || '—'}
							</div>
							<div className='font-bold underline underline-offset-2'>
								{form.motto || '—'}
							</div>
							<div className='text-muted-foreground'>———</div>
							<div className='italic text-muted-foreground'>
								{form.city || '—'}, ngày {day} tháng {month} năm{' '}
								{year}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Edit header ── */}
			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>Sửa đầu trang</CardTitle>
				</CardHeader>
				<CardContent className='grid gap-4 sm:grid-cols-2'>
					<div className='space-y-2'>
						<Label>Dòng 1 trái (cấp trên)</Label>
						<Input
							value={form.superiorUnitName}
							onChange={(e) =>
								patch('superiorUnitName', e.target.value)
							}
							placeholder='TỔNG CỤC HẬU CẦN'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Dòng 2 trái (trường / đơn vị)</Label>
						<Input
							value={form.unitName}
							onChange={(e) => patch('unitName', e.target.value)}
							placeholder='TRƯỜNG CAO ĐẲNG HẬU CẦN 2'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Số hiệu văn bản</Label>
						<Input
							value={form.docNumber}
							onChange={(e) => patch('docNumber', e.target.value)}
							placeholder='....../BC-CDHC'
							className='font-mono'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Địa danh (ghép ngày khi xuất)</Label>
						<Input
							value={form.city}
							onChange={(e) => patch('city', e.target.value)}
							placeholder='Thành phố Hồ Chí Minh'
						/>
					</div>
					<div className='space-y-2 sm:col-span-2'>
						<Label>Quốc hiệu</Label>
						<Input
							value={form.republic}
							onChange={(e) => patch('republic', e.target.value)}
							placeholder='CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'
						/>
					</div>
					<div className='space-y-2 sm:col-span-2'>
						<Label>Tiêu ngữ</Label>
						<Input
							value={form.motto}
							onChange={(e) => patch('motto', e.target.value)}
							placeholder='Độc lập - Tự do - Hạnh phúc'
						/>
					</div>
				</CardContent>
			</Card>

			{/* ── Preview footer ── */}
			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>
						Cuối trang (xem trước)
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className='grid grid-cols-2 gap-4 border rounded-lg p-4 text-sm'>
						<div className='space-y-1'>
							<div className='font-bold'>
								{form.recipientsTitle || 'Nơi nhận:'}
							</div>
							{(form.recipients || '')
								.split('\n')
								.filter((l) => l.trim())
								.map((l, i) => (
									<div key={i}>{l}</div>
								))}
						</div>
						<div className='text-center space-y-2'>
							<div className='font-bold uppercase'>
								{form.commanderPosition || '—'}
							</div>
							<div className='italic text-muted-foreground text-xs'>
								{form.commanderHint || '—'}
							</div>
							<div className='pt-6 font-semibold'>
								{[form.commanderRank, form.commanderName]
									.filter(Boolean)
									.join(' ') ||
									'................................'}
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ── Edit footer ── */}
			<Card>
				<CardHeader className='pb-2'>
					<CardTitle className='text-base'>Sửa cuối trang</CardTitle>
				</CardHeader>
				<CardContent className='grid gap-4 sm:grid-cols-2'>
					<div className='space-y-2'>
						<Label>Tiêu đề «Nơi nhận»</Label>
						<Input
							value={form.recipientsTitle}
							onChange={(e) =>
								patch('recipientsTitle', e.target.value)
							}
							placeholder='Nơi nhận:'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Chức danh ký</Label>
						<Input
							value={form.commanderPosition}
							onChange={(e) =>
								patch('commanderPosition', e.target.value)
							}
							placeholder='CHỈ HUY ĐƠN VỊ'
						/>
					</div>
					<div className='space-y-2 sm:col-span-2'>
						<Label>Danh sách nơi nhận (mỗi dòng một mục)</Label>
						<Textarea
							rows={4}
							value={form.recipients}
							onChange={(e) =>
								patch('recipients', e.target.value)
							}
							placeholder={'- Như trên;\n- Lưu: VT, HC;'}
							className='font-mono text-sm'
						/>
					</div>
					<div className='space-y-2 sm:col-span-2'>
						<Label>Gợi ý dưới chức danh</Label>
						<Input
							value={form.commanderHint}
							onChange={(e) =>
								patch('commanderHint', e.target.value)
							}
							placeholder='(Ký, ghi rõ họ tên, cấp bậc)'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Cấp bậc (tùy chọn)</Label>
						<Input
							value={form.commanderRank}
							onChange={(e) =>
								patch('commanderRank', e.target.value)
							}
							placeholder='vd. Trung tá'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Họ tên người ký (tùy chọn)</Label>
						<Input
							value={form.commanderName}
							onChange={(e) =>
								patch('commanderName', e.target.value)
							}
							placeholder='Trống = in chấm ........'
						/>
					</div>
				</CardContent>
			</Card>

			<div className='flex justify-end gap-2 pb-8'>
				<Button
					variant='outline'
					onClick={() => {
						setForm(loadReportTemplate())
						setDirty(false)
					}}
					disabled={!dirty}
				>
					Hủy thay đổi
				</Button>
				<Button onClick={onSave} disabled={!dirty}>
					<Save className='w-4 h-4 mr-1.5' />
					Lưu mẫu
				</Button>
			</div>

			<p className='text-xs text-muted-foreground text-center pb-4'>
				Mẫu lưu trên trình duyệt (localStorage). Xuất Word báo cáo thực
				lực, kho, nhật ký… đều dùng mẫu này. Mặc định gốc:{' '}
				<code className='text-[11px]'>
					{DEFAULT_REPORT_TEMPLATE.unitName}
				</code>
			</p>
		</div>
	)
}
