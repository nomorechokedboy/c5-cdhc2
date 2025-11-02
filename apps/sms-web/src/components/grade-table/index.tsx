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
