/**
 * Nhật ký tăng/giảm danh mục ngành (user khai báo mua / giảm).
 * Admin xem trong Danh mục ngành.
 */
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, Search } from 'lucide-react'
import { ListCatalogStockLogs, type CatalogStockLog } from '@/api/asset'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'

function formatTime(iso: string) {
	try {
		return new Date(iso).toLocaleString('vi-VN')
	} catch {
		return iso
	}
}

type Props = {
	nganhCode?: string | null
	title?: string
}

export default function CatalogStockLogPanel({
	nganhCode,
	title = 'Log tăng/giảm user'
}: Props) {
	const [search, setSearch] = useState('')
	const [debounced, setDebounced] = useState('')

	useEffect(() => {
		const t = window.setTimeout(() => setDebounced(search.trim()), 300)
		return () => window.clearTimeout(t)
	}, [search])

	const logsQ = useQuery({
		queryKey: ['catalog-stock-logs', nganhCode || '', debounced],
		queryFn: () =>
			ListCatalogStockLogs({
				nganhCode: nganhCode || undefined,
				limit: 300
			})
	})

	const filtered = (logsQ.data || []).filter((r: CatalogStockLog) => {
		if (!debounced) return true
		const hay = [
			r.materialCode,
			r.materialName,
			r.nganhCode,
			r.chuyenNganhCode,
			r.chuyenNganhName,
			r.actorUsername,
			r.actorDisplayName,
			r.reason,
			r.note
		]
			.filter(Boolean)
			.join(' ')
			.toLocaleLowerCase('vi')
		return debounced
			.toLocaleLowerCase('vi')
			.split(/\s+/)
			.every((p) => hay.includes(p))
	})

	return (
		<Card>
			<CardHeader className='pb-3'>
				<div className='flex flex-wrap items-start justify-between gap-3'>
					<div>
						<CardTitle className='text-base'>{title}</CardTitle>
						<CardDescription>
							Biến động SL danh mục khi user ngành khai báo
							tăng/giảm (mua thiết bị, thanh lý…).
							{nganhCode ? ` · Lọc ${nganhCode}` : ''}
						</CardDescription>
					</div>
					<Button
						variant='outline'
						size='sm'
						onClick={() => logsQ.refetch()}
						disabled={logsQ.isFetching}
					>
						<RefreshCw
							className={`w-3.5 h-3.5 mr-1 ${logsQ.isFetching ? 'animate-spin' : ''}`}
						/>
						Làm mới
					</Button>
				</div>
				<div className='relative max-w-md mt-2'>
					<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder='Tìm mã, tên VT, user…'
						className='pl-9'
					/>
				</div>
			</CardHeader>
			<CardContent>
				{logsQ.isLoading ? (
					<div className='space-y-2'>
						<Skeleton className='h-10 w-full' />
						<Skeleton className='h-10 w-full' />
						<Skeleton className='h-10 w-full' />
					</div>
				) : filtered.length === 0 ? (
					<p className='text-sm text-muted-foreground py-8 text-center'>
						Chưa có log tăng/giảm
						{debounced ? ` khớp «${debounced}»` : ''}.
					</p>
				) : (
					<div className='rounded-lg border overflow-x-auto'>
						<Table>
							<TableHeader>
								<TableRow className='bg-muted/20'>
									<TableHead className='w-28'>Ngày</TableHead>
									<TableHead className='w-24'>Loại</TableHead>
									<TableHead>Vật tư</TableHead>
									<TableHead>Ngành / Loại</TableHead>
									<TableHead className='text-right w-20'>
										SL
									</TableHead>
									<TableHead className='text-right w-28'>
										Trước → Sau
									</TableHead>
									<TableHead>User</TableHead>
									<TableHead className='min-w-[120px]'>
										Lý do
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((r) => {
									const isInc = r.movementType === 'INCREASE'
									return (
										<TableRow key={r.id}>
											<TableCell className='text-xs tabular-nums whitespace-nowrap'>
												{r.executedAt}
												<div className='text-muted-foreground'>
													{formatTime(r.createdAt)}
												</div>
											</TableCell>
											<TableCell>
												<Badge
													variant={
														isInc
															? 'default'
															: 'destructive'
													}
													className='gap-1'
												>
													{isInc ? (
														<ArrowUpCircle className='w-3 h-3' />
													) : (
														<ArrowDownCircle className='w-3 h-3' />
													)}
													{isInc ? 'Tăng' : 'Giảm'}
												</Badge>
												{r.isNewMaterial ? (
													<div className='mt-1'>
														<Badge
															variant='outline'
															className='text-[10px]'
														>
															Mới
														</Badge>
													</div>
												) : null}
											</TableCell>
											<TableCell>
												<div className='font-medium text-sm'>
													{r.materialName}
												</div>
												<div className='font-mono text-xs text-muted-foreground'>
													{r.materialCode || '—'}
												</div>
											</TableCell>
											<TableCell className='text-xs'>
												<div className='font-mono'>
													{r.nganhCode}
												</div>
												<div className='text-muted-foreground'>
													{r.chuyenNganhCode
														? `${r.chuyenNganhCode} · ${r.chuyenNganhName || ''}`
														: '—'}
												</div>
											</TableCell>
											<TableCell className='text-right font-semibold tabular-nums'>
												{isInc ? '+' : '−'}
												{r.quantity}
												{r.unit ? (
													<span className='text-muted-foreground font-normal text-xs ml-0.5'>
														{r.unit}
													</span>
												) : null}
											</TableCell>
											<TableCell className='text-right tabular-nums text-sm'>
												{r.quantityBefore} →{' '}
												{r.quantityAfter}
											</TableCell>
											<TableCell className='text-sm'>
												<div>
													{r.actorDisplayName ||
														r.actorUsername ||
														'—'}
												</div>
												{r.actorUsername ? (
													<div className='text-xs text-muted-foreground font-mono'>
														{r.actorUsername}
													</div>
												) : null}
											</TableCell>
											<TableCell className='text-xs text-muted-foreground max-w-[180px]'>
												{r.reason || r.note || '—'}
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
