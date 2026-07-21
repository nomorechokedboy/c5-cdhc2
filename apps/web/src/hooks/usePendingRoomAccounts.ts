import { useQuery } from '@tanstack/react-query'
import { GetPendingRoomAccountUsers } from '@/api/asset'

export default function usePendingRoomAccounts() {
	return useQuery({
		queryKey: ['pending-room-accounts'],
		queryFn: GetPendingRoomAccountUsers,
		refetchInterval: 30_000
	})
}
