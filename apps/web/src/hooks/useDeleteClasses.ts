import { useMutation } from '@tanstack/react-query'
import { DeleteUnit } from '@/api'

export function useDeleteClasses() {
	return useMutation({
		mutationFn: (ids: number[]) =>
			Promise.all(ids.map((id) => DeleteUnit(id)))
	})
}
