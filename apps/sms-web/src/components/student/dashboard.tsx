import { useState, useEffect } from 'react'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import StudentCourseCard from './course-card'
import StudentCourseDetail from './course-detail'
import StudentFinalScores from './final-scores'
import { CourseSkeleton } from './loading-skeleton'
import { FullPageErrorState } from '@/components/error-state'
import { Course, GetStudentGrades, type StudentGrades } from '@/types'
import { useQuery } from '@tanstack/react-query'
import { UserApi } from '@/api'

export function StudentDashboard() {
	const [courses, setCourses] = useState<Course[]>([])
	const [studentGrades, setStudentGrades] = useState<StudentGrades>({})
	const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
		null
	)
	const {
		data: userGrades,
		isLoading,
		error
	} = useQuery({ queryKey: ['userGrades'], queryFn: UserApi.GetGrades })

	useEffect(() => {
		const fetchData = async () => {
			if (userGrades === undefined) {
				return
			}

			const courses = Course.ToCourses(userGrades)
			const studentGrades = GetStudentGrades(userGrades.courses)
			setCourses(courses)
			setStudentGrades(studentGrades)
		}

		fetchData()
	}, [userGrades])

	const handleRetry = () => {
		setCourses([])
		setStudentGrades({})
	}

	const selectedCourse = selectedCourseId
		? courses.find((c) => c.id === selectedCourseId)
		: null

	if (selectedCourse) {
		return (
			<StudentCourseDetail
				course={selectedCourse}
				grades={studentGrades[selectedCourseId!]}
				onBack={() => setSelectedCourseId(null)}
				isLoading={false}
			/>
		)
	}

	if (error && !isLoading) {
		return (
			<FullPageErrorState
				title='Unable to Load Courses'
				description={error.message}
				onRetry={handleRetry}
			/>
		)
	}

	return (
		<div className='container mx-auto p-6 space-y-8'>
			<div className='space-y-2'>
				<h2 className='text-3xl font-bold text-foreground'>
					My Courses
				</h2>
				<p className='text-muted-foreground'>
					View your enrolled courses and track your grades
				</p>
			</div>

			{isLoading ? (
				<div className='space-y-6'>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
						{[...Array(3)].map((_, i) => (
							<CourseSkeleton key={i} />
						))}
					</div>
					<StudentFinalScores
						courses={[]}
						studentGrades={{}}
						isLoading={true}
					/>
				</div>
			) : (
				<>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
						{courses.map((course) => (
							<StudentCourseCard
								key={course.id}
								course={course}
								grades={studentGrades[course.id]}
								onClick={() => setSelectedCourseId(course.id)}
							/>
						))}
					</div>

					{courses.length === 0 && (
						<Card className='border-dashed'>
							<CardHeader className='text-center py-12'>
								<CardTitle>No Courses Found</CardTitle>
								<CardDescription>
									You haven't enrolled in any courses yet.
								</CardDescription>
							</CardHeader>
						</Card>
					)}

					{courses.length > 0 && (
						<StudentFinalScores
							courses={courses}
							studentGrades={studentGrades}
							isLoading={false}
						/>
					)}
				</>
			)}
		</div>
	)
}
