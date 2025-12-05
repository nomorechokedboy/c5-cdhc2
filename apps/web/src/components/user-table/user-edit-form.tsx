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
import { userRankOptions, userPositionOptions } from '@/data/ethnics'

const schema = z.object({
	id: z.number().optional(),
	displayName: z.string().min(1, 'Họ và tên không được bỏ trống'),
	password: z.string().optional(),
	confirmPassword: z.string().optional(),
	unitId: z.preprocess(
		(val) => {
			if (typeof val === 'string') {
				return Number.parseInt(val)
			}
			return val
		},
		z.number().min(1, 'Đơn vị không được bỏ trống')
	),
	isSuperUser: z.preprocess((val) => {
		if (val === 'true' || val === true) return true
		if (val === 'false' || val === false) return false
		return val
	}, z.boolean()),
	rank: z.string().optional(),
	position: z.string().optional()
}).refine((data) => {
	// If password provided, must match confirmPassword
	if (data.password && data.password.length > 0) {
		return data.password === data.confirmPassword
	}
	return true
}, {
	message: 'Mật khẩu xác nhận không khớp',
	path: ['confirmPassword']
}).refine((data) => {
	// If password provided, minimum length
	if (data.password && data.password.length > 0) {
		return data.password.length >= 6
	}
	return true
}, {
	message: 'Mật khẩu phải có ít nhất 6 ký tự',
	path: ['password']
})

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
	const { data: unitsData, isLoading, isError } = useUnitsData()
	console.log('Render UserForm')
	console.log('unitdata', unitsData)

	const { mutateAsync } = useMutation({
		mutationFn: UpdateUser,
		onSuccess,
		onError: (error) => {
			console.error('Failed to create class:', error)
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
			position: ''
		},
		onSubmit: async ({ value, formApi }: { value: any; formApi: any }) => {
			try {
				const parsed = schema.parse(value)

				// Remove password if empty, remove confirmPassword always
				const payload: any = { ...parsed }
				if (!payload.password || payload.password.length === 0) {
					delete payload.password
				}
				delete payload.confirmPassword

				await mutateAsync(payload)
				toast.success('Sửa người dùng thành công')
				formApi.reset()
			} catch (err) {
				console.error(err)
				toast.error('Sửa người dùng thất bại')
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
				unitId: editingUser.unitId?.toString() || '1',
				isSuperUser: editingUser.isSuperUser ? 'true' : 'false',
				rank: editingUser.rank || '',
				position: editingUser.position || ''
			})
		}
	}, [open, editingUser])
	// Hàm flatten mảng unit
	function flattenUnits(units: any[]): any[] {
		const result: any[] = []

		units.forEach((unit) => {
			result.push({ label: unit.name, value: unit.id.toString() })
		})

		return result
	}
	console.log('flatttenUnit data', flattenUnits(unitsData || []))

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

						<div className='space-y-2'>
							<form.AppField name='unitId'>
								{(field: any) => (
									<>
										<field.Select
											label='Chọn đơn vị'
											placeholder='Chọn đơn vị'
											values={flattenUnits(
												unitsData || []
											)}
											value={field.state.value?.toString()}
										/>
									</>
								)}
							</form.AppField>
						</div>

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

						<div className='space-y-2'>
							<form.AppField name='position'>
								{(field: any) => (
									<field.Select
										label='Chức vụ'
										placeholder='Chọn chức vụ'
										values={[]}
										value={field.state.value}
									/>
								)}
							</form.AppField>
						</div>

						<div></div>

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
