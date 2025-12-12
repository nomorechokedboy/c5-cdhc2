import { GetUserRoles } from '@/api'
import { useQuery } from '@tanstack/react-query'

export default function useUserRoles(userId: number) {
    return useQuery({
        queryKey: ['user-roles', userId],
        queryFn: () => GetUserRoles(userId),
        enabled: !!userId
    })
}
