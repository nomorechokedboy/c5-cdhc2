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
import { useMutation } from '@tanstack/react-query'
import type { UpdateUserBody, User, UserUpdate } from '@/types'
import { toast } from 'sonner'
import { useEffect } from 'react'
import useUnitsData from '@/hooks/useUnitsData'
import { userRankOptions, positionSkipsUnit } from '@/data/ethnics'

const schema = z
	.object({
		id: z.number().optional(),
		displayName: z.string().min(1, 'Họ và tên không được bỏ trống'),
		password: z.string().optional(),
		confirmPassword: z.string().optional(),
		unitId: z.preprocess((val) => {
			if (val === '' || val === null || val === undefined)
				return undefined
			if (typeof val === 'string') {
				const n = Number.parseInt(val, 10)
				return Number.isFinite(n) ? n : undefined
			}
			return val
		}, z.number().optional()),
		isSuperUser: z.preprocess((val) => {
			if (val === 'true' || val === true) return true
			if (val === 'false' || val === false) return false
			return val
		}, z.boolean()),
		rank: z.string().optional(),
		/** URL / data-URL ảnh chữ ký số (BGH) */
		signatureUrl: z.string().optional()
	})
	.refine(
		(data) => {
			if (data.password && data.password.length > 0) {
				return data.password === data.confirmPassword
			}
			return true
		},
		{
			message: 'Mật khẩu xác nhận không khớp',
			path: ['confirmPassword']
		}
	)
	.refine(
		(data) => {
			if (data.password && data.password.length > 0) {
				return data.password.length >= 4
			}
			return true
		},
		{
			message: 'Mật khẩu phải có ít nhất 4 ký tự',
			path: ['password']
		}
	)

export interface UserFormProps {
	onSuccess: (
		data: User,
		variables: UpdateUserBody,
		context: unknown
	) => unknown
	open: boolean
	setOpen: (open: boolean) => void
	onClose?: () => void
	editingUser?: UserUpdate | null
}

