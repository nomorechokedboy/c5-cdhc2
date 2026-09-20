import { CreateStudents } from '@/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function useCreateStudents() {
	const queryClient = useQueryClient()

	return useMutation({
		mutationFn: CreateStudents,
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['students'] })
		},
		onError: (error: any) => {
			console.error(
				'Error creating students:',
				error?.request?.responseText ?? error
			)
		}
	})
}
