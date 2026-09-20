import { cn } from '@/lib/utils'

/**
 * Đường điện tim dùng chung:
 * - `beat`: một nhịp, vẽ một lần rồi giữ nguyên (đăng nhập, trang chủ)
 * - `flat`: đường thẳng, trạng thái rỗng
 * - `error`: đường thẳng đỏ có một nhiễu đầu đường, trạng thái lỗi
 */
const PATHS = {
	beat: 'M0 30 H90 l7 -4 l6 4 H122 l5 4 l8 -22 l8 31 l6 -13 H172 l7 -5 l8 5 H300',
	flat: 'M0 30 H300',
	error: 'M0 30 H40 l4 -9 l4 16 l4 -12 l4 5 H300'
} as const

export type TraceVariant = keyof typeof PATHS

interface TraceLineProps {
	variant?: TraceVariant
	className?: string
}

export function TraceLine({ variant = 'flat', className }: TraceLineProps) {
	return (
		<svg
			viewBox='0 0 300 60'
			fill='none'
			strokeWidth={2.5}
			strokeLinecap='round'
			strokeLinejoin='round'
			aria-hidden
			data-variant={variant}
			className={cn(
				'h-10 w-full',
				variant === 'beat' && 'text-gold',
				variant === 'flat' && 'text-muted-foreground/50',
				variant === 'error' && 'text-destructive',
				className
			)}
		>
			<path
				d={PATHS[variant]}
				stroke='currentColor'
				pathLength={1}
				className={variant === 'beat' ? 'pulse-draw' : undefined}
			/>
		</svg>
	)
}
