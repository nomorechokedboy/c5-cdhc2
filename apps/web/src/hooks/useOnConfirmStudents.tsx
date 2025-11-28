import { UpdateStudentStatus } from '@/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'

export default function useOnConfirmStudents(
	onSuccess?: () => void
) {
	const queryClient = useQueryClient()

	const mutation = useMutation({
		mutationFn: async (studentIds: number[]) => {
			return UpdateStudentStatus(studentIds, 'confirmed')
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['students'] })
			onSuccess?.()
		}
	})

	return async (studentIds: number[]) => {
		return mutation.mutateAsync(studentIds)
	}
}
