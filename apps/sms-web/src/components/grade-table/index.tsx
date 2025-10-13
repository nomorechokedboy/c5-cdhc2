import { Button } from '@repo/ui/components/ui/button'
import { Badge } from '@repo/ui/components/ui/badge'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import EditableGradeCell from './editable-grade-cell'
import type { Student } from '@/types'

interface GradesTableProps {
	students: Student[]
	gradeCategories: string[]
	bulkEditMode: 'single-category' | 'all-grades' | null
	bulkEditCategory: string
	onGradeSave: (studentId: number, category: string, value: number) => void
	onCategorySelect: (category: string) => void
}

export default function GradesTable({
	students,
	gradeCategories,
	bulkEditMode,
	bulkEditCategory,
	onGradeSave,
	onCategorySelect
}: GradesTableProps) {
	const calculateAverage = (grades: Record<string, number>) => {
		const values = Object.values(grades).filter(
			(grade) => grade !== undefined && grade !== null
		)
		if (values.length === 0) return 0
		return Math.round(
			values.reduce((sum, grade) => sum + grade, 0) / values.length
		)
	}

	const getGradeColor = (average: number) => {
		if (average >= 9) return 'bg-green-100 text-green-800 border-green-200'
		if (average >= 8) return 'bg-blue-100 text-blue-800 border-blue-200'
		if (average >= 7)
			return 'bg-yellow-100 text-yellow-800 border-yellow-200'
		if (average >= 5)
			return 'bg-orange-100 text-orange-800 border-orange-200'
		return 'bg-red-100 text-red-800 border-red-200'
	}

	return (
		<div className='rounded-md border border-border overflow-hidden'>
			<Table>
				<TableHeader>
					<TableRow className='bg-muted/50'>
						<TableHead className='font-semibold text-foreground'>
							Student Name
						</TableHead>
						{gradeCategories.map((category) => (
							<TableHead
								key={category}
								className='font-semibold text-foreground text-center'
							>
								<div className='flex items-center justify-center gap-2'>
									{category}
									{bulkEditMode === 'single-category' && (
										<Button
											size='sm'
											variant={
												bulkEditCategory === category
													? 'default'
													: 'ghost'
											}
											onClick={() =>
												onCategorySelect(category)
											}
											className='h-6 px-2 text-xs'
										>
											{bulkEditCategory === category
												? 'Selected'
												: 'Select'}
										</Button>
									)}
								</div>
							</TableHead>
						))}
						<TableHead className='font-semibold text-foreground text-center'>
							Total Grade
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{students.map((student) => {
						const average = calculateAverage(student.grades)
						return (
							<TableRow
								key={student.id}
								className='hover:bg-muted/30'
							>
								<TableCell className='font-medium text-foreground'>
									{student.name}
								</TableCell>
								{gradeCategories.map((category) => {
									const isHighlighted =
										bulkEditMode === 'all-grades' ||
										(bulkEditMode === 'single-category' &&
											bulkEditCategory === category)

									return (
										<TableCell
											key={category}
											className='text-center'
										>
											<EditableGradeCell
												studentId={student.id}
												category={category}
												value={
													student.grades[category] ||
													0
												}
												isHighlighted={isHighlighted}
												onSave={onGradeSave}
											/>
										</TableCell>
									)
								})}
								<TableCell className='text-center'>
									<Badge
										variant='outline'
										className={`font-semibold ${getGradeColor(average)}`}
									>
										{average}%
									</Badge>
								</TableCell>
							</TableRow>
						)
					})}
				</TableBody>
			</Table>
		</div>
	)
}
