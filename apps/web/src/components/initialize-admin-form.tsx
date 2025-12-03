import { Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import { useAppForm } from '@/hooks/demo.form'
import * as z from 'zod'
import { useMutation } from '@tanstack/react-query'
import { InitAdmin } from '@/api'
import { toast } from 'sonner'
import { useNavigate } from '@tanstack/react-router'

const InitAdminSchema = z
	.object({
		username: z.string().nonempty('Tên đăng nhập không được bỏ trống'),
		displayName: z.string().nonempty('Họ và tên không được bỏ trống'),

		password: z
			.string()
			.min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
			.regex(/[A-Z]/, 'Mật khẩu phải chứa ít nhất 1 chữ hoa')
			.regex(/[a-z]/, 'Mật khẩu phải chứa ít nhất 1 chữ thường')
			.regex(/[0-9]/, 'Mật khẩu phải chứa ít nhất 1 chữ số'),

		confirmPassword: z.string().nonempty('Vui lòng xác nhận mật khẩu')
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: 'Mật khẩu xác nhận không khớp',
		path: ['confirmPassword'] // highlight the correct field
	})

export default function InitializeAdminForm() {
	const navigate = useNavigate()
	const { mutateAsync } = useMutation({
		mutationFn: InitAdmin,
		onSuccess: () => {
			toast.success('Khởi tạo tài khoản quản trị thành công!', {
				description: 'Bây giờ bạn đã có thể đăng nhập vào hệ thống.'
			})
			navigate({ to: '/', replace: true })
		},
		onError: (err) => {
			console.error('InitAdmin failed', err)
			toast.error(
				'Khởi tạo tài khoản quản trị thất bại, đã có lỗi xảy ra, vui lòng liên hệ kỹ thuật viên!'
			)
		}
	})
	const form = useAppForm({
		defaultValues: {
			username: '',
			password: '',
			confirmPassword: '',
			displayName: ''
		},
		onSubmit: async ({ value }) => {
			await mutateAsync(value)
		},
		validators: { onChange: InitAdminSchema }
	})

	return (
		<Card className='w-full max-w-md border-border/50 shadow-lg'>
			<CardHeader className='space-y-1 pb-6'>
				<div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary'>
					<Shield className='h-6 w-6 text-primary-foreground' />
				</div>
				<CardTitle className='text-center text-2xl font-semibold tracking-tight'>
					Khởi tạo quản trị viên
				</CardTitle>
				<CardDescription className='text-center text-muted-foreground'>
					Hãy khởi tạo tài khoản quản trị viên của bạn để sử dụng hệ
					thống
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						form.handleSubmit()
					}}
					className='space-y-4'
				>
					<div className='space-y-2'>
						<form.AppField name='displayName'>
							{(field) => <field.TextField label='Họ và tên' />}
						</form.AppField>
					</div>

					<div className='space-y-2'>
						<form.AppField name='username'>
							{(field) => (
								<field.TextField label='Tên đăng nhập' />
							)}
						</form.AppField>
					</div>

					<div className='space-y-2'>
						<form.AppField name='password'>
							{(field) => (
								<field.TextField
									type='password'
									label='Mật khẩu'
								/>
							)}
						</form.AppField>
					</div>

					<div className='space-y-2'>
						<form.AppField name='confirmPassword'>
							{(field) => (
								<field.TextField
									type='password'
									label='Mật khẩu xác nhận'
								/>
							)}
						</form.AppField>
					</div>

					<form.Subscribe
						selector={(state) => [
							state.canSubmit,
							state.isSubmitting
						]}
						children={([canSubmit, isSubmitting]) => (
							<Button
								className='w-full'
								disabled={!canSubmit}
								type='submit'
							>
								{isSubmitting ? 'Đang khởi tạo...' : 'Khởi tạo'}
							</Button>
						)}
					/>
				</form>
			</CardContent>
		</Card>
	)
}
