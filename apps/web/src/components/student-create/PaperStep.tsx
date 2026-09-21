import type { CSSProperties, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tờ giấy điện tim chứa nội dung một bước. Lưới giấy cuộn ngang theo bước, còn
 * nội dung trượt vào từ phía tiến hoặc lùi.
 */
export function PaperStep({
	step,
	direction,
	children
}: {
	step: number
	direction: 'next' | 'prev'
	children: ReactNode
}) {
	return (
		<div
			className='paper-grid min-h-0 flex-1 overflow-y-auto no-scrollbar'
			style={{ '--paper-x': `${-step * 130}px` } as CSSProperties}
		>
			<div
				key={step}
				className={cn(
					'px-6 py-4',
					direction === 'next' ? 'paper-in-next' : 'paper-in-prev'
				)}
			>
				{children}
			</div>
		</div>
	)
}
