import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** Khung chung của một bước: các khối cách đều nhau */
export function StepBody({ children }: { children: ReactNode }) {
	// Ô nhập cao hơn form sửa một chút vì mỗi bước chỉ có vài field
	return (
		<div className='space-y-6 py-2 [&_[data-slot=input]]:h-10 [&_[role=combobox]]:h-10'>
			{children}
		</div>
	)
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
		<section className='space-y-4 border-l-2 border-primary/40 py-1 pl-4'>
			<h3 className='border-b pb-1.5 font-display text-lg font-semibold tracking-wide'>
				{title}
			</h3>
			{children}
		</section>
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
				'grid gap-4',
				cols === 1 && 'grid-cols-1',
				cols === 2 && 'grid-cols-1 md:grid-cols-2',
				cols === 3 && 'grid-cols-1 md:grid-cols-3'
			)}
		>
			{children}
		</div>
	)
}
