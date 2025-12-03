import { IsInitAdmin } from '@/api'
import { useQuery } from '@tanstack/react-query'

export default function useIsInitAdmin() {
	return useQuery({
		queryKey: ['isInitAdmin'],
		queryFn: IsInitAdmin,
		retry: false,
		refetchOnWindowFocus: false
	})
}
