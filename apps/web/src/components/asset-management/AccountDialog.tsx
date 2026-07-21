/**
 * Dialog thêm/sửa tài khoản phòng.
 * - Thêm: mã tài khoản + mật khẩu (mặc định 123456)
 * - Sửa: được sửa mã tài khoản, tên hiển thị, mật khẩu
 */
import { useEffect, useMemo, useState } from 'react'
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
import type { BuildingTree, Room } from '@/types/asset'
import { useRoomMutations } from '@/hooks/useRooms'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
	SearchableSelect,
	type SearchableOption
} from '@/components/ui/searchable-select'

type FlatRoom = Room & {
	buildingId: number
	buildingCode: string
	buildingName: string
	floorId: number
	floorName: string
	floorNumber: number
	address?: string | null
}

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	tree: BuildingTree[]
	defaultBuildingId?: number | null
	room?: FlatRoom | null
}

export default function AccountDialog({
	open,
	onOpenChange,
	tree,
	defaultBuildingId,
	room
}: Props) {
	const isEdit = !!room
	const { create, update } = useRoomMutations()
	const qc = useQueryClient()

	const [buildingId, setBuildingId] = useState<string>('')
	const [floorId, setFloorId] = useState<string>('')
	const [roomCode, setRoomCode] = useState('')
	const [roomName, setRoomName] = useState('')
	const [displayName, setDisplayName] = useState('')
	const [accountCode, setAccountCode] = useState('')
	const [password, setPassword] = useState('')
	const [password2, setPassword2] = useState('')

	const buildingOptions: SearchableOption[] = useMemo(
		() =>
			tree.map((b) => ({
				value: String(b.id),
				label: `${b.code} — ${b.name}`,
				keywords: b.address ?? ''
			})),
		[tree]
	)

	const selectedBuilding = useMemo(
		() => tree.find((b) => String(b.id) === buildingId) ?? null,
		[tree, buildingId]
	)

	const floorOptions: SearchableOption[] = useMemo(() => {
		const floors = selectedBuilding?.floors ?? []
		return floors.map((f) => ({
			value: String(f.id),
			label: `${f.name} (số ${f.floorNumber})`,
			keywords: f.code ?? ''
		}))
	}, [selectedBuilding])

	const address = selectedBuilding?.address || '—'

	useEffect(() => {
		if (!open) return
		if (room) {
			setBuildingId(String(room.buildingId))
			setFloorId(String(room.floorId))
			setRoomCode(room.roomCode)
			setRoomName(room.roomName)
			setDisplayName(room.manager ?? '')
			setAccountCode(room.managerCode ?? room.roomCode)
			setPassword('')
			setPassword2('')
		} else {
			const bid =
				defaultBuildingId != null
					? String(defaultBuildingId)
					: tree[0]
						? String(tree[0].id)
						: ''
			setBuildingId(bid)
			const b = tree.find((x) => String(x.id) === bid)
			const firstFloor = b?.floors?.[0]
			setFloorId(firstFloor ? String(firstFloor.id) : '')
			const prefix = firstFloor
				? firstFloor.code || `${b?.code ?? ''}${firstFloor.floorNumber}`
				: ''
			const code = prefix ? `${prefix}.` : ''
			setRoomCode(code)
			setRoomName('')
			setDisplayName('')
			setAccountCode('')
			setPassword('123456')
			setPassword2('123456')
		}
	}, [open, room, defaultBuildingId, tree])

	useEffect(() => {
		if (!open || room) return
		const b = tree.find((x) => String(x.id) === buildingId)
		const firstFloor = b?.floors?.[0]
		setFloorId(firstFloor ? String(firstFloor.id) : '')
	}, [buildingId])

	// Gợi ý mã tài khoản = mã phòng khi tạo
	useEffect(() => {
		if (!open || isEdit) return
		if (roomCode.trim()) setAccountCode(roomCode.trim())
	}, [roomCode, open, isEdit])

	const pending = create.isPending || update.isPending

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		if (!floorId) {
			toast.error('Chọn tầng')
			return
		}
		if (!roomCode.trim() || !roomName.trim()) {
			toast.error('Mã phòng và tên phòng là bắt buộc')
			return
		}
		if (!accountCode.trim()) {
			toast.error('Mã tài khoản là bắt buộc')
			return
		}
		if (password || password2) {
			if (password !== password2) {
				toast.error('Mật khẩu xác nhận không khớp')
				return
			}
			if (password.length < 4) {
				toast.error('Mật khẩu tối thiểu 4 ký tự')
				return
			}
		}
		if (!isEdit && !password) {
			toast.error('Nhập mật khẩu (mặc định 123456)')
			return
		}

		try {
			if (isEdit && room) {
				const body: {
					floorId: number
					roomCode: string
					roomName: string
					manager?: string
					managerCode?: string
					accountPassword?: string
				} = {
					floorId: Number(floorId),
					roomCode: roomCode.trim(),
					roomName: roomName.trim(),
					manager: displayName.trim() || undefined,
					managerCode: accountCode.trim()
				}
				if (password.trim()) {
					body.accountPassword = password.trim()
				}
				await update.mutateAsync({ id: room.id, body })
				toast.success(
					password.trim()
						? 'Đã cập nhật tài khoản (kèm mật khẩu mới)'
						: 'Đã cập nhật tài khoản'
				)
			} else {
				await create.mutateAsync({
					floorId: Number(floorId),
					roomCode: roomCode.trim(),
					roomName: roomName.trim(),
					manager: displayName.trim() || roomName.trim(),
					managerCode: accountCode.trim() || roomCode.trim(),
					accountPassword: password.trim() || '123456'
				})
				toast.success('Đã thêm tài khoản phòng', {
					description:
						'Đã tạo user tương ứng trong Danh sách người dùng (chờ cấp quyền). Mở menu Quản lý người dùng để gán vai trò.'
				})
			}
			// Làm mới badge + Danh sách người dùng (đồng bộ user từ TK phòng)
			await Promise.all([
				qc.invalidateQueries({ queryKey: ['pending-permissions'] }),
				qc.invalidateQueries({ queryKey: ['pending-room-accounts'] }),
				qc.invalidateQueries({ queryKey: ['users'] }),
				qc.refetchQueries({ queryKey: ['users'], type: 'all' }),
				qc.refetchQueries({
					queryKey: ['pending-permissions'],
					type: 'all'
				})
			])
			onOpenChange(false)
		} catch (err) {
			toast.error(isEdit ? 'Cập nhật thất bại' : 'Thêm thất bại', {
				description: (err as Error).message
			})
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-lg'>
				<DialogHeader>
					<DialogTitle>
						{isEdit ? 'Sửa tài khoản' : 'Thêm tài khoản'}
					</DialogTitle>
				</DialogHeader>
				<form className='space-y-4' onSubmit={handleSubmit}>
					<div className='space-y-2'>
						<Label>Tòa nhà</Label>
						<SearchableSelect
							value={buildingId}
							onValueChange={setBuildingId}
							options={buildingOptions}
							placeholder='Chọn tòa…'
							searchPlaceholder='Gõ mã/tên tòa…'
							disabled={isEdit}
						/>
					</div>
					<div className='space-y-2'>
						<Label>Tầng *</Label>
						<SearchableSelect
							value={floorId}
							onValueChange={setFloorId}
							options={floorOptions}
							placeholder={
								floorOptions.length
									? 'Chọn tầng…'
									: 'Tòa chưa có tầng'
							}
							searchPlaceholder='Gõ tên tầng…'
							emptyText='Không có tầng'
						/>
					</div>
					<div className='space-y-2'>
						<Label>Địa chỉ (từ tòa nhà)</Label>
						<Input value={address} readOnly className='bg-muted' />
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='acc-code'>Mã phòng *</Label>
							<Input
								id='acc-code'
								value={roomCode}
								onChange={(e) => setRoomCode(e.target.value)}
								placeholder='H1.101'
								required
								className='font-mono'
								disabled={isEdit}
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='acc-name'>Tên phòng *</Label>
							<Input
								id='acc-name'
								value={roomName}
								onChange={(e) => setRoomName(e.target.value)}
								placeholder='Phòng họp / Phòng học…'
								required
							/>
						</div>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='acc-mcode'>Mã tài khoản *</Label>
							<Input
								id='acc-mcode'
								value={accountCode}
								onChange={(e) => setAccountCode(e.target.value)}
								placeholder='Username đăng nhập'
								className='font-mono'
								required
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='acc-display'>Tên hiển thị</Label>
							<Input
								id='acc-display'
								value={displayName}
								onChange={(e) => setDisplayName(e.target.value)}
								placeholder='Họ tên / tên gọi'
							/>
						</div>
					</div>
					<div className='grid grid-cols-2 gap-3'>
						<div className='space-y-2'>
							<Label htmlFor='acc-pw'>
								{isEdit ? 'Mật khẩu mới' : 'Mật khẩu *'}
							</Label>
							<Input
								id='acc-pw'
								type='password'
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder={
									isEdit
										? 'Để trống nếu không đổi'
										: 'Mặc định 123456'
								}
								autoComplete='new-password'
							/>
						</div>
						<div className='space-y-2'>
							<Label htmlFor='acc-pw2'>Xác nhận MK</Label>
							<Input
								id='acc-pw2'
								type='password'
								value={password2}
								onChange={(e) => setPassword2(e.target.value)}
								placeholder='Nhập lại mật khẩu'
								autoComplete='new-password'
							/>
						</div>
					</div>
					<p className='text-xs text-muted-foreground'>
						Có thể sửa mã tài khoản, tên hiển thị và mật khẩu. Mật
						khẩu ẩn trên danh sách. Nút Reset chỉ đặt MK về{' '}
						<code>123456</code>.
					</p>
					<DialogFooter>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button type='submit' disabled={pending || !floorId}>
							{pending
								? 'Đang lưu…'
								: isEdit
									? 'Cập nhật'
									: 'Thêm tài khoản'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
