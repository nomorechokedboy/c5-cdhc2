import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreateFooterProps {
	form: any
	currentStep: number
	stepCount: number
	isLastStep: boolean
	onPrevious: () => void
	onNext: () => void
}

/** Thanh thao tác cuối hộp thoại: quay lại, số bước, tiếp theo hoặc thêm học viên */
export function CreateFooter({
	form,
	currentStep,
	stepCount,
	isLastStep,
	onPrevious,
	onNext
}: CreateFooterProps) {
	return (
		<div className='flex items-center justify-between gap-3'>
			<Button
				type='button'
				variant='outline'
				onClick={onPrevious}
				disabled={currentStep === 0}
			>
				<ChevronLeft />
				Quay lại
			</Button>

			<span className='tabular text-sm text-muted-foreground'>
				Bước {currentStep + 1}/{stepCount}
			</span>

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
				<Button type='button' onClick={onNext}>
					Tiếp theo
					<ChevronRight />
				</Button>
			)}
		</div>
	)
}
