import { Link } from '@tanstack/react-router'
import { ErrorState } from '@/components/error-state'
import { TraceLine } from '@/components/trace-line'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import useUnitBoard from '@/hooks/useUnitBoard'
import type { BoardRow } from '@/lib/unit-board'

/**
 * Đường nền phẳng, đoạn có màu dài theo tỉ trọng và kết thúc bằng một nhịp:
 * đơn vị đông nhất chạy hết đường, các đơn vị khác ngắn tương ứng.
 */
function ShareTrace({
	share,
	tone
}: {
	share: number
	tone: 'major' | 'minor'
}) {
	const end = 4 + share * 232
	return (
		<svg
			viewBox='0 0 240 24'
			preserveAspectRatio='none'
			fill='none'
			strokeWidth={2}
			strokeLinecap='round'
			strokeLinejoin='round'
			aria-hidden
			className='h-6 w-full'
		>
			<path d='M4 14 H236' className='stroke-border' />
			{share > 0 && (
				<path
					d={`M4 14 H${Math.max(4, end - 14)} l3 -3 l3 3 l3 -10 l3 16 l2 -6 H${end}`}
					className={
						tone === 'major' ? 'stroke-primary' : 'stroke-info'
					}
				/>
			)}
		</svg>
	)
}

function UnitLink({ row, className }: { row: BoardRow; className?: string }) {
	return row.level === 'battalion' ? (
		<Link
			to='/tieu-doan/$alias'
			params={{ alias: row.alias }}
			className={className}
		>
			{row.name}
		</Link>
	) : (
		<Link
			to='/dai-doi/$companyAlias'
			params={{ companyAlias: row.alias }}
			className={className}
		>
			{row.name}
		</Link>
	)
}

function BoardTableRow({ row }: { row: BoardRow }) {
	const major = row.level === 'battalion'
	return (
		<tr
			className={cn(
				'border-b transition-colors hover:bg-accent/60',
				major &&
					'border-t-2 border-t-border bg-muted/40 font-display text-base'
			)}
		>
			<td className={cn('py-2.5 pr-3', major ? 'pl-4' : 'pl-9')}>
				<UnitLink
					row={row}
					className={cn(
						'rounded-sm underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring',
						major ? 'font-semibold' : 'font-medium'
					)}
				/>
			</td>
			<td className='tabular px-3 py-2.5 text-right'>{row.classes}</td>
			<td
				className={cn(
					'tabular px-3 py-2.5 text-right',
					major && 'font-semibold'
				)}
			>
				{row.students}
			</td>
			<td className='hidden w-[34%] py-2.5 pr-4 pl-3 md:table-cell'>
				<ShareTrace
					share={row.share}
					tone={major ? 'major' : 'minor'}
				/>
			</td>
		</tr>
	)
}

function BoardSkeleton() {
	return (
		<div className='space-y-3 p-4' role='status' aria-label='Đang tải'>
			{Array.from({ length: 6 }, (_, i) => (
				<Skeleton key={i} className='h-6 w-full' />
			))}
		</div>
	)
}

export function UnitBoard() {
	const { data, error, isPending, refetch } = useUnitBoard()

	if (error) {
		return <ErrorState error={error} onRetry={() => refetch()} />
	}

	return (
		<section
			aria-labelledby='unit-board-title'
			className='overflow-hidden rounded-lg border bg-card/95 shadow-sm'
		>
			<header className='border-b px-4 py-3'>
				<h2 id='unit-board-title' className='text-xl font-semibold'>
					Bảng giao ban
				</h2>
				<p className='text-sm text-muted-foreground'>
					Học viên theo tiểu đoàn và đại đội, tính cả các lớp bên
					dưới.
				</p>
			</header>

			{isPending ? (
				<BoardSkeleton />
			) : data.rows.length === 0 ? (
				<div className='flex flex-col items-center px-4 py-12 text-center'>
					<TraceLine variant='flat' className='max-w-56' />
					<p className='font-display text-lg font-semibold'>
						Chưa có đơn vị nào
					</p>
					<p className='text-sm text-muted-foreground'>
						Thêm tiểu đoàn và đại đội để bảng giao ban có số liệu.
					</p>
				</div>
			) : (
				<table className='w-full border-collapse text-sm'>
					<thead>
						<tr className='border-b text-left text-muted-foreground'>
							<th
								scope='col'
								className='py-2 pr-3 pl-4 font-medium'
							>
								Đơn vị
							</th>
							<th
								scope='col'
								className='px-3 py-2 text-right font-medium'
							>
								Lớp đang học
							</th>
							<th
								scope='col'
								className='px-3 py-2 text-right font-medium'
							>
								Học viên
							</th>
							<th
								scope='col'
								className='hidden py-2 pr-4 pl-3 font-medium md:table-cell'
							>
								So với đơn vị đông nhất
							</th>
						</tr>
					</thead>
					<tbody>
						{data.rows.flatMap((battalion) => [
							<BoardTableRow
								key={battalion.id}
								row={battalion}
							/>,
							...battalion.children.map((company) => (
								<BoardTableRow key={company.id} row={company} />
							))
						])}
					</tbody>
				</table>
			)}
		</section>
	)
}
