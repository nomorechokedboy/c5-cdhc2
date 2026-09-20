import type { ElementType, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Class tĩnh cho từng màu (Tailwind cần thấy nguyên chuỗi class) */
const ACCENTS = {
	blue: 'border-blue-500 bg-blue-50/30',
	green: 'border-green-500 bg-green-50/30',
	yellow: 'border-yellow-500 bg-yellow-50/30',
	purple: 'border-purple-500 bg-purple-50/30',
	pink: 'border-pink-500 bg-pink-50/30',
	orange: 'border-orange-500 bg-orange-50/30',
	cyan: 'border-cyan-500 bg-cyan-50/30',
	teal: 'border-teal-500 bg-teal-50/30',
	indigo: 'border-indigo-500 bg-indigo-50/30',
	emerald: 'border-emerald-500 bg-emerald-50/30',
	amber: 'border-amber-500 bg-amber-50/30',
	rose: 'border-rose-500 bg-rose-50/30',
	slate: 'border-slate-500 bg-slate-50/30'
} as const

export type SectionAccent = keyof typeof ACCENTS

const COLUMNS = {
	1: 'grid-cols-1',
	2: 'grid-cols-1 md:grid-cols-2',
	3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
	4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
} as const

/** Khối có viền màu bên trái + tiêu đề, chứa lưới field */
export function FormSection({
	title,
	icon: Icon,
	accent = 'blue',
	columns = 3,
	children,
	className
}: {
	title: ReactNode
	icon?: ElementType<{ className?: string }>
	accent?: SectionAccent
	/** Số cột tối đa của lưới field (responsive) */
	columns?: keyof typeof COLUMNS
	children: ReactNode
	className?: string
}) {
	return (
		<section
			className={cn(
				'border-l-4 pl-4 py-2 rounded-r',
				ACCENTS[accent],
				className
			)}
		>
			<h3 className='font-semibold mb-3 text-base flex items-center gap-2'>
				{Icon && <Icon className='h-4 w-4' />}
				{title}
			</h3>
			<div className={cn('grid gap-4 text-sm', COLUMNS[columns])}>
				{children}
			</div>
		</section>
	)
}
