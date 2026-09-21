import { useState, useEffect } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@repo/ui/components/ui/button'
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
import { DetailPageSkeleton } from './loading-skeleton'
import ErrorState from '@/components/error-state'
import type { Course, StudentGradesSummary } from '@/types'
import { formatDate } from '@/lib/utils'
import { Score } from '@/components/score'
import { useTranslation } from 'react-i18next'

interface StudentCourseDetailProps {
	course: Course
	grades: StudentGradesSummary
	onBack: () => void
	isLoading?: boolean
}

export default function StudentCourseDetail({
	course,
	grades,
	onBack,
	isLoading = false
}: StudentCourseDetailProps) {
	const { t } = useTranslation()
	const [detailLoading, setDetailLoading] = useState(true)
	const [detailError, setDetailError] = useState<string | null>(null)

	useEffect(() => {
		const loadDetails = async () => {
			try {
				setDetailLoading(true)
				setDetailError(null)
				await new Promise((resolve) => setTimeout(resolve, 800))
			} catch {
				setDetailError(t('error.courseLoadDesc'))
			} finally {
				setDetailLoading(false)
			}
		}
		loadDetails()
	}, [course.id])

	if (isLoading || detailLoading) {
		return (
			<div className='container mx-auto p-6 space-y-6'>
				<Button
					variant='ghost'
					onClick={onBack}
					className='mb-4 ml-6 text-muted-foreground hover:text-foreground'
				>
					<ArrowLeft className='w-4 h-4 mr-2' />
					{t('course.backToMyCourses')}
				</Button>
				<DetailPageSkeleton />
			</div>
		)
	}

	return (
		<div className='container mx-auto space-y-6 p-6'>
			<Button
				variant='ghost'
				onClick={onBack}
				className='text-muted-foreground hover:text-foreground -ml-3'
			>
				<ArrowLeft className='mr-2 h-4 w-4' />
				{t('course.backToMyCourses')}
			</Button>

			{detailError && (
				<ErrorState
					title={t('error.courseLoadTitle')}
					description={detailError}
					onRetry={() => setDetailError(null)}
				/>
			)}

			<div className='grid gap-6 lg:grid-cols-[22rem_1fr]'>
				<Card className='self-start'>
					<CardHeader>
						<CardTitle className='text-2xl leading-snug'>
							{course.title}
						</CardTitle>
						<CardDescription className='text-base'>
							{t('course.teacherLabel')}:{' '}
							{course.teachers && course.teachers.length > 0
								? course.teachers
										.map((teacher) => teacher.fullName)
										.join(', ')
								: t('course.noTeacher')}
						</CardDescription>
					</CardHeader>
					<CardContent className='space-y-4'>
						{course.description && (
							<p className='text-muted-foreground'>
								{course.description}
							</p>
						)}
						<dl className='border-rule grid grid-cols-2 gap-4 border-t pt-4 text-sm'>
							<div>
								<dt className='text-muted-foreground'>
									{t('course.startDate')}
								</dt>
								<dd className='text-foreground font-medium'>
									{course.startDate === 0
										? t('course.noDate')
										: formatDate(course.startDate)}
								</dd>
							</div>
							<div>
								<dt className='text-muted-foreground'>
									{t('course.endDate')}
								</dt>
								<dd className='text-foreground font-medium'>
									{course.endDate === 0
										? t('course.noDate')
										: formatDate(course.endDate)}
								</dd>
							</div>
						</dl>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className='text-xl'>
							{t('course.gradeTitle')}
						</CardTitle>
						<CardDescription>
							{t('course.gradeSubtitle')}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow className='hover:bg-transparent'>
									<TableHead>
										{t('course.examColumn')}
									</TableHead>
									<TableHead className='pr-4 text-right'>
										{t('course.gradeColumn')}
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{course.gradeCategories.map((category) => (
									<TableRow key={category.value}>
										<TableCell className='text-foreground font-medium'>
											{category.label}
										</TableCell>
										<TableCell className='pr-4 text-right'>
											<Score
												value={
													grades.grades[
														category.label
													] || 0
												}
												className='text-lg'
											/>
										</TableCell>
									</TableRow>
								))}
								<TableRow className='hover:bg-transparent'>
									<TableCell className='text-foreground font-serif text-base font-semibold'>
										{t('course.finalGrade')}
									</TableCell>
									<TableCell className='pr-4 text-right'>
										<Score
											value={grades.finalScore}
											className='total-rule px-1 text-2xl'
										/>
									</TableCell>
								</TableRow>
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}
