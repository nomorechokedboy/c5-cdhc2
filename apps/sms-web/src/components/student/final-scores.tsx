import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
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
import { overallScore } from '@/lib/score'
import { Score } from '@/components/score'
import { useTranslation } from 'react-i18next'

interface StudentFinalScoresProps {
	courses: Course[]
	studentGrades: StudentGrades
	isLoading?: boolean
}

function ColumnHeads() {
	const { t } = useTranslation()
	return (
		<TableRow className='hover:bg-transparent'>
			<TableHead className='w-[40%]'>
				{t('finalScores.courseColumn')}
			</TableHead>
			<TableHead>{t('finalScores.semesterColumn')}</TableHead>
			<TableHead className='hidden xl:table-cell'>
				{t('finalScores.teacherColumn')}
			</TableHead>
			<TableHead className='pr-4 text-right'>
				{t('finalScores.gradeColumn')}
			</TableHead>
		</TableRow>
	)
}

/** Trang «sổ điểm»: điểm tổng kết viết to có gạch đôi, dưới là từng môn theo kỳ. */
export default function StudentFinalScores({
	courses,
	studentGrades,
	isLoading = false
}: StudentFinalScoresProps) {
	const { t } = useTranslation()
	const overall = overallScore(courses, studentGrades)

	if (isLoading) {
		return (
			<Card>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div className='flex-1'>
							<Skeleton className='mb-2 h-6 w-48' />
							<Skeleton className='h-4 w-64' />
						</div>
						<Skeleton className='ml-4 h-10 w-20' />
					</div>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<ColumnHeads />
						</TableHeader>
						<TableBody>
							{[...Array(5)].map((_, idx) => (
								<TableRow key={idx}>
									<TableCell>
										<Skeleton className='h-4 w-32' />
									</TableCell>
									<TableCell>
										<Skeleton className='h-4 w-8' />
									</TableCell>
									<TableCell className='hidden xl:table-cell'>
										<Skeleton className='h-4 w-24' />
									</TableCell>
									<TableCell className='text-right'>
										<Skeleton className='ml-auto h-5 w-12' />
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		)
	}

	const bySemester = [...courses].sort(
		(a, b) => (a.semester ?? 0) - (b.semester ?? 0)
	)

	return (
		<Card>
			<CardHeader className='pb-4'>
				<div className='flex items-center justify-between gap-4'>
					<div>
						<CardTitle className='text-xl'>
							{t('finalScores.title')}
						</CardTitle>
						<CardDescription>
							{t('finalScores.subtitle')}
						</CardDescription>
					</div>

					<div className='flex shrink-0 flex-col items-center gap-1.5'>
						<Score
							value={overall}
							className='total-rule px-1 text-4xl'
						/>
						<p className='text-muted-foreground text-xs'>
							{t('finalScores.overallGrade')}
						</p>
					</div>
				</div>
			</CardHeader>

			<CardContent className='p-0'>
				<ScrollArea className='w-full [&_[data-slot=scroll-area-viewport]]:max-h-[calc(100vh-300px)]'>
					<div className='p-6 pt-0'>
						<Table>
							<TableHeader>
								<ColumnHeads />
							</TableHeader>

							<TableBody>
								{bySemester.map((course) => {
									const gradeInfo = studentGrades[course.id]
									return (
										<TableRow key={course.id}>
											<TableCell className='font-medium'>
												<div className='flex flex-col'>
													<span
														className='max-w-[150px] truncate lg:max-w-[200px]'
														title={course.title}
													>
														{course.title}
													</span>
													<span className='text-muted-foreground max-w-[150px] truncate text-xs xl:hidden'>
														{
															course.teachers?.[0]
																?.fullName
														}
													</span>
												</div>
											</TableCell>
											<TableCell className='text-muted-foreground text-xs whitespace-nowrap'>
												{course.semester}
											</TableCell>
											<TableCell className='text-muted-foreground hidden max-w-[120px] truncate xl:table-cell'>
												{course.teachers
													?.map(
														(teacher) =>
															teacher.fullName
													)
													.join(', ')}
											</TableCell>
											<TableCell className='pr-4 text-right'>
												{gradeInfo ? (
													<Score
														value={
															gradeInfo.finalScore
														}
														className='text-base'
													/>
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
