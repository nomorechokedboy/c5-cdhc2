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
import type { Room } from '@/types/asset'
import { useRoomMutations } from '@/hooks/useRooms'
import useUnitsData from '@/hooks/useUnitsData'
import { toast } from 'sonner'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	floorId: number
	/** Gợi ý mã phòng: H1.101 */
	locationPrefix?: string
	room?: Room | null
}

const STATUSES = [
	{ value: 'ACTIVE', label: 'Đang dùng' },
	{ value: 'INACTIVE', label: 'Ngưng' },
	{ value: 'MAINTENANCE', label: 'Bảo trì' }
]

export default function RoomDialog({
	open,
	onOpenChange,
	floorId,
	locationPrefix,
	room
}: Props) {
	const isEdit = !!room
	const { create, update } = useRoomMutations()
	const unitsQ = useUnitsData()
	const [roomCode, setRoomCode] = useState('')
	const [roomName, setRoomName] = useState('')
	const [roomType, setRoomType] = useState('')
	const [manager, setManager] = useState('')
	const [managerCode, setManagerCode] = useState('')
	const [capacity, setCapacity] = useState(0)
	const [status, setStatus] = useState('ACTIVE')
	const [description, setDescription] = useState('')

	useEffect(() => {
		if (room) {
			setRoomCode(room.roomCode)
			setRoomName(room.roomName)
			setRoomType(room.roomType ?? '')
			setManager(room.manager ?? '')
			setManagerCode(room.managerCode ?? '')
			setCapacity(room.capacity ?? 0)
			setStatus(room.status ?? 'ACTIVE')
			setDescription(room.description ?? '')
		} else {
			setRoomCode(locationPrefix ? `${locationPrefix}.` : '')
			setRoomName('')
			setRoomType('')
			setManager('')
			setManagerCode('')
			setCapacity(0)
			setStatus('ACTIVE')
			setDescription('')
		}
	}, [room, locationPrefix])

	const pending = create.isPending || update.isPending

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!roomCode.trim() || !roomName.trim()) {
			toast.error('Mã phòng và tên phòng là bắt buộc')
			return
		}
		const body = {
			floorId,
			roomCode,
			roomName,
			roomType: roomType || undefined,
			// Chỉ text «Đơn vị quản lý» — không tạo TK đăng nhập phòng
			manager: manager || undefined,
			managerCode: managerCode || undefined,
			capacity,
			status,
			description: description || undefined
		}
		try {
			if (isEdit && room) {
				await update.mutateAsync({ id: room.id, body })
				toast.success('Cập nhật phòng thành công')
			} else {
				await create.mutateAsync(body)
				toast.success('Thêm phòng thành công')
			}
			onOpenChange(false)
		} catch (err) {
			toast.error(
				isEdit ? 'Cập nhật phòng thất bại' : 'Thêm phòng thất bại',
				{ description: (err as Error).message }
			)
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? 'Sửa phòng' : 'Thêm phòng'}
					</DialogTitle>
				</DialogHeader>
				<form className='space-y-4' onSubmit={handleSubmit}>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='roomCode'>Mã phòng *</Label>
							<Input
								id='roomCode'
								value={roomCode}
								onChange={(e) => setRoomCode(e.target.value)}
								placeholder='VD: H1.101'
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='roomName'>Tên phòng *</Label>
							<Input
								id='roomName'
								value={roomName}
								onChange={(e) => setRoomName(e.target.value)}
								required
							/>
						</div>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2 col-span-2'>
							<Label>Đơn vị quản lý</Label>
							<Select
								value={managerCode || 'none'}
								onValueChange={(v) => {
									const unit = unitsQ.data?.find(
										(u) => u.alias === v
									)
									setManagerCode(v === 'none' ? '' : v)
									setManager(
										v === 'none' ? '' : unit?.name || ''
									)
								}}
							>
								<SelectTrigger>
									<SelectValue placeholder='Chọn đơn vị sử dụng' />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value='none'>
										Chưa chọn
									</SelectItem>
									{(unitsQ.data || []).map((unit) => (
										<SelectItem
											key={unit.id}
											value={unit.alias}
										>
											{unit.alias} — {unit.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<p className='text-[11px] text-muted-foreground'>
								Chỉ ghi nhận đơn vị quản lý phòng — không tạo
								tài khoản đăng nhập. TK đăng nhập: đơn vị sử
								dụng / ngành.
							</p>
						</div>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='roomType'>Loại phòng</Label>
							<Input
								id='roomType'
								value={roomType}
								onChange={(e) => setRoomType(e.target.value)}
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='capacity'>Sức chứa</Label>
							<Input
								id='capacity'
								type='number'
								min={0}
								value={capacity}
								onChange={(e) =>
									setCapacity(Number(e.target.value))
								}
							/>
						</div>
					</div>
					<div className='space-y-2'>
						<Label>Trạng thái</Label>
						<Select value={status} onValueChange={setStatus}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{STATUSES.map((s) => (
									<SelectItem key={s.value} value={s.value}>
										{s.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className='space-y-2'>
						<Label htmlFor='roomDesc'>Mô tả</Label>
						<Textarea
							id='roomDesc'
							value={description}
							onChange={(e) => setDescription(e.target.value)}
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
							{pending
								? 'Đang lưu…'
								: isEdit
									? 'Cập nhật'
									: 'Thêm'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
