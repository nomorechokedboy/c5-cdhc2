import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { VariantProps } from 'class-variance-authority'
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Student, StudentBody } from '@/types'
import {
	RECORD_DIALOG_CLASS,
	RECORD_TITLE_CLASS,
	RecordMain,
	SlideIn,
	recordFromValues,
	type RecordView
} from './student-record'
import { CreateFooter } from './student-create/CreateFooter'
import { LiveRecordCard } from './student-create/LiveRecordCard'
import { ReviewSummary } from './student-create/ReviewSummary'
import { useStudentCreateForm } from './student-create/useStudentCreateForm'

/** Dấu «Đã lập hồ sơ» nằm lại trên thẻ chừng này rồi hộp thoại mới đóng */
const STAMP_MS = 1200

export interface StudentFormProps {
	onSuccess: (
		data: Student[],
		variables: StudentBody,
		context: unknown
	) => unknown
	buttonProps?: React.ComponentProps<'button'> &
		VariantProps<typeof buttonVariants> & { asChild?: boolean }
}

/**
 * Nút «Thêm học viên» mở hộp thoại lập hồ sơ: thẻ hồ sơ bên trái được dựng dần
 * theo dữ liệu nhập, bên phải là dải giấy điện tim trượt qua từng bước.
 */
export default function StudentForm({
	onSuccess,
	buttonProps
}: StudentFormProps) {
	const [open, setOpen] = useState(false)
	// Bản chụp thẻ lúc tạo xong: form đã bị xoá nên thẻ phải giữ lại để đóng dấu
	const [frozen, setFrozen] = useState<RecordView | null>(null)
	const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
	useEffect(() => () => clearTimeout(closeTimer.current), [])

	const {
		form,
		steps,
		currentStep,
		completedSteps,
		isLastStep,
		next,
		previous,
		goTo
	} = useStudentCreateForm({
		onSuccess: (...args) => {
			setFrozen(recordFromValues(form.state.values as any))
			return onSuccess(...args)
		},
		onCreated: () => {
			closeTimer.current = setTimeout(() => {
				setOpen(false)
				setFrozen(null)
			}, STAMP_MS)
		}
	})
	const { Content } = steps[currentStep]

	return (
		<Dialog open={open} onOpenChange={(o) => !frozen && setOpen(o)}>
			<DialogTrigger asChild>
				<Button {...buttonProps}>
					<Plus className='w-4 h-4 mr-2' />
					Thêm học viên
				</Button>
			</DialogTrigger>
			<DialogContent className={RECORD_DIALOG_CLASS}>
				<LiveRecordCard
					form={form}
					frozen={frozen}
					done={completedSteps.length}
					total={steps.length}
				/>
				<RecordMain
					title={
						<DialogTitle className={RECORD_TITLE_CLASS}>
							Lập hồ sơ học viên
						</DialogTitle>
					}
					steps={steps}
					currentStep={currentStep}
					completedSteps={completedSteps}
					onStepClick={goTo}
					dimmed={!!frozen}
					footer={
						<CreateFooter
							form={form}
							currentStep={currentStep}
							stepCount={steps.length}
							isLastStep={isLastStep}
							onPrevious={previous}
							onNext={next}
						/>
					}
				>
					{(direction) => (
						<SlideIn step={currentStep} direction={direction}>
							<form
								onSubmit={(e) => {
									e.preventDefault()
									e.stopPropagation()
									// Enter ở các bước giữa không được gửi form
									if (isLastStep) form.handleSubmit()
								}}
								id='studentForm'
							>
								<Content form={form} />
								{isLastStep && <ReviewSummary form={form} />}
							</form>
						</SlideIn>
					)}
				</RecordMain>
			</DialogContent>
		</Dialog>
	)
}
