import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Search } from 'lucide-react'
import { GetAccountAuditLogs } from '@/api/asset'
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
import { cn } from '@/lib/utils'

const actionLabel: Record<string, string> = {
	CREATE: 'Thêm',
	UPDATE: 'Sửa',
	DELETE: 'Xóa'
}

const actionVariant: Record<
	string,
	'default' | 'secondary' | 'destructive' | 'outline'
> = {
	CREATE: 'default',
	UPDATE: 'secondary',
	DELETE: 'destructive'
}

function formatTime(iso: string) {
	try {
		return new Date(iso).toLocaleString('vi-VN')
	} catch {
		return iso
	}
}

type Props = {
	/** Gọn cho layout 2 cột cạnh danh sách tài khoản */
	compact?: boolean
}

export default function AccountAuditLogPanel({ compact = false }: Props) {
	const [search, setSearch] = useState('')
	const [debounced, setDebounced] = useState('')

	useEffect(() => {
		const t = window.setTimeout(() => setDebounced(search.trim()), 300)
		return () => window.clearTimeout(t)
	}, [search])

	const logsQ = useQuery({
		queryKey: ['account-audit-logs', debounced],
		queryFn: () =>
			GetAccountAuditLogs({
				q: debounced || undefined,
				limit: 300
			})
	})

	const logs = logsQ.data ?? []

	return (
		<Card className={cn(compact && 'h-full flex flex-col')}>
			<CardHeader className='pb-3 shrink-0'>
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<div>
						<CardTitle className='text-base'>
							Nhật ký tài khoản
						</CardTitle>
						{!compact && (
							<CardDescription>
								Mọi thao tác thêm / sửa / xóa (user &amp;
								admin).
							</CardDescription>
						)}
						{compact && (
							<CardDescription className='text-xs'>
								User &amp; admin · thêm / sửa / xóa
							</CardDescription>
						)}
					</div>
					<Button
						size='sm'
						variant='outline'
						onClick={() => logsQ.refetch()}
					>
						<RefreshCw
							className={`w-3.5 h-3.5 mr-1 ${logsQ.isFetching ? 'animate-spin' : ''}`}
						/>
						Làm mới
					</Button>
				</div>
			</CardHeader>
			<CardContent
				className={cn(
					'space-y-3',
					compact && 'flex-1 flex flex-col min-h-0'
				)}
			>
				<div className='relative shrink-0'>
					<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder='Tìm trong log…'
						className='pl-9'
					/>
				</div>

				{logsQ.isLoading ? (
					<div className='space-y-2'>
						<Skeleton className='h-10 w-full' />
						<Skeleton className='h-10 w-full' />
					</div>
				) : logs.length === 0 ? (
					<p className='text-sm text-muted-foreground py-6 text-center'>
						{debounced
							? `Không có log khớp «${debounced}».`
							: 'Chưa có nhật ký.'}
					</p>
				) : (
					<div
						className={cn(
							'rounded-lg border overflow-auto',
							compact
								? 'flex-1 max-h-[min(70vh,640px)]'
								: 'max-h-[420px]'
						)}
					>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead
										className={
											compact ? 'w-[110px]' : 'w-[150px]'
										}
									>
										Thời gian
									</TableHead>
									<TableHead className='w-[72px]'>
										HĐ
									</TableHead>
									{!compact && (
										<TableHead className='w-[140px]'>
											Người thực hiện
										</TableHead>
									)}
									<TableHead>Nội dung</TableHead>
									{!compact && (
										<>
											<TableHead className='w-[100px]'>
												Mã phòng
											</TableHead>
											<TableHead>Tài khoản</TableHead>
										</>
									)}
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.map((row) => (
									<TableRow key={row.id}>
										<TableCell className='text-xs text-muted-foreground whitespace-nowrap'>
											{formatTime(row.createdAt)}
										</TableCell>
										<TableCell>
											<Badge
												variant={
													actionVariant[row.action] ??
													'outline'
												}
												className='text-xs'
											>
												{actionLabel[row.action] ??
													row.action}
											</Badge>
										</TableCell>
										{!compact && (
											<TableCell className='text-sm'>
												<div className='font-medium truncate max-w-[140px]'>
													{row.actorDisplayName ||
														row.actorUsername ||
														'—'}
												</div>
												<div className='text-xs text-muted-foreground'>
													{row.actorIsAdmin
														? 'Admin'
														: 'User'}
												</div>
											</TableCell>
										)}
										<TableCell className='text-sm'>
											<div
												className={
													compact
														? 'text-xs leading-snug'
														: ''
												}
											>
												{row.summary}
											</div>
											{row.details ? (
												<div className='text-xs text-muted-foreground mt-0.5'>
													{row.details}
												</div>
											) : null}
											{compact && (
												<div className='text-[11px] text-muted-foreground mt-0.5'>
													{row.actorIsAdmin
														? 'Admin'
														: 'User'}
													{row.actorDisplayName
														? ` · ${row.actorDisplayName}`
														: ''}
													{row.roomCode
														? ` · ${row.roomCode}`
														: ''}
												</div>
											)}
										</TableCell>
										{!compact && (
											<>
												<TableCell className='font-mono text-sm'>
													{row.roomCode || '—'}
												</TableCell>
												<TableCell className='text-sm'>
													{row.accountLabel || '—'}
												</TableCell>
											</>
										)}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	)
}
