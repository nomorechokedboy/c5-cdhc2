import { Link } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { Card } from '@repo/ui/components/ui/card'

export interface ClassCategory {
	id: number
	name: string
	idnumber: string
	description: string
}

/** Một lớp như một cuốn sổ: gáy xanh mực bên trái, tên lớp viết bằng chữ có chân. */
export function ClassBook({ category }: { category: ClassCategory }) {
	return (
		<Link
			to='/khoa-hoc/$categoryIdnumber'
			params={{ categoryIdnumber: category.idnumber }}
			state={{ category: { id: category.id } }}
			className='group focus-visible:ring-ring/60 block h-full rounded-lg outline-none focus-visible:ring-[3px]'
		>
			<Card className='border-l-primary group-hover:border-brass group-hover:border-l-brass h-full flex-row items-start justify-between gap-3 border-l-[6px] px-5 py-4 transition-colors'>
				<div className='min-w-0 space-y-1'>
					<h3 className='font-serif text-base leading-snug font-semibold'>
						{category.name}
					</h3>
					{category.description && (
						<p className='text-muted-foreground line-clamp-2 text-sm'>
							{category.description}
						</p>
					)}
				</div>
				<ChevronRight className='text-muted-foreground group-hover:text-foreground mt-1 h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5' />
			</Card>
		</Link>
	)
}
