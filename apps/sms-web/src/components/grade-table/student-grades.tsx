import type { Grade, Student } from '@/types'
import { TableCell, TableRow } from '@repo/ui/components/ui/table'
import EditableGradeCell from '@/components/grade-table/editable-grade-cell'
import { Badge } from '@repo/ui/components/ui/badge'

export interface StudentGradesProps {
	bulkEditCategory: string
	bulkEditMode: 'single-category' | 'all-grades' | null
	gradeCategories: string[]
	student: Student
	onGradeSave: (studentId: number, category: string, value: number) => void
}

const calculateAverage = (grades: number[]) => {
	const total = grades.reduce((curr, accum) => curr + accum, 0)
	const gradesLen = grades.length

	return total / gradesLen
}

const calculateConditionalGrade = ({
	avg1TGrades,
	avg15MGrades
}: {
	avg1TGrades: number
	avg15MGrades: number
}) => {
	return (avg15MGrades + avg1TGrades * 2) / 3
}

const calculateFinalGrade = (studentGrades: Record<string, Grade>) => {
	const grades = Object.values(studentGrades)
	if (grades.length === 0) {
		return 0
	}

	const grade15M = grades.filter((v) => v.examType === '15P')
	const grade1T = grades.filter((v) => v.examType === '1T')
	const gradeFinalExam = grades.filter((v) => v.examType === 'Thi')

	const avg15MGrades = calculateAverage(grade15M.map((g) => g.grade)) || 0
	const avg1TGrades = calculateAverage(grade1T.map((g) => g.grade)) || 0
	const avgFinalExamGrades =
		calculateAverage(gradeFinalExam.map((g) => g.grade)) || 0

	const conditionalGrade = calculateConditionalGrade({
		avg1TGrades,
		avg15MGrades
	})

	return conditionalGrade * 0.4 + avgFinalExamGrades * 0.6
}

const getGradeColor = (average: number) => {
	if (average >= 9) return 'bg-green-100 text-green-800 border-green-200'
	if (average >= 8) return 'bg-blue-100 text-blue-800 border-blue-200'
	if (average >= 7) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
	if (average >= 5) return 'bg-orange-100 text-orange-800 border-orange-200'
	return 'bg-red-100 text-red-800 border-red-200'
}

export default function StudentGrades({
	bulkEditMode,
	bulkEditCategory,
	student,
	gradeCategories,
	onGradeSave
}: StudentGradesProps) {
	const finalGrade = calculateFinalGrade(student.grades)

	return (
		<TableRow key={student.id} className='hover:bg-muted/30'>
			<TableCell className='font-medium text-foreground'>
				{student.name}
			</TableCell>
			{gradeCategories.map((category) => {
				const isHighlighted =
					bulkEditMode === 'all-grades' ||
					(bulkEditMode === 'single-category' &&
						bulkEditCategory === category)

				return (
					<TableCell key={category} className='text-center'>
						<EditableGradeCell
							studentId={student.id}
							category={category}
							value={student.grades[category]?.grade || 0}
							isHighlighted={isHighlighted}
							onSave={onGradeSave}
						/>
					</TableCell>
				)
			})}
			<TableCell className='text-center'>
				<Badge
					variant='outline'
					className={`font-semibold ${getGradeColor(finalGrade)}`}
				>
					{finalGrade.toFixed(2)}
				</Badge>
			</TableCell>
		</TableRow>
	)
}
