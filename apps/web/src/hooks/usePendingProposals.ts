import { useQuery } from '@tanstack/react-query'
import { GetPendingProposalCount } from '@/api/asset'
import { isNganhUser, isSuperAdmin } from '@/lib/utils'

export default function usePendingProposals() {
	const enabled =
		typeof window !== 'undefined' && (isSuperAdmin() || isNganhUser())
	return useQuery({
		queryKey: ['pending-proposals'],
		queryFn: GetPendingProposalCount,
		refetchInterval: 20_000,
		enabled
	})
}
