import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type {
	AssetMovementType,
	CreateAssetMovementBody,
	RoomAsset
} from '@/types/asset'
import { useEffect, useState } from 'react'
import {
	ASSET_GRADES,
	GRADE_UP_TARGET_GRADES,
	gradeShort,
	isAssetRepaired,
	validateGradeUp
} from '@/lib/asset-grade'
import {
	MIN_ASSET_YEAR,
	clampAssetYearInput,
	maxAssetYear,
	validateAssetYears
} from '@/lib/asset-year'
import { toast } from 'sonner'

const INCREASE_REASONS = [
	{ value: 'FROM_SUPERIOR', label: 'Trên cấp' },
	{ value: 'PURCHASE', label: 'Mua sắm' },
	{ value: 'GRADE_UP', label: 'Tăng phân cấp' },
	{ value: 'INVENTORY', label: 'Kiểm kê' },
	{ value: 'OTHER', label: 'Khác' }
]

const DECREASE_REASONS = [
	{ value: 'RETURN_SUPERIOR', label: 'Trả trên' },
	{ value: 'LOSS', label: 'Hao hụt' },
	{ value: 'LIQUIDATION', label: 'Thanh lý' },
	{ value: 'INVENTORY', label: 'Kiểm kê' },
	{ value: 'OTHER', label: 'Khác' }
]

function today() {
	return new Date().toISOString().slice(0, 10)
}

export type MovementMode = 'increase-decrease' | 'adjust'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	mode: MovementMode
	asset: RoomAsset
	onSubmit: (body: CreateAssetMovementBody) => Promise<void>
}

