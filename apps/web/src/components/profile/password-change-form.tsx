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
import { ChangePassword } from '@/api'
import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useEffect } from 'react'
import useAuth from '@/hooks/useAuth'

const schema = z
	.object({
		prevPassword: z
			.string()
			.min(1, 'Mật khẩu hiện tại không được bỏ trống'),
		password: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
		confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu')
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Mật khẩu xác nhận không khớp',
		path: ['confirmPassword']
	})

interface PasswordChangeFormProps {
	open: boolean
	setOpen: (open: boolean) => void
}

export default function PasswordChangeForm({
	open,
	setOpen
}: PasswordChangeFormProps) {
	const { logout } = useAuth()

	const { mutateAsync } = useMutation({
		mutationFn: ChangePassword,
		onSuccess: () => {
			toast.success('Đổi mật khẩu thành công. Vui lòng đăng nhập lại.')
			setOpen(false)
			// Logout user to force re-login with new password
			setTimeout(() => logout(), 1500)
		},
		onError: (error: any) => {
			console.error('Failed to change password:', error)
			const message = error?.message || 'Đổi mật khẩu thất bại'
			toast.error(
				message === 'Incorrect password'
					? 'Mật khẩu hiện tại không đúng'
					: message
			)
		}
	})

	const form = useAppForm({
		defaultValues: {
			prevPassword: '',
			password: '',
			confirmPassword: ''
		},
		onSubmit: async ({ value, formApi }: { value: any; formApi: any }) => {
			const parsed = schema.parse(value)
			await mutateAsync({
				prevPassword: parsed.prevPassword,
				password: parsed.password
			})
			formApi.reset()
		},
		validators: {
			onBlur: schema
		}
	})

	useEffect(() => {
		if (open) {
			form.reset({
				prevPassword: '',
				password: '',
				confirmPassword: ''
			})
		}
	}, [open])

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Đổi mật khẩu</DialogTitle>
				</DialogHeader>
				<form
					onSubmit={(e) => {
						e.preventDefault()
						form.handleSubmit()
					}}
					className='space-y-4'
				>
					<form.AppField name='prevPassword'>
						{(field: any) => (
							<field.TextField
								label='Mật khẩu hiện tại'
								type='password'
								placeholder='Nhập mật khẩu hiện tại'
							/>
						)}
					</form.AppField>

					<form.AppField name='password'>
						{(field: any) => (
							<field.TextField
								label='Mật khẩu mới'
								type='password'
								placeholder='Nhập mật khẩu mới (tối thiểu 6 ký tự)'
							/>
						)}
					</form.AppField>

					<form.AppField name='confirmPassword'>
						{(field: any) => (
							<field.TextField
								label='Xác nhận mật khẩu mới'
								type='password'
								placeholder='Nhập lại mật khẩu mới'
							/>
						)}
					</form.AppField>

					<DialogFooter>
						<DialogClose asChild>
							<Button variant='outline'>Hủy</Button>
						</DialogClose>
						<form.AppForm>
							<form.SubscribeButton label='Đổi mật khẩu' />
						</form.AppForm>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	)
}
