import { GetUsers } from '@/api'
import { useQuery } from '@tanstack/react-query'
export default function useUserData() {
	return useQuery({
		queryKey: ['users'],
		queryFn: GetUsers,
		// TK phòng / ĐV tạo xong → list luôn lấy bản mới
		staleTime: 0,
		refetchOnMount: 'always',
		refetchOnWindowFocus: true
	})
}
