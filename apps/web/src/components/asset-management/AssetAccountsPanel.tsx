/**
 * Màn Tài khoản trong danh mục tòa nhà:
 * Chỉ hiển thị user đăng nhập thuộc Đơn vị sử dụng hoặc Ngành.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { BookUser, ExternalLink, RefreshCw, Search } from 'lucide-react'
import { GetUsers } from '@/api'
import type { User } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

function isDonViUser(u: User): boolean {
	const pos = (u.position || '').toLowerCase()
	const un = (u.username || '').toLowerCase()
	return pos.includes('đơn vị') || un.startsWith('dv.')
}

function isNganhAccount(u: User): boolean {
	if (isDonViUser(u)) return false
	return !!(u.nganhCodes?.length || u.nganhLabels?.length)
}

function unitOrNganhLabel(u: User): string {
	if (isNganhAccount(u)) {
		const labels = u.nganhLabels || []
		if (labels.length) {
			return labels.map((n) => `${n.code} — ${n.name}`).join('; ')
		}
		return (u.nganhCodes || []).join('; ') || '—'
	}
	const unit = u.unit
	if (unit) {
		return `${unit.alias ? `${unit.alias} — ` : ''}${unit.name}`
	}
	return u.unitName || '—'
}

export default function AssetAccountsPanel() {
	const usersQ = useQuery({
		queryKey: ['users'],
		queryFn: GetUsers,
		staleTime: 0,
		refetchOnMount: 'always'
	})
	const [search, setSearch] = useState('')
	const [kind, setKind] = useState<'all' | 'don_vi' | 'nganh'>('all')

	const rows = useMemo(() => {
		const all = (usersQ.data || []) as User[]
		const filtered = all.filter((u) => {
			if (u.isSuperUser) return false
			const donVi = isDonViUser(u)
			const nganh = isNganhAccount(u)
			if (!donVi && !nganh) return false
			if (kind === 'don_vi' && !donVi) return false
			if (kind === 'nganh' && !nganh) return false
			const q = search.trim().toLocaleLowerCase('vi')
			if (!q) return true
			const hay = [
				u.username,
				u.displayName,
				unitOrNganhLabel(u),
				u.position
			]
				.join(' ')
				.toLocaleLowerCase('vi')
			return hay.includes(q)
		})
		return filtered.sort((a, b) =>
			(a.username || '').localeCompare(b.username || '', 'vi')
		)
	}, [usersQ.data, search, kind])

	const counts = useMemo(() => {
		const all = (usersQ.data || []) as User[]
		let donVi = 0
		let nganh = 0
		for (const u of all) {
			if (u.isSuperUser) continue
			if (isDonViUser(u)) donVi++
			else if (isNganhAccount(u)) nganh++
		}
		return { donVi, nganh, total: donVi + nganh }
	}, [usersQ.data])

	return (
		<div className='space-y-4'>
			<div className='flex flex-wrap gap-2 text-sm'>
				<Badge variant='secondary' className='px-3 py-1'>
					Tổng {counts.total}
				</Badge>
				<Badge variant='outline' className='px-3 py-1'>
					ĐV sử dụng: {counts.donVi}
				</Badge>
				<Badge variant='outline' className='px-3 py-1'>
					Ngành: {counts.nganh}
				</Badge>
			</div>

			<Card>
				<CardHeader className='pb-3'>
					<div className='flex flex-wrap items-start justify-between gap-3'>
						<div>
							<CardTitle className='text-base flex items-center gap-2'>
								<BookUser className='w-4 h-4' />
								Tài khoản đơn vị sử dụng &amp; ngành
							</CardTitle>
							<p className='text-sm text-muted-foreground mt-1 max-w-2xl'>
								Chỉ hiện TK đăng nhập thuộc{' '}
								<strong>đơn vị sử dụng</strong> hoặc{' '}
								<strong>ngành</strong>. Phòng chỉ có «Đơn vị
								quản lý» text — không tạo TK phòng. Thêm / phân
								quyền tại{' '}
								<Link
									to='/list-user'
									className='underline font-medium text-foreground inline-flex items-center gap-0.5'
								>
									Danh sách người dùng
									<ExternalLink className='w-3 h-3' />
								</Link>
								.
							</p>
						</div>
						<div className='flex flex-wrap items-center gap-2'>
							<div className='inline-flex rounded-md border p-0.5 bg-muted/40'>
								{(
									[
										['all', 'Tất cả'],
										['don_vi', 'ĐV sử dụng'],
										['nganh', 'Ngành']
									] as const
								).map(([k, label]) => (
									<button
										key={k}
										type='button'
										onClick={() => setKind(k)}
										className={cn(
											'px-2.5 py-1 text-xs rounded font-medium',
											kind === k
												? 'bg-background shadow-sm'
												: 'text-muted-foreground'
										)}
									>
										{label}
									</button>
								))}
							</div>
							<div className='relative w-full sm:w-56'>
								<Search className='absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground' />
								<Input
									className='pl-9 h-9'
									placeholder='Tìm username / tên…'
									value={search}
									onChange={(e) => setSearch(e.target.value)}
								/>
							</div>
							<Button
								type='button'
								size='sm'
								variant='outline'
								onClick={() => void usersQ.refetch()}
							>
								<RefreshCw
									className={cn(
										'w-3.5 h-3.5',
										usersQ.isFetching && 'animate-spin'
									)}
								/>
							</Button>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					{usersQ.isLoading ? (
						<div className='space-y-2'>
							<Skeleton className='h-10 w-full' />
							<Skeleton className='h-10 w-full' />
						</div>
					) : !rows.length ? (
						<p className='text-sm text-muted-foreground py-10 text-center'>
							Chưa có tài khoản ĐV / ngành
							{search.trim() ? ` khớp «${search.trim()}»` : ''}.
							Tạo tại Danh sách người dùng (chọn loại TK).
						</p>
					) : (
						<div className='rounded-lg border overflow-auto max-h-[min(70vh,640px)]'>
							<Table className='min-w-[720px]'>
								<TableHeader>
									<TableRow className='bg-muted/30'>
										<TableHead className='w-12'>
											STT
										</TableHead>
										<TableHead>Username</TableHead>
										<TableHead>Họ tên</TableHead>
										<TableHead className='w-28'>
											Loại
										</TableHead>
										<TableHead>Đơn vị / Ngành</TableHead>
										<TableHead className='w-28'>
											Trạng thái
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{rows.map((u, i) => {
										const donVi = isDonViUser(u)
										return (
											<TableRow key={u.id}>
												<TableCell className='text-muted-foreground tabular-nums text-xs'>
													{i + 1}
												</TableCell>
												<TableCell className='font-mono text-sm font-medium'>
													{u.username}
												</TableCell>
												<TableCell className='text-sm font-medium'>
													{u.displayName}
												</TableCell>
												<TableCell>
													<Badge
														variant={
															donVi
																? 'outline'
																: 'secondary'
														}
														className='text-[10px]'
													>
														{donVi
															? 'ĐV sử dụng'
															: 'Ngành'}
													</Badge>
												</TableCell>
												<TableCell className='text-sm break-words'>
													{unitOrNganhLabel(u)}
												</TableCell>
												<TableCell className='text-xs'>
													{u.status === 'pending' ? (
														<Badge variant='destructive'>
															pending
														</Badge>
													) : (
														<Badge variant='secondary'>
															{u.status ||
																'approved'}
														</Badge>
													)}
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
		</div>
	)
}
