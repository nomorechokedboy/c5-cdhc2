import { useState } from 'react'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import CourseHeader from '@/components/grade-table/course-header'
import BulkEditControls from '@/components/grade-table/bulk-edit-controls'
import GradesTable from '@/components/grade-table'
import type { Course } from '@/types'
import CourseDetailsSkeleton from './skeleton'
import CourseDetailsError from './error'

type InnerCourseDetailsProps = {
	data: Course
}

function InnerCourseDetails({ data: course }: InnerCourseDetailsProps) {
	const students = course.students

	const [bulkEditMode, setBulkEditMode] = useState<
		'single-category' | 'all-grades' | null
	>(null)
	const [bulkEditCategory, setBulkEditCategory] = useState<string>('')

	const handleGradeSave = (
		studentId: number,
		category: string,
		value: number
	) => {
		console.log('Hi')
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
								Điểm số học viên
							</CardTitle>
							<CardDescription className='text-muted-foreground'>
								{bulkEditMode
									? `Chế độ sửa điểm: ${bulkEditMode === 'single-category' ? `Sửa điểm ${bulkEditCategory} cho tất cả học viên` : 'Sửa điểm tất cả các môn của tất cả học viên'}`
									: 'Nhấp đúp chuột vào điểm để chỉnh sửa. Điểm tổng kết sẽ được tính tự động.'}
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

export type CourseDetailsProps = {
	isLoading: boolean
	error?: Error | string | null
	data?: Course
	onRetry: () => void
}

export default function CourseDetails({
	isLoading,
	error,
	data,
	onRetry
}: CourseDetailsProps) {
	// Show loading skeleton
	if (isLoading) {
		return <CourseDetailsSkeleton />
	}

	// Show error state
	if (error) {
		return <CourseDetailsError error={error} onRetry={onRetry} />
	}

	// Show actual content
	if (data) {
		return <InnerCourseDetails data={data} />
	}

	// Fallback - shouldn't normally reach here
	return <CourseDetailsSkeleton />
}
