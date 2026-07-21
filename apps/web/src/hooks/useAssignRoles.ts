import { AssignRolesToUser } from '@/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AssignRoleRequest } from '@/types'

export default function useAssignRoles() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: (data: AssignRoleRequest) => AssignRolesToUser(data),
		onSuccess: async (_, variables) => {
			toast.success('Cập nhật quyền thành công')
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ['user-roles', variables.userId]
				}),
				queryClient.invalidateQueries({
					queryKey: ['users']
				}),
				queryClient.invalidateQueries({
					queryKey: ['pending-permissions']
				}),
				queryClient.invalidateQueries({
					queryKey: ['pending-room-accounts']
				})
			])
			await queryClient.refetchQueries({
				queryKey: ['users'],
				type: 'all'
			})
			await queryClient.refetchQueries({
				queryKey: ['pending-permissions'],
				type: 'all'
			})
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Có lỗi xảy ra khi cập nhật quyền')
		}
	})
}
