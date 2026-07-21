/**
 * Kho vật tư hệ thống (KHO-VT) — VT thu hồi / trả trên về đây.
 */
import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Package, RefreshCw, Warehouse } from 'lucide-react'
import { GetRoomAssets, GetWarehouseRoom } from '@/api/asset'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ErrorState } from '@/components/error-state'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export default function WarehousePage() {
	const [search, setSearch] = useState('')

	const whQ = useQuery({
		queryKey: ['rooms', 'warehouse'],
		queryFn: () => GetWarehouseRoom()
	})

	const assetsQ = useQuery({
		queryKey: ['room-assets', 'warehouse', whQ.data?.id],
		queryFn: () => GetRoomAssets(whQ.data!.id),
		enabled: !!whQ.data?.id
	})

	const rows = useMemo(() => {
		const list = (assetsQ.data ?? []).filter((a) => (a.quantity ?? 0) > 0)
		const q = search.trim().toLocaleLowerCase('vi')
		if (!q) return list
		const parts = q.split(/\s+/).filter(Boolean)
		return list.filter((a) => {
			const hay = [
				a.code,
				a.name,
				a.category,
				a.unit,
				String(a.grade ?? '')
			]
				.filter(Boolean)
				.join(' ')
				.toLocaleLowerCase('vi')
			return parts.every((p) => hay.includes(p))
		})
	}, [assetsQ.data, search])

	const totalQty = rows.reduce((s, a) => s + (a.quantity ?? 0), 0)

	if (whQ.isError) {
		return (
			<div className='p-4 md:p-6 max-w-6xl mx-auto'>
				<ErrorState error={whQ.error} onRetry={() => whQ.refetch()} />
			</div>
		)
	}

	return (
		<div className='p-4 md:p-6 max-w-6xl mx-auto space-y-4'>
			<div className='flex flex-wrap items-start justify-between gap-3'>
				<div>
					<h1 className='text-xl font-semibold flex items-center gap-2'>
						<Warehouse className='w-5 h-5' />
						Kho vật tư
					</h1>
					<p className='text-sm text-muted-foreground mt-1 max-w-2xl'>
						Kho hệ thống <strong>KHO-VT</strong> — vật tư{' '}
						<strong>thu hồi</strong> hoặc <strong>trả trên</strong>{' '}
						tự động về đây (không gán đơn vị sử dụng).
					</p>
					{whQ.data && (
						<p className='text-xs text-muted-foreground mt-1'>
							Phòng: {whQ.data.roomCode} — {whQ.data.roomName}
							{whQ.data.id ? (
								<>
									{' · '}
									<Link
										to='/vat-tu/phong/$roomId'
										params={{ roomId: String(whQ.data.id) }}
										className='text-primary underline-offset-2 hover:underline'
									>
										Mở hồ sơ phòng
									</Link>
								</>
							) : null}
						</p>
					)}
				</div>
				<div className='flex flex-wrap gap-2 items-center'>
					<Badge variant='secondary' className='h-8 px-3'>
						{rows.length} dòng · SL {totalQty}
					</Badge>
					<Button
						variant='outline'
						size='icon'
						onClick={() => {
							void whQ.refetch()
							void assetsQ.refetch()
						}}
					>
						<RefreshCw
							className={cn(
								'w-4 h-4',
								(whQ.isFetching || assetsQ.isFetching) &&
									'animate-spin'
							)}
						/>
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader className='pb-2'>
					<div className='flex flex-wrap gap-2 items-center justify-between'>
						<CardTitle className='text-base flex items-center gap-2'>
							<Package className='w-4 h-4' />
							Danh sách trong kho
						</CardTitle>
						<Input
							className='max-w-xs h-9'
							placeholder='Tìm mã, tên, loại…'
							value={search}
							onChange={(e) => setSearch(e.target.value)}
						/>
					</div>
				</CardHeader>
				<CardContent>
					{whQ.isLoading || assetsQ.isLoading ? (
						<div className='space-y-2'>
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
						</div>
					) : assetsQ.isError ? (
						<ErrorState
							error={assetsQ.error}
							onRetry={() => assetsQ.refetch()}
						/>
					) : rows.length === 0 ? (
						<p className='text-sm text-muted-foreground py-10 text-center'>
							Kho trống. Khi thu hồi / trả trên, vật tư sẽ xuất
							hiện tại đây.
						</p>
					) : (
						<div className='rounded-lg border overflow-x-auto'>
							<Table>
								<TableHeader>
									<TableRow className='bg-muted/30'>
										<TableHead>Mã</TableHead>
										<TableHead>Tên thiết bị</TableHead>
										<TableHead>Loại</TableHead>
										<TableHead className='text-center'>
											ĐVT
										</TableHead>
										<TableHead className='text-center'>
											Cấp
										</TableHead>
										<TableHead className='text-center'>
											SL
										</TableHead>
										<TableHead>Trạng thái</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((a) => (
										<TableRow key={a.id}>
											<TableCell className='font-mono text-sm'>
												{a.code || '—'}
											</TableCell>
											<TableCell className='font-medium'>
												{a.name}
											</TableCell>
											<TableCell className='text-sm text-muted-foreground'>
												{a.category || '—'}
											</TableCell>
											<TableCell className='text-center text-sm'>
												{a.unit || '—'}
											</TableCell>
											<TableCell className='text-center tabular-nums'>
												{a.grade ?? 1}
											</TableCell>
											<TableCell className='text-center font-semibold tabular-nums'>
												{a.quantity ?? 0}
											</TableCell>
											<TableCell>
												<Badge
													variant='outline'
													className='text-xs'
												>
													{a.status || 'NORMAL'}
												</Badge>
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	)
}
