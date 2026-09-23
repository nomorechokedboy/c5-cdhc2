import { CategoryApi } from '@/api'
import ProtectedRoute from '@/components/ProtectedRoute'
import CourseCard, { type Course } from '@/components/course-card'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent } from '@repo/ui/components/ui/card'
import { Link, createFileRoute, useRouterState } from '@tanstack/react-router'
import useAuth from '@/hooks/useAuth'

export const Route = createFileRoute('/khoa-hoc/$categoryIdnumber/')({
	component: RouteComponent
})

function RouteComponent() {
	const { t } = useTranslation()
	const { categoryIdnumber } = Route.useParams()
	const { isAdmin, isManager } = useAuth()
	const category = useRouterState({
		select: (s) => s.location.state.category
	})
	const { data: courseData = [], isLoading: isCoursesLoading } = useQuery({
		queryKey: ['categoryCourses', category?.id],
		queryFn: () => CategoryApi.GetCourses({ CategoryId: category?.id ?? 0 })
	})
	const courses = courseData.map(
		(c) =>
			({
				id: c.id,
				description: c.summary,
				title: c.fullname,
				code: c.shortname,
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
			{(isAdmin || isManager) && (
				<div className='flex justify-end px-6 pt-6'>
					<Button asChild variant='outline'>
						<Link
							to='/khoa-hoc/$categoryIdnumber/ket-qua'
							params={{ categoryIdnumber }}
						>
							<ClipboardList />
							{t('report.link.classResults')}
						</Link>
					</Button>
				</div>
			)}
			{isCoursesLoading ? (
				<div className='grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3'>
					{Array.from({ length: 6 }).map((_, i) => (
						<Card
							key={i}
							className='border-l-muted h-32 animate-pulse border-l-[6px]'
						/>
					))}
				</div>
			) : courses.length === 0 ? (
				<div className='p-6'>
					<Card className='border-dashed'>
						<CardContent className='text-muted-foreground text-center'>
							{t('course.noCourses')}
						</CardContent>
					</Card>
				</div>
			) : (
				<div className='grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-3'>
					{courses.map((course) => (
						<Link
							key={course.id}
							className='focus-visible:ring-ring/60 block rounded-lg outline-none focus-visible:ring-[3px]'
							to='/khoa-hoc/$categoryIdnumber/mon-hoc/$courseShortname'
							params={{
								categoryIdnumber,
								courseShortname: course.code
							}}
							state={{ course: { id: course.id } }}
						>
							<CourseCard course={course} />
						</Link>
					))}
				</div>
			)}
		</ProtectedRoute>
	)
}
