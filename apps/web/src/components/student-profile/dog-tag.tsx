import { cn } from '@/lib/utils'

interface DogTagProps {
	studentId?: string
	rank?: string
	className?: string
}

/**
 * Thẻ bài của học viên: tấm thẻ bo tròn có lỗ xâu dây, khắc mã học viên và cấp
 * bậc. Là thứ đầu tiên người xem hồ sơ nhận ra "đây là hồ sơ của ai".
 */
export function DogTag({ studentId, rank, className }: DogTagProps) {
	return (
		<div
			className={cn(
				'relative w-full rounded-[1.25rem] border border-sidebar-border bg-sidebar-accent px-4 pt-7 pb-4 text-center text-sidebar-accent-foreground shadow-md',
				className
			)}
		>
			<span
				aria-hidden
				className='absolute top-2.5 left-1/2 size-3 -translate-x-1/2 rounded-full border border-sidebar-border bg-sidebar shadow-inner'
			/>
			<p className='text-xs text-sidebar-foreground/70'>Mã học viên</p>
			<p className='tabular font-display text-2xl leading-tight font-semibold tracking-wider'>
				{studentId || 'Chưa có'}
			</p>
			<p className='mt-1 border-t border-sidebar-border/70 pt-1 text-sm text-sidebar-foreground/80'>
				{rank || 'Chưa có cấp bậc'}
			</p>
		</div>
	)
}
