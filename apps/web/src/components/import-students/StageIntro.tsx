import type { ReactNode } from 'react'

/** Đầu mỗi chặng: tên việc phải làm và một dòng hướng dẫn */
export function StageIntro({
	title,
	hint,
	children
}: {
	title: string
	hint?: string
	children?: ReactNode
}) {
	return (
		<header className='space-y-1'>
			<h3 className='font-display text-xl font-semibold tracking-wide'>
				{title}
			</h3>
			{hint && (
				<p className='max-w-prose text-sm text-muted-foreground'>
					{hint}
				</p>
			)}
			{children}
		</header>
	)
}
