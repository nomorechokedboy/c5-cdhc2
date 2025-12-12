import { AssignRolesToUser } from '@/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AssignRoleRequest } from '@/types'

export default function useAssignRoles() {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (data: AssignRoleRequest) => AssignRolesToUser(data),
        onSuccess: (_, variables) => {
            toast.success('Cập nhật quyền thành công')
            queryClient.invalidateQueries({
                queryKey: ['user-roles', variables.userId]
            })
            queryClient.invalidateQueries({
                queryKey: ['users']
            })
        },
        onError: (error: Error) => {
            toast.error(error.message || 'Có lỗi xảy ra khi cập nhật quyền')
        }
    })
}
