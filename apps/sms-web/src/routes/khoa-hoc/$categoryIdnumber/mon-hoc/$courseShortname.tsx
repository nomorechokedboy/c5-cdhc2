import { CourseApi } from '@/api'
import CourseDetails from '@/components/course-details'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Course } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useRouterState } from '@tanstack/react-router'

export const Route = createFileRoute(
	'/khoa-hoc/$categoryIdnumber/mon-hoc/$courseShortname'
)({
	component: RouteComponent
})

function RouteComponent() {
	const { courseShortname, categoryIdnumber } = Route.useParams()
	const course = useRouterState({
		select(s) {
			return s.location.state.course
		}
	})
	const {
		data: courseDetails = Course.DefaultCourse(),
		isLoading: isLoadingCourseDetails
	} = useQuery({
		queryKey: ['courseDetails', course?.id],
		queryFn: () =>
			CourseApi.GetCourseDetails({ id: course?.id ?? 0 }).then(
				Course.From
			)
	})
	console.log({ courseDetails })

	return (
		<ProtectedRoute>
			<CourseDetails data={courseDetails} />
		</ProtectedRoute>
	)
}
