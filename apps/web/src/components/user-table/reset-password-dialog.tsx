/**
 * Admin đặt lại mật khẩu cho user trong danh sách người dùng.
 */
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { KeyRound, Loader2 } from 'lucide-react'
import { UpdateUser } from '@/api'
import type { User } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	user: User
	onSuccess?: () => void
}

export default function ResetPasswordDialog({
	open,
	onOpenChange,
	user,
	onSuccess
}: Props) {
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')

	const mut = useMutation({
		mutationFn: UpdateUser,
		onSuccess: () => {
			toast.success(
				`Đã đổi mật khẩu cho «${user.displayName || user.username}»`
			)
			setPassword('')
			setConfirm('')
			onOpenChange(false)
			onSuccess?.()
		},
		onError: (e: Error) => {
			toast.error(e.message || 'Đổi mật khẩu thất bại')
		}
	})

	const submit = (plain: string) => {
		if (plain.length < 4) {
			toast.error('Mật khẩu tối thiểu 4 ký tự')
			return
		}
		mut.mutate({
			id: user.id,
			displayName: user.displayName,
			unitId: user.unitId ?? undefined,
			isSuperUser: user.isSuperUser,
			rank: user.rank || undefined,
			position: user.position || undefined,
			password: plain
		})
	}

	const handleSubmit = () => {
		if (!password.trim()) {
			toast.error('Nhập mật khẩu mới')
			return
		}
		if (password !== confirm) {
			toast.error('Mật khẩu xác nhận không khớp')
			return
		}
		submit(password.trim())
	}

	return (
		<Dialog
			open={open}
			onOpenChange={(o) => {
				if (!o) {
					setPassword('')
					setConfirm('')
				}
				onOpenChange(o)
			}}
		>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2'>
						<KeyRound className='w-5 h-5' />
						Đặt lại mật khẩu
					</DialogTitle>
				</DialogHeader>
				<div className='space-y-3 py-1'>
					<p className='text-sm text-muted-foreground'>
						User:{' '}
						<strong>{user.displayName || user.username}</strong>
					</p>
					<div className='space-y-1.5'>
						<Label htmlFor='rp-new'>Mật khẩu mới</Label>
						<Input
							id='rp-new'
							type='password'
							autoComplete='new-password'
							value={password}
							onChange={(e) => setPassword(e.target.value)}
							placeholder='Tối thiểu 4 ký tự'
						/>
					</div>
					<div className='space-y-1.5'>
						<Label htmlFor='rp-confirm'>Xác nhận mật khẩu</Label>
						<Input
							id='rp-confirm'
							type='password'
							autoComplete='new-password'
							value={confirm}
							onChange={(e) => setConfirm(e.target.value)}
							placeholder='Nhập lại mật khẩu'
							onKeyDown={(e) => {
								if (e.key === 'Enter') handleSubmit()
							}}
						/>
					</div>
					<p className='text-xs text-muted-foreground'>
						Hoặc đặt nhanh mật khẩu mặc định{' '}
						<code className='font-mono'>123456</code>.
					</p>
				</div>
				<DialogFooter className='flex-wrap gap-2 sm:justify-between'>
					<Button
						type='button'
						variant='secondary'
						disabled={mut.isPending}
						onClick={() => submit('123456')}
					>
						Đặt 123456
					</Button>
					<div className='flex gap-2'>
						<Button
							type='button'
							variant='outline'
							onClick={() => onOpenChange(false)}
						>
							Hủy
						</Button>
						<Button
							type='button'
							disabled={mut.isPending}
							onClick={handleSubmit}
						>
							{mut.isPending ? (
								<Loader2 className='w-4 h-4 animate-spin' />
							) : (
								'Lưu mật khẩu'
							)}
						</Button>
					</div>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
