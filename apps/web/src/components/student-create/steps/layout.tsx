import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Khung chung của một bước: các khối cách đều nhau */
export function StepBody({ children }: { children: ReactNode }) {
	return <div className='space-y-6 py-2'>{children}</div>
}

/** Nhóm field có tiêu đề (dùng ở các bước có nhiều khối: gia cảnh, cha, mẹ…) */
export function StepGroup({
	title,
	children
}: {
	title: string
	children: ReactNode
}) {
	return (
		<div className='space-y-6'>
			<h3 className='text-lg font-semibold border-b border-border pb-2'>
				{title}
			</h3>
			{children}
		</div>
	)
}

/** Lưới field: 1 cột trên mobile, `cols` cột từ md trở lên */
export function StepGrid({
	cols = 2,
	children
}: {
	cols?: 1 | 2 | 3
	children: ReactNode
}) {
	return (
		<div
			className={cn(
				'grid gap-6',
				cols === 1 && 'grid-cols-1',
				cols === 2 && 'grid-cols-1 md:grid-cols-2',
				cols === 3 && 'grid-cols-1 md:grid-cols-3'
			)}
		>
			{children}
		</div>
	)
}
