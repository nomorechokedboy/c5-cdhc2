import { cn } from '@/lib/utils'
import { formatScore, isFailing } from '@/lib/score'

/**
 * Điểm viết bằng mực: chữ có chân, số thẳng hàng; chưa đạt thì khoanh bút đỏ.
 * Chỉ tô màu nhờ khoanh và màu chữ, không dùng nền để khỏi lẫn với nhãn.
 */
export function Score({
	value,
	className
}: {
	value: number
	className?: string
}) {
	return (
		<span
			className={cn('score', isFailing(value) && 'score-fail', className)}
		>
			{formatScore(value)}
		</span>
	)
}
