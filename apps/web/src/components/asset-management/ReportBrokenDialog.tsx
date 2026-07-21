import { useEffect, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import type { RoomAsset } from '@/types/asset'
import { useRepairRequestMutations } from '@/hooks/useRepairRequests'
import { toast } from 'sonner'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	roomId: number
	assets: RoomAsset[]
	defaultAssetId?: number
	/** Tên người báo (từ user đăng nhập) */
	defaultReporterName?: string
}

function today() {
	return new Date().toISOString().slice(0, 10)
}

export default function ReportBrokenDialog({
	open,
	onOpenChange,
	roomId,
	assets,
	defaultAssetId,
	defaultReporterName
}: Props) {
	const { create } = useRepairRequestMutations()
	const [mode, setMode] = useState<'existing' | 'other'>('existing')
	const [assetId, setAssetId] = useState('')
	const [assetName, setAssetName] = useState('')
	const [category, setCategory] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [brokenAt, setBrokenAt] = useState(today())
	const [description, setDescription] = useState('')
	const [reportedByName, setReportedByName] = useState('')

	/** Dòng còn SL đang dùng (>0) — cùng mã VT, không tạo dòng mới khi hỏng một phần */
	const usableAssets = assets.filter((a) => (Number(a.quantity) || 0) > 0)

	const selectedAsset = usableAssets.find((a) => String(a.id) === assetId)
	const maxQty = Math.max(1, Number(selectedAsset?.quantity) || 1)

	useEffect(() => {
		if (!open) return
		setBrokenAt(today())
		setDescription('')
		setQuantity(1)
		if (defaultReporterName) {
			setReportedByName(defaultReporterName)
		}
		if (
			defaultAssetId &&
			usableAssets.some((a) => a.id === defaultAssetId)
		) {
			setMode('existing')
			setAssetId(String(defaultAssetId))
		} else if (usableAssets.length) {
			setMode('existing')
			setAssetId(String(usableAssets[0].id))
		} else if (assets.length) {
			setMode('other')
			setAssetId('')
		} else {
			setMode('other')
			setAssetId('')
		}
	}, [open, defaultAssetId, assets, defaultReporterName])

	useEffect(() => {
		// Giới hạn SL khi đổi thiết bị
		if (quantity > maxQty) setQuantity(maxQty)
	}, [maxQty, quantity])

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		try {
			if (mode === 'existing') {
				const id = Number(assetId)
				if (!id) {
					toast.error('Chọn thiết bị trong phòng')
					return
				}
				const asset = usableAssets.find((a) => a.id === id)
				const qty = Math.floor(Number(quantity) || 0)
				if (qty < 1) {
					toast.error('Số lượng hỏng phải ≥ 1')
					return
				}
				const avail = Number(asset?.quantity) || 0
				if (qty > avail) {
					toast.error(
						`Chỉ còn ${avail} cái đang dùng — không báo hỏng ${qty}`
					)
					return
				}
				await create.mutateAsync({
					roomId,
					roomAssetId: id,
					quantity: qty,
					assetName: asset?.name || 'Thiết bị',
					category: asset?.category,
					description: description || undefined,
					brokenAt,
					reportedByName: reportedByName || undefined
				})
				toast.success(
					qty < avail
						? `Đã tách ${qty} cái hỏng (cấp 5, mã -HONG-) — còn ${avail - qty} dùng (mã gốc). Sửa xong → cấp 2 + mã gốc.`
						: `Đã báo hỏng ${qty} cái (cấp 5, mã -HONG-). Sửa xong → cấp 2 + mã gốc.`
				)
			} else {
				if (!assetName.trim()) {
					toast.error('Nhập tên thiết bị hỏng')
					return
				}
				const qty = Math.max(1, Math.floor(Number(quantity) || 1))
				await create.mutateAsync({
					roomId,
					quantity: qty,
					assetName: assetName.trim(),
					category: category || undefined,
					description: description || undefined,
					brokenAt,
					reportedByName: reportedByName || undefined
				})
				toast.success(`Đã gửi phiếu báo hỏng (${qty} cái)`)
			}
			onOpenChange(false)
		} catch (err) {
			toast.error('Gửi báo hỏng thất bại', {
				description: (err as Error).message
			})
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Báo hỏng thiết bị phòng</DialogTitle>
				</DialogHeader>
				<form className='space-y-3' onSubmit={handleSubmit}>
					<div className='space-y-2'>
						<Label>Nguồn thiết bị</Label>
						<Select
							value={mode}
							onValueChange={(v) =>
								setMode(v as 'existing' | 'other')
							}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem
									value='existing'
									disabled={!assets.length}
								>
									Chọn từ danh mục vật tư phòng
								</SelectItem>
								<SelectItem value='other'>
									Thiết bị khác (ghi tên)
								</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{mode === 'existing' ? (
						<div className='space-y-2'>
							<Label>Thiết bị hỏng *</Label>
							<Select
								value={assetId}
								onValueChange={(v) => {
									setAssetId(v)
									setQuantity(1)
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn thiết bị đang dùng' />
								</SelectTrigger>
								<SelectContent>
									{usableAssets.length === 0 ? (
										<SelectItem value='_' disabled>
											Không còn dòng VT đang dùng
										</SelectItem>
									) : (
										usableAssets.map((a) => (
											<SelectItem
												key={a.id}
												value={String(a.id)}
											>
												{a.code ? `${a.code} · ` : ''}
												{a.name} — dùng {a.quantity}
												{(a.brokenQuantity ?? 0) > 0
													? ` · hỏng ${a.brokenQuantity}`
													: ''}{' '}
												{a.unit || 'cái'}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
							{selectedAsset && (
								<p className='text-xs text-muted-foreground'>
									Đang dùng: <strong>{maxQty}</strong>
									{selectedAsset.code
										? ` · mã gốc ${selectedAsset.code}`
										: ''}
									. Báo hỏng → mã tạm{' '}
									<code className='text-[11px]'>-HONG-…</code>{' '}
									(bảng hư hỏng). Sửa xong / hoàn thành →{' '}
									<strong>gán lại đúng mã gốc</strong>, phân
									cấp 2.
								</p>
							)}
						</div>
					) : (
						<>
							<div className='space-y-2'>
								<Label>Tên thiết bị *</Label>
								<Input
									value={assetName}
									onChange={(e) =>
										setAssetName(e.target.value)
									}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label>Phân loại</Label>
								<Input
									value={category}
									onChange={(e) =>
										setCategory(e.target.value)
									}
								/>
							</div>
						</>
					)}

					<div className='space-y-2'>
						<Label>Số lượng hỏng *</Label>
						<Input
							type='number'
							min={1}
							max={mode === 'existing' ? maxQty : undefined}
							value={quantity}
							onChange={(e) => {
								const raw = Math.floor(
									Number(e.target.value) || 0
								)
								if (raw < 1) {
									setQuantity(1)
									return
								}
								if (mode === 'existing' && raw > maxQty) {
									setQuantity(maxQty)
									return
								}
								setQuantity(raw)
							}}
							required
						/>
						<p className='text-xs text-muted-foreground'>
							{mode === 'existing' && selectedAsset ? (
								<>
									Đang dùng:{' '}
									<strong className='text-foreground'>
										{maxQty}
									</strong>{' '}
									{selectedAsset.unit || 'cái'}
									{quantity > 0 && quantity <= maxQty ? (
										<>
											{' '}
											· Báo hỏng {quantity} → còn dùng{' '}
											<strong className='text-foreground'>
												{maxQty - quantity}
											</strong>
										</>
									) : null}
									. Không vượt tồn / không âm. Mã tạm -HONG-
									khi hỏng; sửa xong trả mã gốc.
								</>
							) : (
								'Ghi số lượng hỏng trên phiếu (thiết bị ngoài danh mục). ≥ 1.'
							)}
						</p>
					</div>

					<div className='space-y-2'>
						<Label>Ngày hư *</Label>
						<Input
							type='date'
							value={brokenAt}
							onChange={(e) => setBrokenAt(e.target.value)}
							required
						/>
					</div>
					<div className='space-y-2'>
						<Label>Mô tả tình trạng</Label>
						<Textarea
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder='Hư gì, mức độ, ghi chú…'
							rows={3}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Người báo cáo</Label>
						<Input
							value={reportedByName}
							onChange={(e) => setReportedByName(e.target.value)}
							placeholder='Mặc định = tài khoản đang đăng nhập'
						/>
					</div>

					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button type='submit' disabled={create.isPending}>
							{create.isPending ? 'Đang gửi…' : 'Gửi báo hỏng'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
