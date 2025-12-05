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
import { CreateClass, RefreshToken } from '@/api'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { Class, ClassBody } from '@/types'
import { toast } from 'sonner'
import { AuthController } from '@/biz'

const schema = z.object({
	name: z.string().min(1, 'Tên lớp không được bỏ trống'),
	description: z.string()
})

export interface ClassFormProps {
	onSuccess: (
		data: Class[],
		variables: ClassBody,
		context: unknown
	) => unknown
	unitId: number | undefined
}

export default function ClassForm({ onSuccess, unitId }: ClassFormProps) {
	const { mutateAsync } = useMutation({
		mutationFn: CreateClass,
		onError: (error) => {
			console.error('Failed to create class:', error)
		}
	})
	const [open, setOpen] = useState(false)
	const form = useAppForm({
		defaultValues: {
			name: '',
			description: '',
			unitId
		},
		onSubmit: async ({ value, formApi }: { value: any; formApi: any }) => {
			if (unitId === undefined) {
				toast.error(
					'Có lỗi xảy ra, không thể lấy được thông tin đại đội để tạo lớp!'
				)
				return
			}

			try {
				const result = await mutateAsync(value)
				onSuccess(result, value, undefined)

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
			<DialogTrigger asChild>
				<Button>
					<Plus className='w-4 h-4 mr-2' />
					Thêm lớp
				</Button>
			</DialogTrigger>
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
							<form.AppField name='name'>
								{(field: any) => (
									<field.TextField label='Tên lớp' />
								)}
							</form.AppField>
						</div>

						<div className='space-y-2'>
							<form.AppField name='description'>
								{(field: any) => (
									<field.TextArea label='Mô tả về lớp' />
								)}
							</form.AppField>
						</div>

						<DialogFooter>
							<DialogClose asChild>
								<Button variant='outline'>Hủy</Button>
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
