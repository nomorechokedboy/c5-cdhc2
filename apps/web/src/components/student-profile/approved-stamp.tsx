import stampRed from '@/assets/emblem/stamp-red.svg'
import { cn } from '@/lib/utils'

/**
 * Dấu đỏ «Đã xác nhận»: huy hiệu Quân y đóng mờ phía sau, chữ đóng đè lên.
 * Chỉ hiện khi hồ sơ đã được xác nhận; lúc xuất hiện dấu "đóng" xuống một lần.
 */
export function ApprovedStamp({
	className,
	label = 'Đã xác nhận',
	ariaLabel = 'Hồ sơ đã xác nhận'
}: {
	className?: string
	/** Chữ trên dấu; mặc định «Đã xác nhận» */
	label?: string
	ariaLabel?: string
}) {
	return (
		<div
			role='img'
			aria-label={ariaLabel}
			className={cn(
				'stamp-thump pointer-events-none relative grid size-32 -rotate-6 place-items-center select-none',
				className
			)}
		>
			<img
				src={stampRed}
				alt=''
				aria-hidden
				className='absolute inset-0 size-full object-contain'
			/>
			<span className='relative rounded-sm border-2 border-destructive bg-card/75 px-2 py-0.5 font-display text-base font-bold tracking-wider text-destructive uppercase'>
				{label}
			</span>
		</div>
	)
}
