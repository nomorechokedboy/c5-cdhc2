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
import { Badge } from '@repo/ui/components/ui/badge'
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
import { formatDate, getGradeColor } from '@/lib/utils'
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
		<div className='container mx-auto p-6 space-y-6'>
			<Button
				variant='ghost'
				onClick={onBack}
				className='mb-4 text-muted-foreground hover:text-foreground'
			>
				<ArrowLeft className='w-4 h-4 mr-2' />
				{t('course.backToMyCourses')}
			</Button>

			{detailError && (
				<ErrorState
					title={t('error.courseLoadTitle')}
					description={detailError}
					onRetry={() => setDetailError(null)}
				/>
			)}

			<Card className='border-border bg-gradient-to-r from-primary/5 to-transparent'>
				<CardHeader>
					<div className='space-y-4'>
						<div className='flex items-start justify-between'>
							<div className='space-y-2'>
								<CardTitle className='text-3xl font-bold text-foreground'>
									{course.title}
								</CardTitle>
								<CardDescription className='text-base'>
									{t('course.teacherLabel')}:{' '}
									<div className='flex flex-wrap gap-2'>
										{course.teachers
											? course.teachers.map((t) => (
													<Badge key={t.id}>
														{t.fullName}
													</Badge>
												))
											: t('course.noTeacher')}
									</div>
								</CardDescription>
							</div>
							<Badge
								className={`${getGradeColor(grades.finalScore)} text-lg px-3 py-1`}
							>
								{grades.finalScore.toFixed(2)}
							</Badge>
						</div>
						<p className='text-muted-foreground'>
							{course.description}
						</p>
						<div className='flex gap-6 text-sm pt-4 border-t border-border'>
							<div>
								<span className='text-muted-foreground'>
									{t('course.startDate')}
								</span>
								<p className='font-medium text-foreground'>
									{course.startDate === 0
										? t('course.noDate')
										: formatDate(course.startDate)}
								</p>
							</div>
							<div>
								<span className='text-muted-foreground'>
									{t('course.endDate')}
								</span>
								<p className='font-medium text-foreground'>
									{course.endDate === 0
										? t('course.noDate')
										: formatDate(course.endDate)}
								</p>
							</div>
						</div>
					</div>
				</CardHeader>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{t('course.gradeTitle')}</CardTitle>
					<CardDescription>
						{t('course.gradeSubtitle')}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{t('course.examColumn')}</TableHead>
								<TableHead className='text-right'>
									{t('course.gradeColumn')}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{course.gradeCategories.map((category) => (
								<TableRow key={category.value}>
									<TableCell className='font-medium text-foreground'>
										{category.label}
									</TableCell>
									<TableCell className='text-right'>
										<Badge
											className={`${getGradeColor(grades.grades[category.value] || 0)}`}
										>
											{(
												grades.grades[category.value] ||
												0
											).toFixed(2)}
										</Badge>
									</TableCell>
								</TableRow>
							))}
							<TableRow className='border-t-2 border-border'>
								<TableCell className='font-bold text-foreground'>
									{t('course.finalGrade')}
								</TableCell>
								<TableCell className='text-right'>
									<Badge
										className={`${getGradeColor(grades.finalScore)} font-bold text-base`}
									>
										{grades.finalScore.toFixed(2)}
									</Badge>
								</TableCell>
							</TableRow>
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	)
}
