import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

const COLUMNS = {
	1: 'grid-cols-1',
	2: 'grid-cols-1 md:grid-cols-2',
	3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
	4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
} as const

/** Mục của biểu mẫu: tiêu đề kẻ chân, một viền trái chung, chứa lưới field */
export function FormSection({
	title,
	icon: Icon,
	columns = 3,
	children,
	className
}: {
	title: ReactNode
	icon?: ElementType<{ className?: string }>
	/** Số cột tối đa của lưới field (responsive) */
	columns?: keyof typeof COLUMNS
	children: ReactNode
	className?: string
}) {
	return (
		<section
			className={cn('border-l-2 border-primary/40 py-1 pl-4', className)}
		>
			<h3 className='mb-3 flex items-center gap-2 border-b pb-1.5 font-display text-lg font-semibold tracking-wide'>
				{Icon && <Icon className='h-4 w-4 text-primary' />}
				{title}
			</h3>
			<div className={cn('grid gap-4 text-sm', COLUMNS[columns])}>
				{children}
			</div>
		</section>
	)
}
