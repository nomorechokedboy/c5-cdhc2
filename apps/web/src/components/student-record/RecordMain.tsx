import type { ReactNode } from 'react'
import { PaperSheet, type StepDirection } from './PaperStep'
import { PenTrace } from './PenTrace'
import { useStepDirection } from './useStepDirection'

interface RecordMainProps {
	/** Tiêu đề (DialogTitle của hộp thoại chứa nó) */
	title: ReactNode
	steps: ReadonlyArray<{ id: string; title: string }>
	currentStep: number
	completedSteps: readonly number[]
	errorSteps?: readonly number[]
	onStepClick: (index: number) => void
	/** Thanh thao tác đặt cố định ở đáy */
	footer: ReactNode
	/** Mờ và khoá thao tác (đang đóng dấu) */
	dimmed?: boolean
	/** Nội dung các bước, nhận chiều trượt hiện tại */
	children: (direction: StepDirection) => ReactNode
}

/**
 * Nửa phải của hộp thoại hồ sơ: tiêu đề, dải mạch các bước, tờ giấy điện tim
 * chứa nội dung và thanh thao tác ở đáy.
 */
export function RecordMain({
	title,
	steps,
	currentStep,
	completedSteps,
	errorSteps,
	onStepClick,
	footer,
	dimmed,
	children
}: RecordMainProps) {
	const direction = useStepDirection(currentStep)

	return (
		<div
			className='flex min-h-0 flex-col data-[dimmed=true]:pointer-events-none data-[dimmed=true]:opacity-40'
			data-dimmed={!!dimmed}
		>
			<div className='px-6 pt-6 pb-2'>{title}</div>
			<div className='px-6 pb-3'>
				<PenTrace
					steps={steps}
					currentStep={currentStep}
					completedSteps={completedSteps}
					errorSteps={errorSteps}
					onStepClick={onStepClick}
				/>
			</div>
			<PaperSheet step={currentStep}>{children(direction)}</PaperSheet>
			<div className='mx-6 border-t pt-4 pb-5'>{footer}</div>
		</div>
	)
}
