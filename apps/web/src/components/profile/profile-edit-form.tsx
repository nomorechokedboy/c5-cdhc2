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
import { UpdateUser } from '@/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect } from 'react'
import { userRankOptions, userPositionOptions } from '@/data/ethnics'
import type { User } from '@/types'

const schema = z.object({
	id: z.number(),
	displayName: z.string().min(1, 'Họ và tên không được bỏ trống'),
	rank: z.string().optional(),
	position: z.string().optional()
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

	const { mutateAsync } = useMutation({
		mutationFn: UpdateUser,
		onSuccess: () => {
			// Invalidate auth cache to refetch user data
			queryClient.invalidateQueries({ queryKey: ['auth', 'user'] })
			toast.success('Cập nhật thông tin thành công')
			setOpen(false)
		},
		onError: (error) => {
			console.error('Failed to update profile:', error)
			toast.error('Cập nhật thông tin thất bại')
		}
	})

	const form = useAppForm({
		defaultValues: {
			id: user.id,
			displayName: user.displayName,
			rank: user.rank || '',
			position: user.position || ''
		},
		onSubmit: async ({ value }: { value: any }) => {
			const parsed = schema.parse(value)
			await mutateAsync(parsed)
		},
		validators: {
			onBlur: schema
		}
	})

	useEffect(() => {
		if (open) {
			form.reset({
				id: user.id,
				displayName: user.displayName,
				rank: user.rank || '',
				position: user.position || ''
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

					<form.AppField name='position'>
						{(field: any) => (
							<field.Select
								label='Chức vụ'
								placeholder='Chọn chức vụ'
								values={userPositionOptions}
								value={field.state.value}
							/>
						)}
					</form.AppField>

					{/* Read-only unit display */}
					<div className='space-y-2'>
						<label className='text-sm font-medium'>Đơn vị</label>
						<div className='border rounded-md px-3 py-2 bg-muted'>
							{user.unitName || '—'}
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
