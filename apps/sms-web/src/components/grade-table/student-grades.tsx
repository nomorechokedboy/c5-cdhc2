import type { Course, Student } from '@/types'
import { TableCell, TableRow } from '@repo/ui/components/ui/table'
import EditableGradeCell from '@/components/grade-table/editable-grade-cell'
import { Badge } from '@repo/ui/components/ui/badge'
import { calculateFinalGrade, getGradeColor } from '@/lib/utils'

export interface StudentGradesProps {
	bulkEditCategory: Course['gradeCategories'][number] | undefined
	bulkEditMode: 'single-category' | 'all-grades' | null
	gradeCategories: { label: string; value: number }[]
	student: Student
	onGradeSave: (studentId: number, category: number, value: number) => void
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
						bulkEditCategory?.value === category.value)

				return (
					<TableCell key={category.value} className='text-center'>
						<EditableGradeCell
							studentId={student.id}
							category={category.value}
							value={student.grades[category.label]?.grade || 0}
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
