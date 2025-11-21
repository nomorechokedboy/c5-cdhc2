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
import { CreateUser, UpdateUser } from '@/api'
import { useMutation } from '@tanstack/react-query'
import type {
	Class,
	ClassBody,
	UpdateUserBody,
	User,
	UserBody,
	UserFormData,
	UserUpdate
} from '@/types'
import { toast } from 'sonner'
import useAllUnitsData from '@/hooks/useAllUnitsData'
import { useEffect } from 'react'
import { id } from 'zod/v4/locales'

const schema = z.object({
	id: z.number().optional(),
	displayName: z.string().min(1, 'Tên hiển thị không được bỏ trống'),
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
	}, z.boolean())
})

export interface UserFormProps {
	onSuccess: (
		data: User,
		variables: UpdateUserBody,
		context: unknown
	) => unknown
	open: boolean
	setOpen: (open: boolean) => void
	editingUser?: UserUpdate | null
}

export default function UserEditForm({
	onSuccess,
	open,
	setOpen,
	editingUser
}: UserFormProps) {
	const { data: unitsData, isLoading, isError } = useAllUnitsData()
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
			unitId: '1',
			isSuperUser: 'false'
		},
		onSubmit: async ({ value, formApi }: { value: any; formApi: any }) => {
			try {
				const parsed = schema.parse(value)
				await mutateAsync(parsed)
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
				unitId: editingUser.unitId.toString(),
				isSuperUser: editingUser.isSuperUser ? 'true' : 'false'
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
									<field.TextField label='Tên hiển thị' />
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
