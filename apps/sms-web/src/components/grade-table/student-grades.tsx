import { Fragment } from 'react'
import type { Course, Student } from '@/types'
import { TableCell, TableRow } from '@repo/ui/components/ui/table'
import EditableGradeCell from '@/components/grade-table/editable-grade-cell'
import { Score } from '@/components/score'
import { calculateFinalGrade } from '@/lib/utils'
import { hasConditionalAfter } from './columns'

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
	const { conditionalGrade, finalGrade } = calculateFinalGrade(student.grades)

	return (
		<TableRow className='group/row'>
			<TableCell className='text-foreground bg-card group-hover/row:bg-accent sticky left-0 z-10 font-medium whitespace-nowrap'>
				{student.name}
			</TableCell>
			{gradeCategories.map((category, idx) => {
				const isHighlighted =
					bulkEditMode === 'all-grades' ||
					(bulkEditMode === 'single-category' &&
						bulkEditCategory?.value === category.value)

				return (
					<Fragment key={category.value}>
						<TableCell className='text-center'>
							<EditableGradeCell
								studentId={student.id}
								category={category.value}
								value={
									student.grades[category.label]?.grade || 0
								}
								isHighlighted={isHighlighted}
								onSave={onGradeSave}
							/>
						</TableCell>
						{hasConditionalAfter(idx, gradeCategories.length) && (
							<TableCell className='border-rule border-l text-center'>
								<Score
									value={conditionalGrade}
									className='text-base'
								/>
							</TableCell>
						)}
					</Fragment>
				)
			})}
			<TableCell className='border-rule border-l text-center'>
				<Score value={finalGrade} className='text-lg' />
			</TableCell>
		</TableRow>
	)
}
