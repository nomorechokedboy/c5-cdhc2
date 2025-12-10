import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CreatePermission } from '@/api'
import { toast } from 'sonner'
import { queryClient } from '@/integrations/tanstack-query/root-provider'
import { useAppForm } from '@/hooks/demo.form'

export default function PermissionForm() {
	const [open, setOpen] = useState(false)
	const { mutateAsync } = useMutation({
		mutationFn: CreatePermission,
		onError: (err) => {
			console.error('CreatePermission error', err)
			toast.error('Thêm mới thất bại.', { description: err.message })
		},
		onSuccess: () => {
			toast.success('Thêm mới thành công!')
			setOpen(false)
			queryClient.invalidateQueries({ queryKey: ['permissions'] })
		}
	})
	const form = useAppForm({
		defaultValues: {
			resourceId: 0,
			actionId: 0
		},
		onSubmit: async ({ value }) => {
			await mutateAsync(value)
		}
	})

	return null
}
