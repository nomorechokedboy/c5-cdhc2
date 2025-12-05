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
import { CreateUser } from '@/api'
import { useMutation } from '@tanstack/react-query'
import type { Class, ClassBody, User, UserBody, UserFormData } from '@/types'
import { toast } from 'sonner'
import useUnitsData from '@/hooks/useUnitsData'
import { userRankOptions, userPositionOptions } from '@/data/ethnics'

const schema = z.object({
	username: z.string().min(1, 'Tên tài khoản không được bỏ trống'),
	displayName: z.string().min(1, 'Họ và tên không được bỏ trống'),
	password: z.string().min(1, 'Mật khẩu không được bỏ trống'),
	unitId: z.preprocess(
		(val) => {
			if (typeof val === 'string') {
				return Number.parseInt(val)
			}

			return val
		},
		z.number().min(1, 'Đơn vị không được bỏ trống')
	),
	isSuperUser: z.coerce.boolean(),
	rank: z.string().optional(),
	position: z.string().optional()
})

export interface UserFormProps {
	onSuccess: (data: User[], variables: UserBody, context: unknown) => unknown
	open: boolean
	setOpen: (open: boolean) => void
}

export default function UserForm({ onSuccess, open, setOpen }: UserFormProps) {
	const { data: unitsData, isLoading, isError } = useUnitsData()

	const { mutateAsync } = useMutation({
		mutationFn: CreateUser,
		onSuccess,
		onError: (error) => {
			console.error('Failed to create user:', error)
		}
	})
	const form = useAppForm({
		defaultValues: {
			username: '',
			password: '',
			displayName: '',
			unitId: null,
			isSuperUser: false,
			rank: '',
			position: ''
		},
		onSubmit: async ({ value, formApi }: { value: any; formApi: any }) => {
			try {
				value.isSuperUser = value.isSuperUser === 'true' ? true : false
				const parsed = schema.parse(value)
				await mutateAsync(parsed)
				toast.success('Thêm mới người dùng thành công')
				formApi.reset()
			} catch (err) {
				console.error(err)
				toast.error('Thêm mới người dùng thất bại')
			} finally {
				setOpen(false)
			}
		},
		validators: {
			onBlur: schema
		}
	})
	// Hàm flatten mảng unit
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
					<DialogTitle>Biểu mẫu thêm người dùng</DialogTitle>
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
							<form.AppField name='username'>
								{(field: any) => (
									<field.TextField label='Tên tài khoản' />
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
							<form.AppField name='unitId'>
								{(field: any) => (
									<>
										<field.Select
											label='Chọn đơn vị'
											placeholder='Chọn đơn vị'
											values={flattenUnits(
												unitsData || []
											)}
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
										defaultValue={''}
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
										values={userPositionOptions}
										defaultValue={''}
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
										values={[
											{
												label: 'Tài khoản quản trị',
												value: 'true'
											},
											{
												label: 'Tài khoản thường',
												value: 'false'
											}
										]}
										defaultValue={'false'}
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
								<form.SubscribeButton label='Thêm' />
							</form.AppForm>
						</DialogFooter>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	)
}
