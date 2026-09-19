import { useMutation } from '@tanstack/react-query'
import { UpdateUnit } from '@/api'

export type UpdateClassInput = {
	id: number
	name?: string
	description?: string | null
	status?: 'ongoing' | 'graduated' | null
	graduatedAt?: string | null
}

export function useUpdateClasses() {
	return useMutation({
		mutationFn: (data: UpdateClassInput[]) =>
			Promise.all(data.map(({ id, ...body }) => UpdateUnit(id, body)))
	})
}
