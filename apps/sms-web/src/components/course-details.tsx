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

interface Student {
	id: string
	name: string
	grades: { [key: string]: number }
}

interface Course {
	id: string
	title: string
	description: string
	startDate: string
	endDate: string
	gradeCategories: string[]
}

export default function CourseDetails() {
	const [course] = useState<Course>({
		id: '1',
		title: 'Advanced Computer Science',
		description:
			'An in-depth exploration of advanced algorithms, data structures, and software engineering principles.',
		startDate: '2024-01-15',
		endDate: '2024-05-15',
		gradeCategories: [
			'Midterm Exam',
			'Final Exam',
			'Project',
			'Assignments'
		]
	})

	const [students, setStudents] = useState<Student[]>([
		{
			id: '1',
			name: 'Alice Johnson',
			grades: {
				'Midterm Exam': 85,
				'Final Exam': 92,
				Project: 88,
				Assignments: 90
			}
		},
		{
			id: '2',
			name: 'Bob Smith',
			grades: {
				'Midterm Exam': 78,
				'Final Exam': 84,
				Project: 82,
				Assignments: 86
			}
		},
		{
			id: '3',
			name: 'Carol Davis',
			grades: {
				'Midterm Exam': 92,
				'Final Exam': 95,
				Project: 94,
				Assignments: 93
			}
		},
		{
			id: '4',
			name: 'David Wilson',
			grades: {
				'Midterm Exam': 76,
				'Final Exam': 80,
				Project: 79,
				Assignments: 82
			}
		},
		{
			id: '5',
			name: 'Emma Brown',
			grades: {
				'Midterm Exam': 89,
				'Final Exam': 87,
				Project: 91,
				Assignments: 88
			}
		}
	])

	const [bulkEditMode, setBulkEditMode] = useState<
		'single-category' | 'all-grades' | null
	>(null)
	const [bulkEditCategory, setBulkEditCategory] = useState<string>('')

	const handleGradeSave = (
		studentId: string,
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
		<div className='container mx-auto p-6 space-y-6'>
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
