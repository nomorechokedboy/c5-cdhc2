import { useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import CourseHeader from './grade-table/course-header'
import BulkEditControls from './grade-table/bulk-edit-controls'
import GradesTable from './grade-table'
import type { Course, Student } from '@/types'

export type CourseDetailsProps = {
	data: Course
}

export default function CourseDetails({ data: course }: CourseDetailsProps) {
	const [students, setStudents] = useState<Student[]>(course.students)

	const [bulkEditMode, setBulkEditMode] = useState<
		'single-category' | 'all-grades' | null
	>(null)
	const [bulkEditCategory, setBulkEditCategory] = useState<string>('')

	const handleGradeSave = (
		studentId: number,
		category: string,
		value: number
	) => {
		setStudents((prev) =>
			prev.map((student) =>
				student.id === studentId
					? {
							...student,
							grades: {
								...student.grades,
								[category]: value
							}
						}
					: student
			)
		)
	}

	const handleBulkEditCategory = () => {
		setBulkEditMode('single-category')
		setBulkEditCategory(course.gradeCategories[0])
	}

	const handleBulkEditAll = () => {
		setBulkEditMode('all-grades')
		setBulkEditCategory('')
	}

	const exitBulkEditMode = () => {
		setBulkEditMode(null)
		setBulkEditCategory('')
	}

	return (
		<div className='container mx-auto p-6 space-y-6 relative'>
			<CourseHeader course={course} studentCount={students.length} />

			<Card className='border-border'>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='text-xl font-semibold text-foreground'>
								Student Grades
							</CardTitle>
							<CardDescription className='text-muted-foreground'>
								{bulkEditMode
									? `Bulk editing mode: ${bulkEditMode === 'single-category' ? `${bulkEditCategory} for all students` : 'All grades for all students'}`
									: 'Click on any grade to edit. Grades are automatically averaged to calculate the total.'}
							</CardDescription>
						</div>
						<BulkEditControls
							bulkEditMode={bulkEditMode}
							onEditAll={handleBulkEditAll}
							onEditCategory={handleBulkEditCategory}
							onExitBulkEdit={exitBulkEditMode}
						/>
					</div>
				</CardHeader>
				<CardContent>
					<GradesTable
						students={students}
						gradeCategories={course.gradeCategories}
						bulkEditMode={bulkEditMode}
						bulkEditCategory={bulkEditCategory}
						onGradeSave={handleGradeSave}
						onCategorySelect={setBulkEditCategory}
					/>
				</CardContent>
			</Card>
		</div>
	)
}
