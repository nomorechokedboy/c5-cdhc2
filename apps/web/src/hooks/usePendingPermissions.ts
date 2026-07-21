import { useQuery } from '@tanstack/react-query'
import { GetPendingPermissionUsers } from '@/api'
import { isSuperAdmin } from '@/lib/utils'

export default function usePendingPermissions() {
	return useQuery({
		queryKey: ['pending-permissions'],
		queryFn: GetPendingPermissionUsers,
		refetchInterval: 15_000,
		enabled: typeof window !== 'undefined' && isSuperAdmin()
	})
}
