import { useState, useEffect, useMemo } from 'react'
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@repo/ui/components/ui/tabs'
import { ScrollArea, ScrollBar } from '@repo/ui/components/ui/scroll-area'
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
	const [activeSemester, setActiveSemester] = useState<string>('')

	const {
		data: userGrades,
		isLoading,
		error
	} = useQuery({ queryKey: ['userGrades'], queryFn: UserApi.GetGrades })

	// Parse backend data
	useEffect(() => {
		if (!userGrades) return

		const parsedCourses = Course.ToCourses(userGrades)
		const parsedGrades = GetStudentGrades(userGrades.courses)

		setCourses(parsedCourses)
		setStudentGrades(parsedGrades)
	}, [userGrades])

	const handleRetry = () => {
		setCourses([])
		setStudentGrades({})
	}

	const selectedCourse = selectedCourseId
		? courses.find((c) => c.id === selectedCourseId)
		: null

	// --- Group Courses by Semester (semester is a number) ---
	const groupedCourses = useMemo(() => {
		return courses.reduce(
			(acc, course) => {
				if (typeof course.semester !== 'number') return acc

				if (!acc[course.semester]) acc[course.semester] = []
				acc[course.semester].push(course)

				return acc
			},
			{} as Record<number, Course[]>
		)
	}, [courses])

	// Sort numerically
	const sortedSemesters = useMemo(() => {
		return Object.keys(groupedCourses)
			.map(Number)
			.sort((a, b) => a - b)
	}, [groupedCourses])

	// Initialize with first semester
	useEffect(() => {
		if (!activeSemester && sortedSemesters.length > 0) {
			setActiveSemester(String(sortedSemesters[0]))
		}
	}, [sortedSemesters, activeSemester])

	// --- Course Detail View ---
	if (selectedCourse) {
		return (
			<StudentCourseDetail
				course={selectedCourse}
				grades={studentGrades[selectedCourseId || 0] || undefined}
				onBack={() => setSelectedCourseId(null)}
				isLoading={false}
			/>
		)
	}

	// --- Error State ---
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
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
					<div className='lg:col-span-2 space-y-6'>
						<div className='h-10 w-full max-w-md bg-muted animate-pulse rounded-md' />
						<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
							{[...Array(4)].map((_, i) => (
								<CourseSkeleton key={i} />
							))}
						</div>
					</div>
					<div className='lg:col-span-1'>
						<div className='sticky top-20'>
							<StudentFinalScores
								courses={[]}
								studentGrades={{}}
								isLoading
							/>
						</div>
					</div>
				</div>
			) : (
				<div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
					{/* LEFT SIDE – COURSE LIST */}
					<div className='lg:col-span-2 space-y-6'>
						{courses.length > 0 ? (
							<Tabs
								value={activeSemester}
								onValueChange={setActiveSemester}
							>
								<div className='sticky top-20 z-30 bg-card shadow-sm'>
									<ScrollArea className='w-full whitespace-nowrap rounded-md border bg-card'>
										<div className='flex p-1'>
											<TabsList className='inline-flex h-10 items-center bg-muted p-1 flex-1'>
												{sortedSemesters.map(
													(semester) => (
														<TabsTrigger
															key={semester}
															value={String(
																semester
															)}
															className='px-4 min-w-[100px]'
														>
															Semester {semester}
														</TabsTrigger>
													)
												)}
											</TabsList>
										</div>
										<ScrollBar orientation='horizontal' />
									</ScrollArea>
								</div>

								{sortedSemesters.map((semester) => (
									<TabsContent
										key={semester}
										value={String(semester)}
										className='mt-6 space-y-6'
									>
										<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
											{(
												groupedCourses[semester] || []
											).map((course) => (
												<StudentCourseCard
													key={course.id}
													course={course}
													grades={
														studentGrades[course.id]
													}
													onClick={() =>
														setSelectedCourseId(
															course.id
														)
													}
												/>
											))}
										</div>
									</TabsContent>
								))}
							</Tabs>
						) : (
							<Card className='border-dashed'>
								<CardHeader className='text-center py-12'>
									<CardTitle>No Courses Found</CardTitle>
									<CardDescription>
										You haven't enrolled in any courses yet.
									</CardDescription>
								</CardHeader>
							</Card>
						)}
					</div>

					{/* RIGHT SIDE – FINAL SCORES */}
					<div className='lg:col-span-1'>
						<div className='sticky top-20 space-y-6'>
							{courses.length > 0 && (
								<StudentFinalScores
									courses={courses}
									studentGrades={studentGrades}
								/>
							)}
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
