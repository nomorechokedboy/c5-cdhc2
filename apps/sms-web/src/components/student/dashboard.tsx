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
import { useTranslation } from 'react-i18next'

export function StudentDashboard() {
	const { t } = useTranslation()
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

	useEffect(() => {
		if (!userGrades) return
		setCourses(Course.ToCourses(userGrades))
		setStudentGrades(GetStudentGrades(userGrades.courses))
	}, [userGrades])

	const handleRetry = () => {
		setCourses([])
		setStudentGrades({})
	}

	const selectedCourse = selectedCourseId
		? courses.find((c) => c.id === selectedCourseId)
		: null

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

	const sortedSemesters = useMemo(
		() =>
			Object.keys(groupedCourses)
				.map(Number)
				.sort((a, b) => a - b),
		[groupedCourses]
	)

	useEffect(() => {
		if (!activeSemester && sortedSemesters.length > 0) {
			setActiveSemester(String(sortedSemesters[0]))
		}
	}, [sortedSemesters, activeSemester])

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

	if (error && !isLoading) {
		return (
			<FullPageErrorState
				title={t('error.courseLoadTitle')}
				description={error.message}
				onRetry={handleRetry}
			/>
		)
	}

	return (
		<div className='container mx-auto p-6 space-y-8'>
			<div className='space-y-2'>
				<h2 className='text-3xl font-bold text-foreground'>
					{t('dashboard.student.title')}
				</h2>
				<p className='text-muted-foreground'>
					{t('dashboard.student.subtitle')}
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
															{t(
																'dashboard.student.semester',
																{
																	number: semester
																}
															)}
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
									<CardTitle>
										{t('dashboard.student.noClassesTitle')}
									</CardTitle>
									<CardDescription>
										{t('dashboard.student.noClasses')}
									</CardDescription>
								</CardHeader>
							</Card>
						)}
					</div>

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
