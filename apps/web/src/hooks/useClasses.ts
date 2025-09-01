import { GetClasses } from '@/api'
import type { classes } from '@/api/client'
import { useQuery } from '@tanstack/react-query'

export default function useClassData(params?: classes.GetClassesRequest) {
	return useQuery({
		queryKey: ['classes', params],
		queryFn: () => GetClasses(params)
	})
}
