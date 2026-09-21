import type { DragEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Ô thả tệp kẻ nét đứt như chỗ để dán giấy vào sổ; bấm hoặc Enter để chọn tệp. */
export function FileDropzone({
	onActivate,
	onDrop,
	disabled,
	className,
	children
}: {
	onActivate: () => void
	onDrop?: (e: DragEvent) => void
	disabled?: boolean
	className?: string
	children: ReactNode
}) {
	return (
		<div
			role='button'
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled}
			onClick={onActivate}
			onKeyDown={(e) => {
				if (e.key === 'Enter' || e.key === ' ') {
					e.preventDefault()
					onActivate()
				}
			}}
			onDrop={onDrop}
			onDragOver={onDrop ? (e) => e.preventDefault() : undefined}
			className={cn(
				'border-brass/60 hover:border-brass hover:bg-brass/5 focus-visible:ring-ring/60 cursor-pointer rounded-lg border-2 border-dashed text-center transition-colors outline-none focus-visible:ring-[3px]',
				className
			)}
		>
			{children}
		</div>
	)
}
