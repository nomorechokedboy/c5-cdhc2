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
import { useTranslation } from 'react-i18next'

type InnerCourseDetailsProps = {
	data: Course
	onReload: (() => void) | (() => Promise<void>)
}

function InnerCourseDetails({
	data: course,
	onReload
}: InnerCourseDetailsProps) {
	const { t } = useTranslation()
	const { mutateAsync } = useMutation({
		mutationFn: CourseApi.UpdateCourseGrades
	})
	const students = course.students

	const [bulkEditMode, setBulkEditMode] = useState<
		'single-category' | 'all-grades' | null
	>(null)
	const [bulkEditCategory, setBulkEditCategory] = useState<
		Course['gradeCategories'][number] | undefined
	>()

	const handleGradeSave = async (
		studentId: number,
		category: number,
		value: number
	) => {
		const categoryInfo = course.gradeCategories.find(
			(c) => c.value === category
		)
		if (categoryInfo === undefined) {
			toast.error(t('grades.systemError'))
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
			toast.success(t('grades.updateSuccess'))
		} catch (err) {
			console.error('GradeSave error', err)
			toast.error(t('grades.updateError'))
		}
	}

	const handleBulkEditCategory = () => {
		setBulkEditMode('single-category')
		setBulkEditCategory(course.gradeCategories[0])
	}

	const handleBulkEditAll = () => {
		setBulkEditMode('all-grades')
		setBulkEditCategory(undefined)
	}

	const exitBulkEditMode = () => {
		setBulkEditMode(null)
		setBulkEditCategory(undefined)
	}

	const editModeDescription = bulkEditMode
		? `${t('grades.editMode')}: ${
				bulkEditMode === 'single-category'
					? t('grades.editCategory', {
							label: bulkEditCategory?.label
						})
					: t('grades.editAll')
			}`
		: t('grades.editHint')

	return (
		<div className='container mx-auto p-6 space-y-6'>
			<CourseHeader course={course} studentCount={students.length} />

			<Card className='border-border'>
				<CardHeader>
					<div className='flex items-center justify-between'>
						<div>
							<CardTitle className='text-xl font-semibold text-foreground'>
								{t('grades.studentGrades')}
							</CardTitle>
							<CardDescription className='text-muted-foreground'>
								{editModeDescription}
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
	if (isLoading) return <CourseDetailsSkeleton />
	if (error) return <CourseDetailsError error={error} onRetry={onRetry} />
	if (data) return <InnerCourseDetails data={data} onReload={onReload} />
	return <CourseDetailsSkeleton />
}
