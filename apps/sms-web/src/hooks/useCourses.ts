import { CourseApi } from '@/api'
import { useQuery } from '@tanstack/react-query'

export default function useCourses() {
	return useQuery({
		queryKey: ['courses'],
		queryFn: () => CourseApi.GetCourses()
	})
}
