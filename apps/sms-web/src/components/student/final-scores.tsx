import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import type { Course, StudentGrades } from '@/types'
import { getGradeColor } from '@/lib/utils'

interface StudentFinalScoresProps {
	courses: Course[]
	studentGrades: StudentGrades
	isLoading?: boolean
}

export default function StudentFinalScores({
	courses,
	studentGrades,
	isLoading = false
}: StudentFinalScoresProps) {
	const validCourses = courses.filter((c) => studentGrades[c.id])
	const totalCredits = courses.reduce(
		(accum, curr) => accum + (curr.credits ?? 0),
		0
	)
	const overallGPA = (
		validCourses.length > 0
			? validCourses.reduce(
					(sum, c) =>
						sum + studentGrades[c.id].finalScore * (c.credits ?? 1),
					0
				) / totalCredits
			: 0
	).toFixed(2)

	// ===========================
	// LOADING STATE
	// ===========================
	if (isLoading) {
		return (
			<Card className='border-border'>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='flex-1'>
							<Skeleton className='h-6 w-48 mb-2' />
							<Skeleton className='h-4 w-64' />
						</div>
						<div className='text-center ml-4'>
							<Skeleton className='h-4 w-24 mb-2 mx-auto' />
							<Skeleton className='h-8 w-20 rounded-full mx-auto' />
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Khóa học</TableHead>
								<TableHead>Học kỳ</TableHead>
								<TableHead>Giảng viên</TableHead>
								<TableHead className='text-right'>
									Điểm tổng kết
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{[...Array(5)].map((_, idx) => (
								<TableRow key={idx}>
									<TableCell>
										<Skeleton className='h-4 w-32' />
									</TableCell>
									<TableCell>
										<Skeleton className='h-4 w-20' />
									</TableCell>
									<TableCell>
										<Skeleton className='h-4 w-24' />
									</TableCell>
									<TableCell className='text-right'>
										<Skeleton className='h-6 w-16 ml-auto rounded-full' />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		)
	}

	// ===========================
	// MAIN VIEW
	// ===========================
	return (
		<Card className='border-border shadow-sm'>
			<CardHeader className='pb-4'>
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle className='text-xl'>
							Kết quả học tập
						</CardTitle>
						<CardDescription>
							Theo dõi điểm số của bạn qua các kỳ
						</CardDescription>
					</div>

					<div className='text-center bg-muted/50 p-2 rounded-lg border'>
						<p className='text-xs font-medium text-muted-foreground mb-1 uppercase tracking-wider'>
							Điểm tổng kết
						</p>

						<Badge
							className={`${getGradeColor(Number.parseFloat(overallGPA))} text-lg px-3 py-1 shadow-sm`}
						>
							{overallGPA}
						</Badge>
					</div>
				</div>
			</CardHeader>

			<CardContent className='p-0'>
				<ScrollArea className='h-[calc(100vh-300px)] w-full'>
					<div className='p-6 pt-0'>
						<Table>
							<TableHeader>
								<TableRow className='hover:bg-transparent'>
									<TableHead className='w-[40%]'>
										Môn
									</TableHead>
									<TableHead>Kỳ</TableHead>
									<TableHead className='hidden xl:table-cell'>
										Giảng viên
									</TableHead>
									<TableHead className='text-right'>
										Điểm
									</TableHead>
								</TableRow>
							</TableHeader>

							<TableBody>
								{courses
									.sort(
										(a, b) =>
											(a.semester ?? 0) -
											(b.semester ?? 0)
									)
									.map((course) => {
										const gradeInfo =
											studentGrades[course.id]

										return (
											<TableRow
												key={course.id}
												className='group'
											>
												<TableCell className='font-medium'>
													<div className='flex flex-col'>
														<span
															className='truncate max-w-[150px] lg:max-w-[200px]'
															title={course.title}
														>
															{course.title}
														</span>

														<span className='text-xs text-muted-foreground xl:hidden truncate max-w-[150px]'>
															{
																course
																	.teachers?.[0]
																	.fullName
															}
														</span>
													</div>
												</TableCell>

												<TableCell className='whitespace-nowrap text-xs text-muted-foreground'>
													{course.semester}
												</TableCell>

												<TableCell className='hidden xl:table-cell text-muted-foreground truncate max-w-[120px]'>
													{course.teachers
														?.map(
															(teacher) =>
																teacher.fullName
														)
														.join(', ')}
												</TableCell>

												<TableCell className='text-right'>
													{gradeInfo ? (
														<Badge
															variant='outline'
															className={`${getGradeColor(
																gradeInfo.finalScore
															)} group-hover:shadow-sm transition-all`}
														>
															{gradeInfo.finalScore?.toFixed(
																2
															)}
														</Badge>
													) : (
														<span className='text-muted-foreground text-sm'>
															-
														</span>
													)}
												</TableCell>
											</TableRow>
										)
									})}
							</TableBody>
						</Table>
					</div>
				</ScrollArea>
			</CardContent>
		</Card>
	)
}
