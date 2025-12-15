import { Button } from '@repo/ui/components/ui/button'
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import type { Course, Student } from '@/types'
import StudentGrades from './student-grades'

interface GradesTableProps {
	students: Student[]
	gradeCategories: Course['gradeCategories']
	bulkEditMode: 'single-category' | 'all-grades' | null
	bulkEditCategory: Course['gradeCategories'][number] | undefined
	onGradeSave: (studentId: number, category: number, value: number) => void
	onCategorySelect: (
		category: Course['gradeCategories'][number] | undefined
	) => void
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
							Tên học viên
						</TableHead>
						{gradeCategories.map((category, idx) => (
							<>
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
													bulkEditCategory?.value ===
													category.value
														? 'default'
														: 'ghost'
												}
												onClick={() =>
													onCategorySelect(category)
												}
												className='h-6 px-2 text-xs'
											>
												{bulkEditCategory?.value ===
												category.value
													? 'Đang chọn'
													: 'Chọn'}
											</Button>
										)}
									</div>
								</TableHead>
								{gradeCategories.length > 2 &&
									idx === gradeCategories.length - 2 && (
										<TableHead className='font-semibold text-foreground text-center'>
											Điểm điều kiện
										</TableHead>
									)}
							</>
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
