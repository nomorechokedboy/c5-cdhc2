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
import { useMutation } from '@tanstack/react-query'
import { CourseApi } from '@/api'
import { toast } from '@repo/ui/components/ui/sonner'

type InnerCourseDetailsProps = {
	data: Course
	onReload: (() => void) | (() => Promise<void>)
}

function InnerCourseDetails({
	data: course,
	onReload
}: InnerCourseDetailsProps) {
	const { mutateAsync, isPending } = useMutation({
		mutationFn: CourseApi.UpdateCourseGrades
	})
	const students = course.students

	const [bulkEditMode, setBulkEditMode] = useState<
		'single-category' | 'all-grades' | null
	>(null)
	const [bulkEditCategory, setBulkEditCategory] = useState<number>(0)

	const handleGradeSave = async (
		studentId: number,
		category: number,
		value: number
	) => {
		const categoryInfo = course.gradeCategories.find(
			(c) => c.value === category
		)
		if (categoryInfo === undefined) {
			toast.error(
				'Lỗi hệ thống khi cập nhật điểm! Vui lòng liên hệ quản trị viên.'
			)
			return
		}

		try {
			await mutateAsync({
				itemnumber: categoryInfo.itemNumber,
				activityid: category,
				courseid: course.id,
				grades: [{ studentid: studentId, grade: value }],
				component: `mod_${categoryInfo.type}`,
				source: `mod/${categoryInfo.type}`
			})
			await onReload()
			toast.success('Cập nhật điểm thành công!')
		} catch (err) {
			console.error('GradeSave error', err)
			toast.error('Cập nhật điểm thất bại! ')
		}
	}

	const handleBulkEditCategory = () => {
		setBulkEditMode('single-category')
		setBulkEditCategory(course.gradeCategories[0].value)
	}

	const handleBulkEditAll = () => {
		setBulkEditMode('all-grades')
		setBulkEditCategory(0)
	}

	const exitBulkEditMode = () => {
		setBulkEditMode(null)
		setBulkEditCategory(0)
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
	onReload: (() => void) | (() => Promise<void>)
}

export default function CourseDetails({
	isLoading,
	error,
	data,
	onRetry,
	onReload
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
		return <InnerCourseDetails data={data} onReload={onReload} />
	}

	// Fallback - shouldn't normally reach here
	return <CourseDetailsSkeleton />
}
