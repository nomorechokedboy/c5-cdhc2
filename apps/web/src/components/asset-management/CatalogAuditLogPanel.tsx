import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Search } from 'lucide-react'
import { GetCatalogAuditLogs } from '@/api/asset'
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
import { formatVNDateTime } from '@/lib/utils'

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

const entityLabel: Record<string, string> = {
	NGANH: 'Ngành',
	LOAI_VAT: 'Loại vật',
	VAT_TU: 'Vật tư'
}

/** Hiển thị đủ ngày + giờ VN (vd. 14/07/2026 08:37:47) */
function formatTime(iso: string) {
	return formatVNDateTime(iso)
}

/** Hiển thị rõ người thao tác: họ tên + username + vai trò */
function ActorCell({
	displayName,
	username,
	userId,
	isAdmin
}: {
	displayName: string | null
	username: string | null
	userId: number | null
	isAdmin: boolean
}) {
	const name =
		(displayName || '').trim() ||
		(username || '').trim() ||
		(userId != null ? `User #${userId}` : 'Hệ thống')
	const uname = (username || '').trim()

	return (
		<div className='min-w-[140px] space-y-1'>
			<div className='flex flex-wrap items-center gap-1.5'>
				<span className='text-sm font-semibold text-foreground'>
					{name}
				</span>
				<Badge
					variant={isAdmin ? 'default' : 'secondary'}
					className='text-[10px] px-1.5 py-0 h-5'
				>
					{isAdmin ? 'Admin' : 'User'}
				</Badge>
			</div>
			{uname && uname !== name ? (
				<div className='text-xs text-muted-foreground font-mono'>
					@{uname}
				</div>
			) : uname ? (
				<div className='text-xs text-muted-foreground font-mono'>
					@{uname}
				</div>
			) : userId != null ? (
				<div className='text-xs text-muted-foreground'>ID {userId}</div>
			) : null}
		</div>
	)
}

type Props = {
	/** Lọc theo loại entity, vd VAT_TU */
	entityType?: string
	title?: string
}

export default function CatalogAuditLogPanel({
	entityType,
	title = 'Nhật ký danh mục'
}: Props) {
	const [search, setSearch] = useState('')
	const [debounced, setDebounced] = useState('')

	useEffect(() => {
		const t = window.setTimeout(() => setDebounced(search.trim()), 300)
		return () => window.clearTimeout(t)
	}, [search])

	const logsQ = useQuery({
		queryKey: ['catalog-audit-logs', entityType, debounced],
		queryFn: () =>
			GetCatalogAuditLogs({
				q: debounced || undefined,
				entityType: entityType || undefined,
				limit: 300
			})
	})

	const logs = logsQ.data ?? []

	return (
		<Card>
			<CardHeader className='pb-3'>
				<div className='flex flex-wrap items-center justify-between gap-3'>
					<div>
						<CardTitle className='text-base'>{title}</CardTitle>
						<CardDescription>
							Thêm · sửa tên · xóa trong danh mục ngành / loại vật
							/ vật tư (user &amp; admin). Không gồm SC hay
							tăng/giảm kho.
						</CardDescription>
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
			<CardContent className='space-y-3'>
				<div className='relative max-w-xl'>
					<Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder='Tìm theo người sửa, mã, tên…'
						className='pl-9'
					/>
				</div>
				{logsQ.isLoading ? (
					<div className='space-y-2'>
						<Skeleton className='h-10 w-full' />
						<Skeleton className='h-10 w-full' />
					</div>
				) : logs.length === 0 ? (
					<p className='text-sm text-muted-foreground py-8 text-center'>
						{debounced
							? `Không có log khớp «${debounced}».`
							: 'Chưa có nhật ký.'}
					</p>
				) : (
					<div className='rounded-lg border overflow-auto max-h-[min(70vh,640px)]'>
						<Table>
							<TableHeader>
								<TableRow className='bg-muted/30'>
									<TableHead className='w-[168px] whitespace-nowrap'>
										Thời gian (ngày giờ)
									</TableHead>
									<TableHead className='min-w-[160px]'>
										Người thực hiện
									</TableHead>
									<TableHead className='w-[72px]'>
										HĐ
									</TableHead>
									{!entityType && (
										<TableHead className='w-[90px]'>
											Loại
										</TableHead>
									)}
									<TableHead>Nội dung</TableHead>
									<TableHead className='w-[100px]'>
										Mã
									</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{logs.map((row) => (
									<TableRow key={row.id}>
										<TableCell className='text-sm font-mono tabular-nums whitespace-nowrap align-top text-foreground'>
											{formatTime(row.createdAt)}
										</TableCell>
										<TableCell className='align-top'>
											<ActorCell
												displayName={
													row.actorDisplayName
												}
												username={row.actorUsername}
												userId={row.actorUserId}
												isAdmin={row.actorIsAdmin}
											/>
										</TableCell>
										<TableCell className='align-top'>
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
										{!entityType && (
											<TableCell className='text-xs align-top'>
												{entityLabel[row.entityType] ??
													row.entityType}
											</TableCell>
										)}
										<TableCell className='text-sm align-top'>
											<div className='font-medium'>
												{row.entityName
													? `${entityLabel[row.entityType] ?? row.entityType}: ${row.entityName}`
													: row.summary}
											</div>
											{row.details ? (
												<div className='text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap'>
													{row.details}
												</div>
											) : null}
											{row.parentCode ||
											row.parentName ? (
												<div className='text-[11px] text-muted-foreground mt-0.5'>
													Thuộc:{' '}
													{[
														row.parentCode,
														row.parentName
													]
														.filter(Boolean)
														.join(' — ')}
												</div>
											) : null}
										</TableCell>
										<TableCell className='font-mono text-sm align-top'>
											{row.entityCode || '—'}
										</TableCell>
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
