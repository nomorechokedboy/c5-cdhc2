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
	CreateInventoryLogBody,
	CreateRepairLogBody,
	CreateReplacementLogBody,
	RoomAsset
} from '@/types/asset'
import { useState } from 'react'
import { toast } from 'sonner'

type Kind = 'repair' | 'inventory' | 'replacement'

type Props = {
	kind: Kind
	open: boolean
	onOpenChange: (open: boolean) => void
	assets: RoomAsset[]
	onCreateRepair: (body: CreateRepairLogBody) => Promise<void>
	onCreateInventory: (body: CreateInventoryLogBody) => Promise<void>
	onCreateReplacement: (body: CreateReplacementLogBody) => Promise<void>
}

function today() {
	return new Date().toISOString().slice(0, 10)
}

export default function LogDialogs({
	kind,
	open,
	onOpenChange,
	assets,
	onCreateRepair,
	onCreateInventory,
	onCreateReplacement
}: Props) {
	const [pending, setPending] = useState(false)
	const [roomAssetId, setRoomAssetId] = useState(String(assets[0]?.id ?? ''))
	const [date, setDate] = useState(today())
	const [content, setContent] = useState('')
	const [cost, setCost] = useState(0)
	const [performer, setPerformer] = useState('')
	const [note, setNote] = useState('')
	const [actualQuantity, setActualQuantity] = useState(1)
	const [expectedQuantity, setExpectedQuantity] = useState<string>('')
	const [result, setResult] = useState('')
	const [oldAsset, setOldAsset] = useState('')
	const [newAsset, setNewAsset] = useState('')
	const [reason, setReason] = useState('')

	const titles: Record<Kind, string> = {
		repair: 'Ghi nhật ký sửa chữa',
		inventory: 'Ghi nhật ký kiểm kê',
		replacement: 'Ghi lịch sử thay thế'
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		const assetId = Number(roomAssetId)
		if (!assetId) {
			toast.error('Chọn vật tư')
			return
		}
		setPending(true)
		try {
			if (kind === 'repair') {
				if (!content.trim()) {
					toast.error('Nội dung sửa chữa là bắt buộc')
					return
				}
				await onCreateRepair({
					roomAssetId: assetId,
					repairDate: date,
					content,
					cost,
					performer: performer || undefined,
					note: note || undefined
				})
			} else if (kind === 'inventory') {
				await onCreateInventory({
					roomAssetId: assetId,
					inventoryDate: date,
					actualQuantity,
					expectedQuantity:
						expectedQuantity === ''
							? undefined
							: Number(expectedQuantity),
					result: result || undefined,
					note: note || undefined
				})
			} else {
				if (!oldAsset.trim() || !newAsset.trim()) {
					toast.error('Vật tư cũ và mới là bắt buộc')
					return
				}
				await onCreateReplacement({
					roomAssetId: assetId,
					replacementDate: date,
					oldAsset,
					newAsset,
					reason: reason || undefined,
					performer: performer || undefined,
					note: note || undefined
				})
			}
			toast.success('Ghi nhật ký thành công')
			onOpenChange(false)
		} catch (err) {
			toast.error('Ghi nhật ký thất bại', {
				description: (err as Error).message
			})
		} finally {
			setPending(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>{titles[kind]}</DialogTitle>
				</DialogHeader>
				<form className='space-y-3' onSubmit={handleSubmit}>
					<div className='space-y-2'>
						<Label>Vật tư *</Label>
						<Select
							value={roomAssetId}
							onValueChange={setRoomAssetId}
						>
							<SelectTrigger>
								<SelectValue placeholder='Chọn vật tư' />
							</SelectTrigger>
							<SelectContent>
								{assets.map((a) => (
									<SelectItem key={a.id} value={String(a.id)}>
										{a.name} ({a.category})
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-2'>
						<Label>Ngày *</Label>
						<Input
							type='date'
							value={date}
							onChange={(e) => setDate(e.target.value)}
							required
						/>
					</div>

					{kind === 'repair' && (
						<>
							<div className='space-y-2'>
								<Label>Nội dung *</Label>
								<Textarea
									value={content}
									onChange={(e) => setContent(e.target.value)}
									required
								/>
							</div>
							<div className='grid grid-cols-2 gap-3'>
								<div className='space-y-2'>
									<Label>Chi phí</Label>
									<Input
										type='number'
										min={0}
										value={cost}
										onChange={(e) =>
											setCost(Number(e.target.value))
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

					{kind === 'inventory' && (
						<>
							<div className='grid grid-cols-2 gap-3'>
								<div className='space-y-2'>
									<Label>SL thực tế *</Label>
									<Input
										type='number'
										min={0}
										value={actualQuantity}
										onChange={(e) =>
											setActualQuantity(
												Number(e.target.value)
											)
										}
										required
									/>
								</div>
								<div className='space-y-2'>
									<Label>SL sổ sách</Label>
									<Input
										type='number'
										min={0}
										value={expectedQuantity}
										onChange={(e) =>
											setExpectedQuantity(e.target.value)
										}
										placeholder='mặc định = SL hiện tại'
									/>
								</div>
							</div>
							<div className='space-y-2'>
								<Label>Kết quả</Label>
								<Input
									value={result}
									onChange={(e) => setResult(e.target.value)}
									placeholder='OK / Thiếu / Thừa…'
								/>
							</div>
						</>
					)}

					{kind === 'replacement' && (
						<>
							<div className='space-y-2'>
								<Label>Vật tư cũ *</Label>
								<Input
									value={oldAsset}
									onChange={(e) =>
										setOldAsset(e.target.value)
									}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label>Vật tư mới *</Label>
								<Input
									value={newAsset}
									onChange={(e) =>
										setNewAsset(e.target.value)
									}
									required
								/>
							</div>
							<div className='space-y-2'>
								<Label>Lý do</Label>
								<Input
									value={reason}
									onChange={(e) => setReason(e.target.value)}
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
						</>
					)}

					<div className='space-y-2'>
						<Label>Ghi chú</Label>
						<Textarea
							value={note}
							onChange={(e) => setNote(e.target.value)}
							rows={2}
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
						<Button type='submit' disabled={pending}>
							{pending ? 'Đang lưu…' : 'Lưu'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
