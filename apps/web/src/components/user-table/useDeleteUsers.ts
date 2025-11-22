import { useMutation } from '@tanstack/react-query'
import { DeleteUsers } from '@/api'

export function useDeleteUsers() {
	return useMutation({
		mutationFn: (ids: number[]) => DeleteUsers(ids)
	})
}
