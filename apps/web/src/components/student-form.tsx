import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import type { VariantProps } from 'class-variance-authority'
import StepIndicator from '@/components/form-indicator'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import type { Student, StudentBody } from '@/types'
import { useStudentCreateForm } from './student-create/useStudentCreateForm'

export interface StudentFormProps {
	onSuccess: (
		data: Student[],
		variables: StudentBody,
		context: unknown
	) => unknown
	buttonProps?: React.ComponentProps<'button'> &
		VariantProps<typeof buttonVariants> & { asChild?: boolean }
}

export default function StudentForm({
	onSuccess,
	buttonProps
}: StudentFormProps) {
	const [open, setOpen] = useState(false)
	const {
		form,
		steps,
		currentStep,
		completedSteps,
		isLastStep,
		next,
		previous,
		goTo
	} = useStudentCreateForm({ onSuccess, onCreated: () => setOpen(false) })

	const { Content } = steps[currentStep]

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button {...buttonProps}>
					<Plus className='w-4 h-4 mr-2' />
					Thêm học viên
				</Button>
			</DialogTrigger>
			<DialogContent className='grid-rows-[auto_auto_1fr] lg:max-w-3xl lg:h-9/10'>
				<DialogHeader>
					<DialogTitle className='text-center'>
						Biểu mẫu thêm học viên
					</DialogTitle>
				</DialogHeader>
				<StepIndicator
					STEPS={steps}
					completedSteps={completedSteps}
					currentStep={currentStep}
					handleStepClick={goTo}
				/>
				<form
					onSubmit={(e) => {
						e.preventDefault()
						e.stopPropagation()
						// Enter ở các bước giữa không được gửi form
						if (isLastStep) form.handleSubmit()
					}}
					className='flex flex-col flex-1 overflow-auto no-scrollbar'
					id='studentForm'
				>
					<div className='mb-auto'>
						<Content form={form} />
					</div>
				</form>
				<div className='flex justify-between items-center'>
					<button
						type='button'
						onClick={previous}
						disabled={currentStep === 0}
						className='flex items-center px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
					>
						<ChevronLeft className='w-4 h-4 mr-1' />
						Quay lại
					</button>
					{isLastStep ? (
						<form.Subscribe
							selector={(state: any) => [
								state.canSubmit,
								state.isSubmitting
							]}
						>
							{([canSubmit, isSubmitting]: boolean[]) => (
								<Button
									type='submit'
									form='studentForm'
									disabled={!canSubmit || isSubmitting}
								>
									{isSubmitting
										? 'Đang thêm học viên...'
										: 'Thêm học viên'}
								</Button>
							)}
						</form.Subscribe>
					) : (
						<button
							type='button'
							onClick={next}
							className='flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors'
						>
							Tiếp theo
							<ChevronRight className='w-4 h-4 ml-1' />
						</button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	)
}
