import { Button } from '@repo/ui/components/ui/button'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import type { Student } from '@/types'
import StudentGrades from './student-grades'

interface GradesTableProps {
	students: Student[]
	gradeCategories: { label: string; value: number }[]
	bulkEditMode: 'single-category' | 'all-grades' | null
	bulkEditCategory: number
	onGradeSave: (studentId: number, category: number, value: number) => void
	onCategorySelect: (category: number) => void
}

export default function GradesTable({
	students,
	gradeCategories,
	bulkEditMode,
	bulkEditCategory,
	onGradeSave,
	onCategorySelect
}: GradesTableProps) {
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
								key={category.value}
								className='font-semibold text-foreground text-center'
							>
								<div className='flex items-center justify-center gap-2'>
									{category.label}
									{bulkEditMode === 'single-category' && (
										<Button
											size='sm'
											variant={
												bulkEditCategory ===
												category.value
													? 'default'
													: 'ghost'
											}
											onClick={() =>
												onCategorySelect(category.value)
											}
											className='h-6 px-2 text-xs'
										>
											{bulkEditCategory === category.value
												? 'Selected'
												: 'Select'}
										</Button>
									)}
								</div>
							</TableHead>
						))}
						<TableHead className='font-semibold text-foreground text-center'>
							Tổng kết môn
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{students.map((student) => (
						<StudentGrades
							key={student.id}
							bulkEditMode={bulkEditMode}
							bulkEditCategory={bulkEditCategory}
							student={student}
							gradeCategories={gradeCategories}
							onGradeSave={onGradeSave}
						/>
					))}
				</TableBody>
			</Table>
		</div>
	)
}
