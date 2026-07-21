import { useAppForm } from '@/hooks/demo.form'
import {
	Dialog,
	DialogHeader,
	DialogContent,
	DialogTitle,
	DialogClose,
	DialogFooter
} from '@/components/ui/dialog'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { UpdateMyProfile } from '@/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { userRankOptions, positionSkipsUnit } from '@/data/ethnics'
import type { User } from '@/types'

const schema = z.object({
	displayName: z.string().min(1, 'Họ và tên không được bỏ trống'),
	rank: z.string().optional()
})

interface ProfileEditFormProps {
	open: boolean
	setOpen: (open: boolean) => void
	user: User
}

export default function ProfileEditForm({
	open,
	setOpen,
	user
}: ProfileEditFormProps) {
	const queryClient = useQueryClient()
	const skipUnit = positionSkipsUnit(user.position)

	const { mutateAsync } = useMutation({
		mutationFn: UpdateMyProfile,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
			toast.success('Cập nhật thông tin thành công')
			setOpen(false)
		},
		onError: (error) => {
			console.error('Failed to update profile:', error)
			toast.error('Cập nhật thông tin thất bại', {
				description: (error as Error).message
			})
		}
	})

	const form = useAppForm({
		defaultValues: {
			displayName: user.displayName,
			rank: user.rank || ''
		},
		onSubmit: async ({ value }: { value: any }) => {
			const parsed = schema.parse(value)
			// Chỉ họ tên + cấp bậc — chức vụ gắn loại TK, không gửi
			await mutateAsync({
				displayName: parsed.displayName,
				rank: parsed.rank
			})
		},
		validators: {
			onBlur: schema
		}
	})

	useEffect(() => {
		if (open) {
			form.reset({
				displayName: user.displayName,
				rank: user.rank || ''
			})
		}
	}, [open, user])

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Chỉnh sửa thông tin cá nhân</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className='space-y-4'
				>
					<form.AppField name='displayName'>
						{(field: any) => <field.TextField label='Họ và tên' />}
					</form.AppField>

					<form.AppField name='rank'>
						{(field: any) => (
							<field.Select
								label='Cấp bậc'
								placeholder='Chọn cấp bậc'
								values={userRankOptions}
								value={field.state.value}
							/>
						)}
					</form.AppField>

					{/* Chức vụ gắn loại tài khoản — chỉ xem */}
					<div className='space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm'>
						<div>
							<span className='text-muted-foreground'>
								Chức vụ:{' '}
							</span>
							<strong>{user.position || '—'}</strong>
						</div>
						<p className='text-xs text-muted-foreground'>
							Chức vụ gắn theo loại tài khoản — không chỉnh sửa.
						</p>
					</div>

					<div className='space-y-2'>
						<label className='text-sm font-medium'>Đơn vị</label>
						<div className='border rounded-md px-3 py-2 bg-muted text-sm'>
							{skipUnit ? 'Không áp dụng' : user.unitName || '—'}
						</div>
					</div>

					<DialogFooter>
						<DialogClose asChild>
							<Button variant='outline'>Hủy</Button>
						</DialogClose>
						<form.AppForm>
							<form.SubscribeButton label='Lưu' />
						</form.AppForm>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
