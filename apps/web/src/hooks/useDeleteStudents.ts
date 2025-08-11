import { DeleteStudents } from '@/api'
import type { DeleteStudentsBody } from '@/types'
import { useMutation, type UseMutationOptions } from '@tanstack/react-query'

export default function useDeleteStudents(
	options?: Omit<
		UseMutationOptions<unknown, Error, DeleteStudentsBody, unknown>,
		'mutationFn'
	>
) {
	return useMutation({ ...options, mutationFn: DeleteStudents })
}
