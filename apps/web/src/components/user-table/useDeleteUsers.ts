import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DeleteUsers } from '@/api'

export function useDeleteUsers() {
	const qc = useQueryClient()
	return useMutation({
		mutationFn: (ids: number[]) => DeleteUsers(ids),
		onSuccess: async () => {
			await Promise.all([
				qc.invalidateQueries({ queryKey: ['users'] }),
				qc.invalidateQueries({ queryKey: ['pending-permissions'] }),
				qc.invalidateQueries({ queryKey: ['pending-room-accounts'] })
			])
			await qc.refetchQueries({ queryKey: ['users'], type: 'all' })
		}
	})
}
