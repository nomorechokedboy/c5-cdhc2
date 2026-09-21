import { Fragment } from 'react'
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
import { hasConditionalAfter } from './columns'
import { useTranslation } from 'react-i18next'

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

/** Sổ điểm của lớp: mỗi hàng một học viên, mỗi cột một bài kiểm tra, hai cột tổng ở cuối. */
export default function GradesTable({
	students,
	gradeCategories,
	bulkEditMode,
	bulkEditCategory,
	onGradeSave,
	onCategorySelect
}: GradesTableProps) {
	const { t } = useTranslation()

	return (
		<div className='border-border overflow-hidden rounded-md border'>
			<Table>
				<TableHeader>
					<TableRow className='hover:bg-transparent'>
						<TableHead className='bg-card sticky left-0 z-10'>
							{t('grades.studentName')}
						</TableHead>
						{gradeCategories.map((category, idx) => (
							<Fragment key={category.value}>
								<TableHead className='text-center'>
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
												className='h-6 px-2 font-sans text-xs'
											>
												{bulkEditCategory?.value ===
												category.value
													? t('grades.selected')
													: t('grades.select')}
											</Button>
										)}
									</div>
								</TableHead>
								{hasConditionalAfter(
									idx,
									gradeCategories.length
								) && (
									<TableHead className='border-rule border-l text-center'>
										{t('grades.conditionalGrade')}
									</TableHead>
								)}
							</Fragment>
						))}
						<TableHead className='border-rule border-l text-center'>
							{t('grades.finalGrade')}
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
