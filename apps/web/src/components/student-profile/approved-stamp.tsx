import stampRed from '@/assets/emblem/stamp-red.svg'
import { cn } from '@/lib/utils'

/**
 * Dấu đỏ «Đã xác nhận»: huy hiệu Quân y đóng mờ phía sau, chữ đóng đè lên.
 * Chỉ hiện khi hồ sơ đã được xác nhận; lúc xuất hiện dấu "đóng" xuống một lần.
 */
export function ApprovedStamp({ className }: { className?: string }) {
	return (
		<div
			role='img'
			aria-label='Hồ sơ đã xác nhận'
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
				Đã xác nhận
			</span>
		</div>
	)
}
