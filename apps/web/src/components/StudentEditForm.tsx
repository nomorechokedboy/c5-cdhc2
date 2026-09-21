import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { Student } from '@/types'
import { EditFooter } from './student-edit/EditFooter'
import { LiveEditCard } from './student-edit/LiveEditCard'
import { EDIT_TAB_CONTENT } from './student-edit/tabs/content'
import { useEditTabs } from './student-edit/useEditTabs'
import { useStudentEditForm } from './student-edit/useStudentEditForm'
import { PROFILE_STEPS, PROFILE_TABS } from './student-profile/profile-tabs'
import {
	RECORD_TITLE_CLASS,
	RecordMain,
	slideClass,
	useVisitedSteps
} from './student-record'

interface StudentEditFormProps {
	student: Student
	onClose?: () => void
	/** Tiêu đề của hộp thoại chứa form (DialogTitle) */
	heading?: ReactNode
}

/**
 * Form sửa học viên, cùng khung với màn xem và form thêm: thẻ hồ sơ sống bên trái,
 * năm nhóm trên giấy điện tim bên phải. Nhóm nào có lỗi thì dải mạch báo đỏ.
 */
export default function StudentEditForm({
	student,
	onClose,
	heading
}: StudentEditFormProps) {
	const formId = useId()
	const { form, isPending } = useStudentEditForm(student, onClose)
	const { active, setActive, errorTabs } = useEditTabs(form)
	const step = PROFILE_TABS.findIndex((t) => t.value === active)
	const visited = useVisitedSteps(step)
	const errorSteps = PROFILE_TABS.flatMap((t, i) =>
		errorTabs.has(t.value) ? [i] : []
	)

	return (
		<>
			<LiveEditCard form={form} student={student} />
			<RecordMain
				title={
					heading ?? (
						<h2 className={RECORD_TITLE_CLASS}>
							Sửa thông tin học viên
						</h2>
					)
				}
				steps={PROFILE_STEPS}
				currentStep={step}
				completedSteps={visited}
				errorSteps={errorSteps}
				onStepClick={(i) => setActive(PROFILE_TABS[i].value)}
				footer={
					<EditFooter
						formId={formId}
						isPending={isPending}
						errorTabs={errorTabs}
						onCancel={onClose}
					/>
				}
			>
				{(direction) => (
					<form
						id={formId}
						onSubmit={(e) => {
							e.preventDefault()
							form.handleSubmit()
						}}
						className='px-6 py-4'
					>
						{/* Mọi nhóm luôn được mount để lỗi ở nhóm đang ẩn vẫn ghi nhận đúng chỗ;
						    nhóm không mở chỉ bị ẩn, nhóm mở trượt vào theo chiều đi */}
						{PROFILE_TABS.map(({ value }, i) => {
							const Content = EDIT_TAB_CONTENT[value]
							return (
								<div
									key={value}
									data-active={i === step}
									className={cn(
										'space-y-6',
										i === step
											? slideClass(direction)
											: 'hidden'
									)}
								>
									<Content form={form} />
								</div>
							)
						})}
					</form>
				)}
			</RecordMain>
		</>
	)
}
