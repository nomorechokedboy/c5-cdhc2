import { CourseApi } from '@/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import CourseCard, { type Course } from '@/components/course-card'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute, useRouterState } from '@tanstack/react-router'

export const Route = createFileRoute('/khoa-hoc/$categoryIdnumber/')({
	component: RouteComponent
})

const colors = [
	'bg-teal-500',
	'bg-orange-500',
	'bg-pink-500',
	'bg-purple-500',
	'bg-green-500',
	'bg-blue-500',
	'bg-sky-500'
]

function hashStringToIndex(s: string | number, len: number): number {
	const str = String(s)
	let h = 0
	for (let i = 0; i < str.length; i++) {
		h = (h << 5) - h + str.charCodeAt(i)
		h |= 0 // convert to 32bit int
	}
	return Math.abs(h) % len
}

function colorForCourseDeterministic(course: { id?: number; name?: string }) {
	const key = course.id ?? course.name ?? JSON.stringify(course)
	return colors[hashStringToIndex(key, colors.length)]
}

function RouteComponent() {
	const { categoryIdnumber } = Route.useParams()
	const category = useRouterState({
		select: (s) => s.location.state.category
	})
	const { data: courseData = [], isLoading: isCoursesLoading } = useQuery({
		queryKey: [category?.id, 'courses'],
		queryFn: () => CourseApi.GetCourses({ CategoryId: category?.id ?? 0 })
	})
	const courses = courseData.map(
		(c) =>
			({
				id: c.id,
				description: c.summary,
				title: c.fullname,
				code: c.shortname,
				color: colorForCourseDeterministic({
					id: c.id,
					name: c.fullname
				}),
				status: c.visible === 1 ? 'Đang dạy' : 'Kết thúc',
				students: 0,
				credits: 1,
				room: '',
				semester: '',
				isActive: c.visible === 1
			}) as Course
	)

	return (
		<ProtectedRoute>
			<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6'>
				{courses.map((course) => (
					<Link
						to='/khoa-hoc/$categoryIdnumber/mon-hoc/$courseShortname'
						params={{
							categoryIdnumber,
							courseShortname: course.code
						}}
						state={{ course: { id: course.id } }}
					>
						<CourseCard key={course.id} course={course} />
					</Link>
				))}
			</div>
		</ProtectedRoute>
	)
}
