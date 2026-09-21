import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type StepDirection = 'next' | 'prev'

/** Class giấy trượt vào từ phía tiến hoặc lùi; áp lên phần tử vừa hiện ra */
export const slideClass = (direction: StepDirection) =>
	direction === 'next' ? 'paper-in-next' : 'paper-in-prev'

/**
 * Tờ giấy điện tim chứa nội dung các bước. Lưới giấy cuộn ngang theo bước và
 * cuộn dọc cùng nội dung.
 */
export function PaperSheet({
	step,
	children
}: {
	step: number
	children: ReactNode
}) {
	return (
		<div
			className='paper-grid min-h-0 flex-1 overflow-y-auto no-scrollbar'
			style={{ '--paper-x': `${-step * 130}px` } as CSSProperties}
		>
			{children}
		</div>
	)
}

/** Nội dung một bước: đổi bước thì mount lại và trượt vào */
export function SlideIn({
	step,
	direction,
	children
}: {
	step: number
	direction: StepDirection
	children: ReactNode
}) {
	return (
		<div key={step} className={cn('px-6 py-4', slideClass(direction))}>
			{children}
		</div>
	)
}
