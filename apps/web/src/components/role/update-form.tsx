import { useMutation } from '@tanstack/react-query'
import RoleModal from './modal'
import { useAppForm } from '@/hooks/demo.form'
import { UpdateRole } from '@/api'
import { toast } from 'sonner'
import { useState } from 'react'
import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { Button } from '../ui/button'
import { Edit2 } from 'lucide-react'

interface UpdateRoleFormProps {
	id: number
	name: string
	description: string | undefined
}

export default function UpdateRoleForm({
	id,
	name,
	description
}: UpdateRoleFormProps) {
	const { mutateAsync, isPending } = useMutation({
		mutationFn: UpdateRole,
		onSuccess: () => {
			toast.success('Chỉnh sửa vai trò thành công!')
			setOpen(false)
			queryClient.invalidateQueries({ queryKey: ['roles'] })
		},
		onError: (err) => {
			toast.error('Chỉnh sửa vai trò thất bại.', {
				description: err.message
			})
		}
	})
	const form = useAppForm({
		defaultValues: { name, description, id },
		onSubmit: async ({ value }) => {
			await mutateAsync(value)
		}
	})
	const [open, setOpen] = useState(false)

	return (
		<RoleModal
			title='Chỉnh sửa vai trò'
			form={form}
			formId={`updateRoleForm-${id}`}
			open={open}
			onOpenChange={setOpen}
			actionText='Chỉnh sửa'
			loadingText='Đang chỉnh sửa...'
			trigger={
				<Button variant='outline' size='sm' disabled={isPending}>
					<Edit2 className='h-4 w-4' />
				</Button>
			}
		/>
	)
}