export default function UserEditForm({
	onSuccess,
	open,
	setOpen,
	onClose,
	editingUser
}: UserFormProps) {
	const { data: unitsData } = useUnitsData()
	const skipUnit = positionSkipsUnit(editingUser?.position)

	const { mutateAsync } = useMutation({
		mutationFn: UpdateUser,
		onSuccess,
		onError: (error) => {
			console.error('Failed to update user:', error)
		}
	})

	const form = useAppForm({
		defaultValues: {
			id: editingUser?.id || 0,
			displayName: '',
			password: '',
			confirmPassword: '',
			unitId: '1',
			isSuperUser: 'false',
			rank: '',
			signatureUrl: ''
		},
		onSubmit: async ({ value, formApi }: { value: any; formApi: any }) => {
			try {
				const parsed = schema.parse(value)

				const payload: any = { ...parsed }
				if (!payload.password || payload.password.length === 0) {
					delete payload.password
				}
				delete payload.confirmPassword
				if (!payload.signatureUrl) {
					delete payload.signatureUrl
				}

				// Chức vụ gắn loại TK — không gửi đổi
				delete payload.position
				// Đơn vị không áp dụng theo chức vụ
				if (skipUnit) {
					delete payload.unitId
				}

				await mutateAsync(payload)
				toast.success('Sửa người dùng thành công')
				formApi.reset()
			} catch (err) {
				console.error(err)
				toast.error('Sửa người dùng thất bại', {
					description: (err as Error).message
				})
			} finally {
				setOpen(false)
			}
		},
		validators: {
			onBlur: schema
		}
	})

	const superUserOptions = [
		{ label: 'Tài khoản quản trị', value: 'true' },
		{ label: 'Tài khoản thường', value: 'false' }
	]
	useEffect(() => {
		if (open && editingUser) {
			form.reset({
				id: editingUser.id,
				displayName: editingUser.displayName,
				password: '',
				confirmPassword: '',
				unitId: editingUser.unitId?.toString() || '',
				isSuperUser: editingUser.isSuperUser ? 'true' : 'false',
				rank: editingUser.rank || '',
				signatureUrl: editingUser.signatureUrl || ''
			})
		}
	}, [open, editingUser])

	function flattenUnits(units: any[]): any[] {
		const result: any[] = []
		units.forEach((unit) => {
			result.push({ label: unit.name, value: unit.id.toString() })
		})
		return result
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Biểu mẫu sửa thông tin người dùng</DialogTitle>
				</DialogHeader>
				<div className='space-y-4'>
					<form
						className='space-y-4'
						onSubmit={(e) => {
							e.preventDefault()
							e.stopPropagation()
							form.handleSubmit()
						}}
					>
						<div className='space-y-2'>
							<form.AppField name='displayName'>
								{(field: any) => (
									<field.TextField label='Họ và tên' />
								)}
							</form.AppField>
						</div>

						<div className='space-y-2'>
							<form.AppField name='password'>
								{(field: any) => (
									<field.TextField
										label='Mật khẩu mới (để trống nếu không đổi)'
										type='password'
										placeholder='Nhập mật khẩu mới'
									/>
								)}
							</form.AppField>
						</div>

						<div className='space-y-2'>
							<form.AppField name='confirmPassword'>
								{(field: any) => (
									<field.TextField
										label='Xác nhận mật khẩu'
										type='password'
										placeholder='Nhập lại mật khẩu mới'
									/>
								)}
							</form.AppField>
						</div>

						{!skipUnit ? (
							<div className='space-y-2'>
								<form.AppField name='unitId'>
									{(field: any) => (
										<field.Select
											label='Chọn đơn vị'
											placeholder='Chọn đơn vị'
											values={flattenUnits(
												unitsData || []
											)}
											value={field.state.value?.toString()}
										/>
									)}
								</form.AppField>
							</div>
						) : (
							<div className='space-y-1 rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground'>
								Đơn vị:{' '}
								<span className='font-medium text-foreground'>
									Không áp dụng
								</span>
							</div>
						)}

						<div className='space-y-2'>
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
						</div>

						{/* Chức vụ gắn loại tài khoản — chỉ xem */}
						<div className='space-y-1 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm'>
							<div>
								<span className='text-muted-foreground'>
									Chức vụ:{' '}
								</span>
								<strong>{editingUser?.position || '—'}</strong>
							</div>
							<p className='text-xs text-muted-foreground'>
								Chức vụ gắn theo loại tài khoản khi tạo — không
								chỉnh sửa.
							</p>
						</div>

						<div className='space-y-2 sm:col-span-2'>
							<form.AppField name='signatureUrl'>
								{(field: any) => (
									<>
										<field.TextField
											label='Chữ ký số (URL ảnh)'
											placeholder='https://… hoặc data:image/… (BGH dùng khi phê duyệt đề)'
										/>
										{field.state.value ? (
											<img
												src={String(field.state.value)}
												alt='Chữ ký'
												className='mt-2 h-16 max-w-[200px] object-contain border rounded bg-white p-1'
											/>
										) : null}
										<p className='text-muted-foreground text-xs'>
											Hiệu trưởng / Phó HT: dán URL ảnh
											chữ ký. Khi phê duyệt đề, chữ ký +
											cấp bậc + họ tên sẽ in trên bộ đề.
										</p>
									</>
								)}
							</form.AppField>
						</div>

						<div className='space-y-2'>
							<form.AppField name='isSuperUser'>
								{(field: any) => (
									<field.Select
										label='Loại tài khoản'
										placeholder='Loại tài khoản'
										values={superUserOptions}
										value={field.state.value}
									/>
								)}
							</form.AppField>
						</div>

						<DialogFooter>
							<DialogClose asChild>
								<Button
									onClick={() => setOpen(false)}
									variant='outline'
								>
									Hủy
								</Button>
							</DialogClose>

							<form.AppForm>
								<form.SubscribeButton label='Sửa' />
							</form.AppForm>
						</DialogFooter>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	)
}
