import { GetStudents } from '@/api'
import type { StudentQueryParams } from '@/types'
import { useQuery } from '@tanstack/react-query'

export default function useStudentData(params?: StudentQueryParams) {
	return useQuery({
		queryKey: ['students', params],
		queryFn: () => GetStudents(params)
	})
}
