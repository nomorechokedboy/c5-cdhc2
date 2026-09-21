import { Plus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { VariantProps } from 'class-variance-authority'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Student, StudentBody } from '@/types'
import { CreateFooter } from './student-create/CreateFooter'
import { LiveRecordCard } from './student-create/LiveRecordCard'
import { PaperStep } from './student-create/PaperStep'
import { PenTrace } from './student-create/PenTrace'
import { recordFromValues, type RecordView } from './student-create/record'
import { ReviewSummary } from './student-create/ReviewSummary'
import { useStepDirection } from './student-create/useStepDirection'
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
	const direction = useStepDirection(currentStep)

	const { Content } = steps[currentStep]

	return (
		<Dialog open={open} onOpenChange={(o) => !frozen && setOpen(o)}>
			<DialogTrigger asChild>
				<Button {...buttonProps}>
					<Plus className='w-4 h-4 mr-2' />
					Thêm học viên
				</Button>
			</DialogTrigger>
			<DialogContent className='flex flex-col gap-0 overflow-hidden p-0 lg:grid lg:h-9/10 lg:max-w-5xl lg:grid-cols-[17rem_minmax(0,1fr)]'>
				<LiveRecordCard
					form={form}
					frozen={frozen}
					done={completedSteps.length}
					total={steps.length}
				/>

				<div
					className='flex min-h-0 flex-col data-[stamped=true]:pointer-events-none data-[stamped=true]:opacity-40'
					data-stamped={!!frozen}
				>
					<DialogHeader className='px-6 pt-6 pb-2'>
						<DialogTitle className='font-display text-2xl tracking-wide'>
							Lập hồ sơ học viên
						</DialogTitle>
					</DialogHeader>
					<div className='px-6 pb-3'>
						<PenTrace
							steps={steps}
							completedSteps={completedSteps}
							currentStep={currentStep}
							onStepClick={goTo}
						/>
					</div>

					<PaperStep step={currentStep} direction={direction}>
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
					</PaperStep>

					<div className='px-6 pb-5'>
						<CreateFooter
							form={form}
							currentStep={currentStep}
							stepCount={steps.length}
							isLastStep={isLastStep}
							onPrevious={previous}
							onNext={next}
						/>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}
