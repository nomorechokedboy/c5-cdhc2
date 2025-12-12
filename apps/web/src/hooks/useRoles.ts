import { GetRoles } from '@/api'
import { useQuery } from '@tanstack/react-query'

export default function useRoles() {
    return useQuery({
        queryKey: ['roles'],
        queryFn: GetRoles
    })
}
