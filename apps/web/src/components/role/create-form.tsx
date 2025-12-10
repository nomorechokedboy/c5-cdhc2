import { useMutation } from '@tanstack/react-query'
import RoleModal from './modal'
import { useAppForm } from '@/hooks/demo.form'
import { CreateRole } from '@/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function CreateRoleForm() {
	const { mutateAsync } = useMutation({
		mutationFn: CreateRole,
		onSuccess: () => {
			toast.success('Thêm mới vai trò thành công!')
			setOpen(false)
			queryClient.invalidateQueries({ queryKey: ['roles'] })
		},
		onError: (err) => {
			console.error('CreateRole error', err)
			toast.error('Thêm mới vai trò thất bại.', {
				description: err.message
			})
		}
	})
	const form = useAppForm({
		defaultValues: { name: '', description: '' },
		onSubmit: async ({ value }) => {
			await mutateAsync(value)
		}
	})
	const [open, setOpen] = useState(false)

	return (
		<RoleModal
			title='Tạo vai trò mới'
			form={form}
			formId='createRoleForm'
			open={open}
			onOpenChange={setOpen}
			actionText='Thêm mới'
			loadingText='Đang thêm...'
			trigger={
				<Button className='gap-2'>
					<Plus className='h-4 w-4' />
					Tạo quyền
				</Button>
			}
		/>
	)
}
