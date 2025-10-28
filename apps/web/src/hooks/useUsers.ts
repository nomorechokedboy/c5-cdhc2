import { GetUsers } from '@/api'
import { useQuery } from '@tanstack/react-query'
export default function useUserData() {
	return useQuery({
		queryKey: ['users'],
		queryFn: GetUsers
	})
}
