import { useAppForm } from '@/hooks/demo.form'
import {
	Dialog,
	DialogHeader,
	DialogTrigger,
	DialogContent,
	DialogTitle,
	DialogClose,
	DialogFooter
} from '@/components/ui/dialog'
import { Plus } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { CreateClass } from '@/api'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { Class, ClassBody } from '@/types'
import { toast } from 'sonner'
import useUnitData from '@/hooks/useUnitData'

const schema = z.object({
	username: z.string().min(1, 'Tên tài khoản không được bỏ trống'),
	displayname: z.string().min(1, 'Tên hiển thị không được bỏ trống'),
	password: z.string().min(1, 'Mật khẩu không được bỏ trống'),
	unitid: z.string().min(1, 'Phải chọn 1 đơn vị cho tài khoản')
})

export interface ClassFormProps {
	onSuccess: (
		data: Class[],
		variables: ClassBody,
		context: unknown
	) => unknown
	open: boolean
	setOpen: (open: boolean) => void
}

export default function UserForm({ onSuccess, open, setOpen }: ClassFormProps) {
	const unitdata = useUnitData

	console.log('unitdata', unitdata)

	const { mutateAsync } = useMutation({
		mutationFn: CreateClass,
		onSuccess,
		onError: (error) => {
			console.error('Failed to create class:', error)
		}
	})
	const form = useAppForm({
		defaultValues: {
			username: '',
			password: '',
			displayname: '',
			unitid: 1
		},
		onSubmit: async ({ value, formApi }: { value: any; formApi: any }) => {
			try {
				await mutateAsync(value)
				toast.success('Thêm mới lớp thành công')
				formApi.reset()
			} catch (err) {
				console.error(err)
				toast.error('Thêm mới lớp thất bại')
			} finally {
				setOpen(false)
			}
		},
		validators: {
			onBlur: schema
		}
	})

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogContent className='sm:max-w-md'>
				<DialogHeader>
					<DialogTitle>Biểu mẫu thêm lớp</DialogTitle>
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
							<form.AppField name='username'>
								{(field: any) => (
									<field.TextField label='Tên tài khoản' />
								)}
							</form.AppField>
						</div>

						<div className='space-y-2'>
							<form.AppField name='displayname'>
								{(field: any) => (
									<field.TextField label='Tên hiển thị' />
								)}
							</form.AppField>
						</div>

						<div className='space-y-2'>
							<form.AppField name='password'>
								{(field: any) => (
									<field.TextField
										label='Mật khẩu'
										type='password'
									/>
								)}
							</form.AppField>
						</div>

						<div className='space-y-2'>
							<form.AppField name='unitid'>
								{(field: any) => (
									<>
										<field.Select
											label='Chọn đơn vị'
											placeholder='Chọn đơn vị'
											values={[
												{
													label: 'Đại đội 1',
													value: 'unit1'
												},
												{
													label: 'Đại đội 2',
													value: 'unit2'
												},
												{
													label: 'Đại đội 3',
													value: 'unit3'
												}
											]}
											value={field.value} // bind value
											onChange={field.onChange} // bind onChange
										/>
									</>
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
								<form.SubscribeButton label='Thêm' />
							</form.AppForm>
						</DialogFooter>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	)
}