export default function AssetMovementDialog({
	open,
	onOpenChange,
	mode,
	asset,
	onSubmit
}: Props) {
	const [pending, setPending] = useState(false)
	const [dir, setDir] = useState<'INCREASE' | 'DECREASE'>('INCREASE')
	const [executedAt, setExecutedAt] = useState(today())
	const [executingUnit, setExecutingUnit] = useState('')
	const [installAddress, setInstallAddress] = useState('')
	const [assetName, setAssetName] = useState('')
	const [quantity, setQuantity] = useState(1)
	const [grade, setGrade] = useState('1')
	const [manufactureYear, setManufactureYear] = useState(
		String(MIN_ASSET_YEAR)
	)
	const [usageYear, setUsageYear] = useState(String(MIN_ASSET_YEAR))
	const [reasonCode, setReasonCode] = useState('')
	const [reasonOther, setReasonOther] = useState('')
	const [decisionDate, setDecisionDate] = useState('')
	const [decisionNumber, setDecisionNumber] = useState('')
	const [signer, setSigner] = useState('')
	const [performer, setPerformer] = useState('')
	const [explanation, setExplanation] = useState('')
	const [note, setNote] = useState('')

	useEffect(() => {
		if (!open) return
		setDir('INCREASE')
		setExecutedAt(today())
		setExecutingUnit('')
		setInstallAddress(asset.installAddress ?? '')
		setAssetName(asset.name)
		setQuantity(mode === 'adjust' ? asset.quantity : 1)
		setGrade(String(asset.grade ?? 1))
		setManufactureYear(
			asset.manufactureYear != null
				? String(asset.manufactureYear)
				: String(MIN_ASSET_YEAR)
		)
		setUsageYear(
			asset.usageYear != null
				? String(asset.usageYear)
				: String(MIN_ASSET_YEAR)
		)
		setReasonCode('')
		setReasonOther('')
		setDecisionDate('')
		setDecisionNumber('')
		setSigner('')
		setPerformer('')
		setExplanation('')
		setNote('')
	}, [open, asset, mode])

	useEffect(() => {
		if (reasonCode === 'GRADE_UP') {
			const g = Number(grade)
			if (g < 1 || g > 4) setGrade('1')
		}
	}, [reasonCode])

	const reasons = dir === 'INCREASE' ? INCREASE_REASONS : DECREASE_REASONS
	const isIncDec = mode === 'increase-decrease'

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!executedAt) {
			toast.error('Ngày thực hiện là bắt buộc')
			return
		}
		const yearErr = validateAssetYears({
			manufactureYear,
			usageYear
		})
		if (yearErr) {
			toast.error(yearErr)
			return
		}
		const qty = Math.floor(Number(quantity) || 0)
		const currentStock = Number(asset.quantity) || 0
		if (qty < 0 || !Number.isFinite(qty)) {
			toast.error('Số lượng không được âm')
			return
		}
		if (isIncDec) {
			if (dir === 'DECREASE') {
				if (currentStock <= 0) {
					toast.error(
						'Số lượng đang là 0 — không thể giảm tiếp thiết bị này'
					)
					return
				}
				if (qty < 1) {
					toast.error('Số lượng giảm phải ≥ 1')
					return
				}
				if (qty > currentStock) {
					toast.error(
						`Không đủ số lượng để giảm. Hiện có ${currentStock} ${asset.unit || 'cái'} — không giảm ${qty}.`
					)
					return
				}
			} else if (qty < 1) {
				toast.error('Số lượng tăng phải ≥ 1')
				return
			}
			if (!reasonCode) {
				toast.error('Chọn lý do tăng/giảm')
				return
			}
			if (reasonCode === 'OTHER' && !reasonOther.trim()) {
				toast.error('Nhập lý do khác')
				return
			}
			if (reasonCode === 'GRADE_UP') {
				const check = validateGradeUp({
					currentGrade: asset.grade ?? 1,
					newGrade: Number(grade),
					status: asset.status,
					repairCompletedAt: asset.repairCompletedAt
				})
				if (!check.ok) {
					toast.error(
						'Chưa hoàn thành sửa chữa — không được tăng phân cấp'
					)
					return
				}
				const curG = Number(asset.grade ?? 1)
				if (curG >= 5) {
					if (qty < 1) {
						toast.error('Nhập SL chuyển từ kho hỏng (≥ 1)')
						return
					}
					if (qty > currentStock) {
						toast.error(
							`Kho hỏng chỉ có ${currentStock} — không chuyển ${qty}`
						)
						return
					}
				}
			}
		} else if (!explanation.trim()) {
			toast.error('Nhập diễn giải lý do cụ thể')
			return
		}

		const movementType: AssetMovementType = isIncDec ? dir : 'ADJUST'
		let noteOut = note.trim() || undefined
		if (reasonCode === 'GRADE_UP') {
			noteOut = 'Đã hoàn thành sửa chữa'
		} else if (reasonCode === 'LIQUIDATION') {
			noteOut = noteOut || 'Thanh lý'
		}
		const isGradeUpReason = isIncDec && reasonCode === 'GRADE_UP'
		const gradeUpFromBroken =
			isGradeUpReason &&
			(Number(asset.grade ?? 1) >= 5 ||
				String(asset.status || '').toUpperCase() === 'BROKEN')
		const qtyToSend = isGradeUpReason ? (gradeUpFromBroken ? qty : 0) : qty

		const body: CreateAssetMovementBody = {
			movementType: isGradeUpReason ? 'INCREASE' : movementType,
			executedAt,
			executingUnit: executingUnit || undefined,
			installAddress: installAddress || undefined,
			assetName: assetName || undefined,
			quantity: qtyToSend,
			grade: Number(grade),
			manufactureYear: manufactureYear
				? Number(manufactureYear)
				: undefined,
			usageYear: usageYear ? Number(usageYear) : undefined,
			note: noteOut
		}
		if (isIncDec) {
			body.reasonCode = reasonCode
			body.reasonOther =
				reasonCode === 'OTHER' ? reasonOther.trim() : undefined
			body.decisionDate = decisionDate || undefined
			body.decisionNumber = decisionNumber || undefined
			body.signer = signer || undefined
			body.performer = performer || undefined
		} else {
			body.explanation = explanation
		}

		setPending(true)
		try {
			await onSubmit(body)
			toast.success(
				isIncDec
					? 'Đã ghi nhận tăng/giảm vật tư'
					: 'Đã điều chỉnh số liệu vật tư'
			)
			onOpenChange(false)
		} catch (err) {
			toast.error('Lưu thất bại', {
				description: (err as Error).message
			})
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-lg max-h-[90vh] overflow-y-auto'>
				<DialogHeader>
					<DialogTitle>
						{isIncDec
							? 'Nhập tăng giảm vật tư'
							: 'Cập nhật điều chỉnh số liệu vật tư'}
					</DialogTitle>
				</DialogHeader>
				<form className='space-y-3' onSubmit={handleSubmit}>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label>Ngày thực hiện *</Label>
							<Input
								type='date'
								value={executedAt}
								onChange={(e) => setExecutedAt(e.target.value)}
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label>Đơn vị thực hiện</Label>
							<Input
								value={executingUnit}
								onChange={(e) =>
									setExecutingUnit(e.target.value)
								}
							/>
						</div>
					</div>
					<div className='space-y-2'>
						<Label>Địa chỉ lắp đặt sử dụng</Label>
						<Input
							value={installAddress}
							onChange={(e) => setInstallAddress(e.target.value)}
						/>
					</div>

					{reasonCode === 'GRADE_UP' && (
						<div
							className={`rounded-md border px-3 py-2 text-sm space-y-1 ${
								(asset.grade ?? 1) === 5 ||
								asset.status === 'BROKEN' ||
								asset.status === 'REPAIRING'
									? isAssetRepaired(asset)
										? 'border-emerald-300 bg-emerald-50'
										: 'border-destructive/40 bg-destructive/5 text-destructive'
									: 'border-blue-200 bg-blue-50'
							}`}
						>
							<p>
								<strong>Cấp hiện tại:</strong>{' '}
								{gradeShort(asset.grade)}
							</p>
							<p>
								<strong>Sửa chữa:</strong>{' '}
								{isAssetRepaired(asset)
									? `Đã hoàn thành${asset.repairCompletedAt ? ` (${asset.repairCompletedAt})` : ''}`
									: (asset.grade ?? 1) === 5 ||
										  asset.status === 'BROKEN' ||
										  asset.status === 'REPAIRING'
										? 'Chưa hoàn thành — không được tăng phân cấp'
										: 'Không bắt buộc'}
							</p>
							{(asset.grade ?? 1) === 5 &&
								!isAssetRepaired(asset) && (
									<p className='font-medium text-xs'>
										Cấp 5 (hỏng) bắt buộc sửa xong mới tăng
										cấp lên 1–4.
									</p>
								)}
						</div>
					)}

					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label>Mã vật tư</Label>
							<Input
								value={asset.code ?? ''}
								readOnly
								className='font-mono bg-muted'
							/>
						</div>
						<div className='space-y-2'>
							<Label>Tên thiết bị</Label>
							<Input
								value={assetName}
								onChange={(e) => setAssetName(e.target.value)}
							/>
						</div>
					</div>
					<div className='grid grid-cols-3 gap-3'>
						<div className='space-y-2'>
							<Label>
								{isIncDec
									? dir === 'DECREASE'
										? 'Số lượng giảm *'
										: 'Số lượng tăng *'
									: 'Số lượng mới *'}
							</Label>
							<Input
								type='number'
								min={0}
								max={
									isIncDec && dir === 'DECREASE'
										? asset.quantity
										: undefined
								}
								value={quantity}
								onChange={(e) => {
									const raw = Number(e.target.value)
									if (Number.isNaN(raw)) {
										setQuantity(0)
										return
									}
									const n = Math.floor(raw)
									if (n < 0) {
										setQuantity(0)
										return
									}
									const cap =
										isIncDec && dir === 'DECREASE'
											? Number(asset.quantity) || 0
											: null
									if (cap != null && n > cap) {
										setQuantity(cap)
										return
									}
									setQuantity(n)
								}}
								required
							/>
							<p className='text-[11px] text-muted-foreground leading-snug'>
								Hiện có:{' '}
								<strong className='text-foreground'>
									{asset.quantity}
								</strong>{' '}
								{asset.unit || 'cái'}
								{isIncDec &&
								dir === 'DECREASE' &&
								quantity > 0 &&
								quantity <= (asset.quantity ?? 0) ? (
									<>
										{' '}
										· Sau giảm còn{' '}
										<strong className='text-foreground'>
											{(asset.quantity ?? 0) - quantity}
										</strong>
									</>
								) : null}
								{isIncDec &&
								dir === 'INCREASE' &&
								quantity > 0 ? (
									<>
										{' '}
										· Sau tăng:{' '}
										<strong className='text-foreground'>
											{(asset.quantity ?? 0) + quantity}
										</strong>
									</>
								) : null}
								. Không cho SL âm / giảm quá tồn.
							</p>
						</div>
						<div className='space-y-2'>
							<Label>Phân cấp</Label>
							<Select value={grade} onValueChange={setGrade}>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{ASSET_GRADES.map((g) => (
										<SelectItem
											key={g.value}
											value={String(g.value)}
										>
											{g.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className='space-y-2'>
							<Label>Năm SX</Label>
							<Input
								type='number'
								min={MIN_ASSET_YEAR}
								max={maxAssetYear()}
								value={manufactureYear}
								onChange={(e) =>
									setManufactureYear(
										clampAssetYearInput(e.target.value)
									)
								}
							/>
						</div>
					</div>
					<div className='space-y-2'>
						<Label>Năm sử dụng</Label>
						<Input
							type='number'
							min={MIN_ASSET_YEAR}
							max={maxAssetYear()}
							value={usageYear}
							onChange={(e) =>
								setUsageYear(
									clampAssetYearInput(e.target.value)
								)
							}
						/>
					</div>

					{isIncDec && (
						<>
							<div className='space-y-2'>
								<Label>Loại biến động *</Label>
								<Select
									value={dir}
									onValueChange={(v) => {
										const next = v as
											| 'INCREASE'
											| 'DECREASE'
										setDir(next)
										setReasonCode('')
										if (next === 'DECREASE') {
											const cap =
												Number(asset.quantity) || 0
											setQuantity((q) =>
												Math.min(
													Math.max(1, q || 1),
													Math.max(0, cap)
												)
											)
										}
									}}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value='INCREASE'>
											Tăng
										</SelectItem>
										<SelectItem value='DECREASE'>
											Giảm
										</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className='space-y-2'>
								<Label>Lý do *</Label>
								<Select
									value={reasonCode}
									onValueChange={setReasonCode}
								>
									<SelectTrigger>
										<SelectValue placeholder='Chọn lý do' />
									</SelectTrigger>
									<SelectContent>
										{reasons.map((r) => (
											<SelectItem
												key={r.value}
												value={r.value}
											>
												{r.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
							{reasonCode === 'OTHER' && (
								<div className='space-y-2'>
									<Label>Lý do khác *</Label>
									<Input
										value={reasonOther}
										onChange={(e) =>
											setReasonOther(e.target.value)
										}
										required
									/>
								</div>
							)}
							{reasonCode !== 'OTHER' && (
								<div className='grid grid-cols-2 gap-3'>
									<div className='space-y-2'>
										<Label>Ngày quyết định</Label>
										<Input
											type='date'
											value={decisionDate}
											onChange={(e) =>
												setDecisionDate(e.target.value)
											}
										/>
									</div>
									<div className='space-y-2'>
										<Label>Số quyết định</Label>
										<Input
											value={decisionNumber}
											onChange={(e) =>
												setDecisionNumber(
													e.target.value
												)
											}
										/>
									</div>
								</div>
							)}
							<div className='grid grid-cols-2 gap-3'>
								<div className='space-y-2'>
									<Label>Người ký</Label>
									<Input
										value={signer}
										onChange={(e) =>
											setSigner(e.target.value)
										}
									/>
								</div>
								<div className='space-y-2'>
									<Label>Người thực hiện</Label>
									<Input
										value={performer}
										onChange={(e) =>
											setPerformer(e.target.value)
										}
									/>
								</div>
							</div>
						</>
					)}

					{!isIncDec && (
						<div className='space-y-2'>
							<Label>Diễn giải lý do cụ thể *</Label>
							<Textarea
								value={explanation}
								onChange={(e) => setExplanation(e.target.value)}
								rows={3}
								required
							/>
						</div>
					)}

					{reasonCode === 'GRADE_UP' ? (
						<div className='space-y-2'>
							<Label>Ghi chú (sửa chữa)</Label>
							<Input
								value={
									isAssetRepaired(asset)
										? 'Đã hoàn thành sửa chữa'
										: 'Chưa hoàn thành sửa chữa'
								}
								readOnly
							/>
						</div>
					) : (
						<div className='space-y-2'>
							<Label>
								{reasonCode === 'LIQUIDATION'
									? 'Ghi chú thanh lý'
									: 'Ghi chú'}
							</Label>
							<Textarea
								value={note}
								onChange={(e) => setNote(e.target.value)}
								rows={2}
								placeholder={
									reasonCode === 'LIQUIDATION'
										? 'VD: Quyết định thanh lý…'
										: undefined
								}
							/>
						</div>
					)}

					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button
							type='submit'
							disabled={
								pending ||
								(reasonCode === 'GRADE_UP' &&
									!isAssetRepaired(asset) &&
									((asset.grade ?? 1) === 5 ||
										asset.status === 'BROKEN' ||
										asset.status === 'REPAIRING'))
							}
						>
							{pending ? 'Đang lưu…' : 'Lưu'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}

/** Dialog chọn loại cập nhật */
export function AssetUpdateChooserDialog({
	open,
	onOpenChange,
	onChoose
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	onChoose: (mode: MovementMode) => void
}) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Cập nhật vật tư</DialogTitle>
				</DialogHeader>
				<div className='grid gap-3 py-2'>
					<Button
						variant='outline'
						className='h-auto py-4 flex flex-col items-start'
						onClick={() => {
							onOpenChange(false)
							onChoose('increase-decrease')
						}}
					>
						<span className='font-medium'>
							Nhập tăng giảm vật tư
						</span>
						<span className='text-xs text-muted-foreground font-normal'>
							Ghi nhận tăng/giảm số lượng kèm lý do và quyết định
						</span>
					</Button>
					<Button
						variant='outline'
						className='h-auto py-4 flex flex-col items-start'
						onClick={() => {
							onOpenChange(false)
							onChoose('adjust')
						}}
					>
						<span className='font-medium'>
							Cập nhật điều chỉnh số liệu vật tư
						</span>
						<span className='text-xs text-muted-foreground font-normal'>
							Điều chỉnh số liệu với diễn giải lý do cụ thể
						</span>
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}
