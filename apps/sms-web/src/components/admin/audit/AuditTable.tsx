import { Activity, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { Clock, User } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent, CardHeader } from '@repo/ui/components/ui/card'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import { cn } from '@/lib/utils'
import { AuditRow } from './AuditRow'
import { PER_PAGE } from './options'
import { pageWindow } from './query'
import type { AuditListResponse } from './types'

function SkeletonRows() {
	return (
		<>
			{Array.from({ length: 8 }).map((_, i) => (
				<TableRow key={i}>
					{Array.from({ length: 7 }).map((_, j) => (
						<TableCell key={j}>
							<Skeleton className='h-4 w-full max-w-[120px]' />
						</TableCell>
					))}
				</TableRow>
			))}
		</>
	)
}

const pillClass = (active: boolean) =>
	cn(
		'rounded px-2 py-0.5 text-xs transition-colors',
		active
			? 'bg-primary text-primary-foreground font-semibold'
			: 'hover:bg-muted'
	)

/** Bảng nhật ký kèm chọn số dòng mỗi trang và phân trang. */
export function AuditTable({
	logs,
	isLoading,
	error,
	page,
	limit,
	onPage,
	onLimit
}: {
	logs?: AuditListResponse
	isLoading: boolean
	error: Error | null
	page: number
	limit: number
	onPage: (page: number) => void
	onLimit: (limit: number) => void
}) {
	const { t } = useTranslation()

	return (
		<Card>
			<CardHeader>
				<div className='flex flex-wrap items-center justify-between gap-2'>
					<h2 className='font-serif text-lg font-semibold'>
						{t('audit.table.title')}
					</h2>
					<div className='text-muted-foreground flex items-center gap-2 text-xs'>
						<span>{t('audit.table.perPage')}</span>
						{PER_PAGE.map((n) => (
							<button
								key={n}
								onClick={() => onLimit(n)}
								className={pillClass(limit === n)}
							>
								{n}
							</button>
						))}
					</div>
				</div>
			</CardHeader>

			<CardContent className='p-0'>
				{error && (
					<div className='text-destructive p-6 text-center text-sm'>
						<AlertCircle className='mx-auto mb-2 h-5 w-5' />
						{error.message}
					</div>
				)}

				<ScrollArea className='h-[calc(100vh-28rem)]'>
					<Table>
						<TableHeader className='bg-card sticky top-0 z-10'>
							<TableRow className='hover:bg-transparent'>
								<TableHead className='w-36'>
									<span className='flex items-center gap-1'>
										<Clock className='h-3.5 w-3.5' />
										{t('audit.table.time')}
									</span>
								</TableHead>
								<TableHead>{t('audit.table.event')}</TableHead>
								<TableHead className='w-20'>
									<span className='flex items-center gap-1'>
										<User className='h-3.5 w-3.5' />
										{t('audit.table.actorId')}
									</span>
								</TableHead>
								<TableHead className='w-24'>
									{t('audit.table.role')}
								</TableHead>
								<TableHead className='w-28'>
									{t('audit.table.outcome')}
								</TableHead>
								<TableHead>
									{t('audit.table.endpoint')}
								</TableHead>
								<TableHead className='w-20'>
									{t('audit.table.details')}
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<SkeletonRows />
							) : !logs || logs.data.length === 0 ? (
								<TableRow className='hover:bg-transparent'>
									<TableCell
										colSpan={7}
										className='text-muted-foreground py-16 text-center'
									>
										<Activity className='mx-auto mb-2 h-8 w-8 opacity-25' />
										{t('audit.table.empty')}
									</TableCell>
								</TableRow>
							) : (
								logs.data.map((entry) => (
									<AuditRow key={entry.id} entry={entry} />
								))
							)}
						</TableBody>
					</Table>
				</ScrollArea>

				{logs && logs.total_pages > 1 && (
					<div className='flex items-center justify-between border-t px-4 py-3'>
						<span className='text-muted-foreground text-xs'>
							{t('audit.table.page', {
								current: page,
								total: logs.total_pages
							})}
						</span>
						<div className='flex items-center gap-1'>
							<Button
								size='sm'
								variant='outline'
								className='h-7 w-7 p-0'
								disabled={page <= 1}
								onClick={() => onPage(page - 1)}
							>
								<ChevronLeft className='h-4 w-4' />
							</Button>
							{pageWindow(page, logs.total_pages).map((p) => (
								<button
									key={p}
									onClick={() => onPage(p)}
									className={cn(
										pillClass(p === page),
										'h-7 w-7'
									)}
								>
									{p}
								</button>
							))}
							<Button
								size='sm'
								variant='outline'
								className='h-7 w-7 p-0'
								disabled={page >= logs.total_pages}
								onClick={() => onPage(page + 1)}
							>
								<ChevronRight className='h-4 w-4' />
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
