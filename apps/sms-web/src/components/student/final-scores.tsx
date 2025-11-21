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
import type { Course, StudentGrades } from '@/types'

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
	const getScoreColor = (score: number) => {
		if (score >= 90) return 'bg-green-100 text-green-800'
		if (score >= 80) return 'bg-blue-100 text-blue-800'
		if (score >= 70) return 'bg-yellow-100 text-yellow-800'
		return 'bg-red-100 text-red-800'
	}

	const overallGPA = (
		courses.reduce(
			(sum, course) => sum + studentGrades[course.id].finalScore,
			0
		) / courses.length
	).toFixed(2)

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
								<TableHead>Course</TableHead>
								<TableHead>Instructor</TableHead>
								<TableHead className='text-right'>
									Final Score
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{[...Array(5)].map((_, idx) => (
								<TableRow key={idx}>
									<TableCell className='font-medium'>
										<Skeleton className='h-4 w-32' />
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

	return (
		<Card className='border-border'>
			<CardHeader>
				<div className='flex items-center justify-between'>
					<div>
						<CardTitle>Overall Academic Summary</CardTitle>
						<CardDescription>
							Final scores across all your courses
						</CardDescription>
					</div>
					<div className='text-center'>
						<p className='text-sm text-muted-foreground'>
							Overall Average
						</p>
						<Badge
							className={`${getScoreColor(Number.parseFloat(overallGPA))} text-lg px-3 py-1`}
						>
							{overallGPA}
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Course</TableHead>
							<TableHead>Instructor</TableHead>
							<TableHead className='text-right'>
								Final Score
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{courses.map((course) => (
							<TableRow key={course.id}>
								<TableCell className='font-medium text-foreground'>
									{course.title}
								</TableCell>
								<TableCell className='text-muted-foreground'>
									{course.teacher}
								</TableCell>
								<TableCell className='text-right'>
									<Badge
										className={`${getScoreColor(studentGrades[course.id].finalScore)}`}
									>
										{studentGrades[
											course.id
										].finalScore.toFixed(2)}
									</Badge>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}
