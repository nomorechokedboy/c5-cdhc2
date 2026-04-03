import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Navigate } from '@tanstack/react-router'
import { appFetcher } from '@/api'
import { ApiUrl } from '@/const'
import useAuth from '@/hooks/useAuth'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import { ScrollArea } from '@repo/ui/components/ui/scroll-area'
import { Skeleton } from '@repo/ui/components/ui/skeleton'
import { toast } from '@repo/ui/components/ui/sonner'
import {
	Activity,
	AlertCircle,
	Ban,
	CheckCircle2,
	ChevronLeft,
	ChevronRight,
	Clock,
	Filter,
	RefreshCw,
	Search,
	ShieldAlert,
	Trash2,
	User,
	X,
	Zap
} from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'

dayjs.locale('vi')

// ── Types ─────────────────────────────────────────────────────────────────────

interface AuditEntry {
	id: string
	timestamp: string
	event_type: string
	actor_id: number
	actor_role: string
	outcome: 'success' | 'failure' | 'denied'
	service: string
	endpoint: string
	ip_address?: string
	details?: unknown
	error_msg?: string
}

interface AuditListResponse {
	data: AuditEntry[]
	total: number
	page: number
	limit: number
	total_pages: number
}

interface AuditStatsResponse {
	total_events: number
	today_events: number
	failure_count: number
	denied_count: number
	top_event_types: { event_type: string; count: number }[]
	recent_actors: { actor_id: number; actor_role: string; count: number }[]
}

interface Filters {
	event_type: string
	outcome: string
	actor_id: string
	from: string
	to: string
	search: string
}

const EMPTY_FILTERS: Filters = {
	event_type: '',
	outcome: '',
	actor_id: '',
	from: '',
	to: '',
	search: ''
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function fetchLogs(
	page: number,
	limit: number,
	f: Filters
): Promise<AuditListResponse> {
	const p = new URLSearchParams({ page: String(page), limit: String(limit) })
	if (f.event_type) p.set('event_type', f.event_type)
	if (f.outcome) p.set('outcome', f.outcome)
	if (f.actor_id) p.set('actor_id', f.actor_id)
	if (f.from) p.set('from', new Date(f.from).toISOString())
	if (f.to) p.set('to', new Date(f.to).toISOString())
	if (f.search) p.set('search', f.search)
	const res = await appFetcher(`${ApiUrl}/audit/logs?${p}`)
	if (!res.ok) {
		const body = await res.json().catch(() => ({}))
		throw new Error(body?.message ?? `HTTP ${res.status}`)
	}
	return res.json()
}

async function fetchStats(): Promise<AuditStatsResponse> {
	const res = await appFetcher(`${ApiUrl}/audit/stats`)
	if (!res.ok) throw new Error(`HTTP ${res.status}`)
	return res.json()
}

async function purge(daysOld: number) {
	const res = await appFetcher(`${ApiUrl}/audit/logs`, {
		method: 'DELETE',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ days_old: daysOld })
	})
	if (!res.ok) {
		const body = await res.json().catch(() => ({}))
		throw new Error(body?.message ?? `HTTP ${res.status}`)
	}
	return res.json() as Promise<{ removed: number; message: string }>
}

// ── Sub-components ────────────────────────────────────────────────────────────

// OutcomeBadge resolves its label from i18n so it must call useTranslation itself.
function OutcomeBadge({ outcome }: { outcome: AuditEntry['outcome'] }) {
	const { t } = useTranslation()

	const CFG = {
		success: {
			Icon: CheckCircle2,
			cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400'
		},
		failure: {
			Icon: AlertCircle,
			cls: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400'
		},
		denied: {
			Icon: Ban,
			cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400'
		}
	} as const

	const { Icon, cls } = CFG[outcome] ?? CFG.failure
	return (
		<Badge variant='outline' className={`gap-1 text-xs font-medium ${cls}`}>
			<Icon className='w-3 h-3' />
			{t(`audit.outcome.${outcome}`)}
		</Badge>
	)
}

function StatCard({
	icon: Icon,
	label,
	value,
	iconCls
}: {
	icon: React.ElementType
	label: string
	value?: number
	iconCls: string
}) {
	return (
		<Card>
			<CardContent className='pt-5'>
				<div className='flex items-center gap-3'>
					<div className={`p-2 rounded-md ${iconCls}`}>
						<Icon className='w-5 h-5' />
					</div>
					<div>
						<p className='text-2xl font-bold tabular-nums'>
							{value?.toLocaleString('vi-VN') ?? '—'}
						</p>
						<p className='text-xs text-muted-foreground'>{label}</p>
					</div>
				</div>
			</CardContent>
		</Card>
	)
}

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

// Mirrors the EventType constants in audit/entities.go.
// labelKey is the i18n key resolved at render time via t().
const EVENT_TYPE_OPTIONS = [
	{ value: '', labelKey: 'audit.filter.allEvents' },
	{ value: 'auth.login', labelKey: 'audit.eventTypes.auth.login' },
	{
		value: 'auth.token_refresh',
		labelKey: 'audit.eventTypes.auth.token_refresh'
	},
	{ value: 'auth.denied', labelKey: 'audit.eventTypes.auth.denied' },
	{ value: 'grade.update', labelKey: 'audit.eventTypes.grade.update' },
	{ value: 'export.grades', labelKey: 'audit.eventTypes.export.grades' },
	{ value: 'template.upload', labelKey: 'audit.eventTypes.template.upload' },
	{ value: 'template.delete', labelKey: 'audit.eventTypes.template.delete' },
	{
		value: 'config.langpack_set',
		labelKey: 'audit.eventTypes.config.langpack_set'
	},
	{
		value: 'config.langpack_delete',
		labelKey: 'audit.eventTypes.config.langpack_delete'
	},
	{ value: 'audit.purge', labelKey: 'audit.eventTypes.audit.purge' }
] as const

const OUTCOME_OPTIONS = [
	{ value: '', labelKey: 'audit.filter.allOutcomes' },
	{ value: 'success', labelKey: 'audit.outcome.success' },
	{ value: 'failure', labelKey: 'audit.outcome.failure' },
	{ value: 'denied', labelKey: 'audit.outcome.denied' }
] as const

const PER_PAGE = [20, 50, 100]

// ── Main page ─────────────────────────────────────────────────────────────────

export function AuditLogPage() {
	const { isAdmin } = useAuth()
	if (!isAdmin) return <Navigate to='/' replace />
	return <AuditLogContent />
}

function AuditLogContent() {
	const { t } = useTranslation()
	const qc = useQueryClient()
	const [page, setPage] = useState(1)
	const [limit, setLimit] = useState(50)
	const [purgeDays, setPurgeDays] = useState(30)
	const [showPurge, setShowPurge] = useState(false)

	// pending = what the user is typing; active = what was last applied
	const [pending, setPending] = useState<Filters>(EMPTY_FILTERS)
	const [active, setActive] = useState<Filters>(EMPTY_FILTERS)

	const hasActive = Object.values(active).some((v) => v !== '')
	const activeCount = Object.values(active).filter((v) => v !== '').length

	// ── queries ───────────────────────────────────────────────────────────────

	const {
		data: logsData,
		isLoading,
		error: logsError,
		refetch: refetchLogs
	} = useQuery({
		queryKey: ['auditLogs', page, limit, active],
		queryFn: () => fetchLogs(page, limit, active),
		staleTime: 30_000
	})

	const { data: statsData, refetch: refetchStats } = useQuery({
		queryKey: ['auditStats'],
		queryFn: fetchStats,
		staleTime: 60_000
	})

	const { mutateAsync: doPurge, isPending: isPurging } = useMutation({
		mutationFn: purge,
		onSuccess: (data) => {
			toast.success(
				t('audit.purgeSuccess', {
					count: data.removed.toLocaleString('vi-VN')
				})
			)
			qc.invalidateQueries({ queryKey: ['auditLogs'] })
			qc.invalidateQueries({ queryKey: ['auditStats'] })
			setShowPurge(false)
		},
		onError: (e: Error) => toast.error(e.message)
	})

	// ── handlers ──────────────────────────────────────────────────────────────

	const applyFilters = useCallback(() => {
		setActive({ ...pending })
		setPage(1)
	}, [pending])

	const clearFilters = useCallback(() => {
		setPending(EMPTY_FILTERS)
		setActive(EMPTY_FILTERS)
		setPage(1)
	}, [])

	const refresh = useCallback(() => {
		refetchLogs()
		refetchStats()
	}, [refetchLogs, refetchStats])

	// ── render ────────────────────────────────────────────────────────────────

	return (
		<div className='container mx-auto p-6 space-y-6 max-w-screen-2xl'>
			{/* ── Header ─────────────────────────────────────────────────── */}
			<div className='flex items-start justify-between flex-wrap gap-3'>
				<div className='flex items-start gap-3'>
					<div className='p-2 rounded-md bg-violet-500/10 mt-0.5'>
						<ShieldAlert className='w-5 h-5 text-violet-500' />
					</div>
					<div>
						<h1 className='text-2xl font-bold tracking-tight'>
							{t('audit.title')}
						</h1>
						<p className='text-sm text-muted-foreground'>
							{t('audit.subtitle')}
						</p>
					</div>
				</div>
				<div className='flex items-center gap-2'>
					<Button variant='outline' size='sm' onClick={refresh}>
						<RefreshCw className='w-4 h-4' />
						{t('audit.refresh')}
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => setShowPurge((v) => !v)}
					>
						<Trash2 className='w-4 h-4' />
						{t('audit.purgeButton')}
					</Button>
				</div>
			</div>

			{/* ── Stats strip ────────────────────────────────────────────── */}
			<div className='grid grid-cols-2 sm:grid-cols-4 gap-4'>
				<StatCard
					icon={Activity}
					label={t('audit.stats.total')}
					value={statsData?.total_events}
					iconCls='bg-blue-500/10 text-blue-500'
				/>
				<StatCard
					icon={Zap}
					label={t('audit.stats.today')}
					value={statsData?.today_events}
					iconCls='bg-violet-500/10 text-violet-500'
				/>
				<StatCard
					icon={AlertCircle}
					label={t('audit.stats.failures')}
					value={statsData?.failure_count}
					iconCls='bg-red-500/10 text-red-500'
				/>
				<StatCard
					icon={Ban}
					label={t('audit.stats.denied')}
					value={statsData?.denied_count}
					iconCls='bg-amber-500/10 text-amber-500'
				/>
			</div>

			{/* ── Purge panel ────────────────────────────────────────────── */}
			{showPurge && (
				<Card className='border-destructive/40 bg-destructive/5'>
					<CardHeader className='pb-3'>
						<CardTitle className='text-sm text-destructive flex items-center gap-2'>
							<Trash2 className='w-4 h-4' />
							{t('audit.purgeTitle')}
						</CardTitle>
						<CardDescription>
							{t('audit.purgeDesc')}
						</CardDescription>
					</CardHeader>
					<CardContent className='flex items-center gap-3 flex-wrap'>
						<div className='flex items-center gap-2'>
							<span className='text-sm text-muted-foreground whitespace-nowrap'>
								{t('audit.purgeOlderThan')}
							</span>
							<Input
								type='number'
								min={7}
								max={365}
								value={purgeDays}
								onChange={(e) =>
									setPurgeDays(Number(e.target.value))
								}
								className='w-20 h-8'
							/>
							<span className='text-sm text-muted-foreground'>
								{t('audit.purgeDays')}
							</span>
						</div>
						<Button
							size='sm'
							variant='destructive'
							onClick={() => doPurge(purgeDays)}
							disabled={isPurging}
						>
							{isPurging
								? t('audit.purging')
								: t('audit.purgeConfirm')}
						</Button>
						<Button
							size='sm'
							variant='ghost'
							onClick={() => setShowPurge(false)}
						>
							{t('audit.purgeCancel')}
						</Button>
					</CardContent>
				</Card>
			)}

			{/* ── Filter bar ─────────────────────────────────────────────── */}
			<Card>
				<CardHeader className='pb-3'>
					<CardTitle className='text-sm flex items-center gap-2'>
						<Filter className='w-4 h-4' />
						{t('audit.filter.title')}
						{hasActive && (
							<Badge variant='secondary' className='text-xs'>
								{t('audit.filter.active', {
									count: activeCount
								})}
							</Badge>
						)}
					</CardTitle>
				</CardHeader>
				<CardContent className='space-y-3'>
					<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
						{/* Full-text search */}
						<div className='lg:col-span-2 space-y-1'>
							<label className='text-xs text-muted-foreground font-medium'>
								{t('audit.filter.search')}
							</label>
							<div className='relative'>
								<Search className='absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground' />
								<Input
									placeholder={t(
										'audit.filter.searchPlaceholder'
									)}
									value={pending.search}
									onChange={(e) =>
										setPending((p) => ({
											...p,
											search: e.target.value
										}))
									}
									onKeyDown={(e) =>
										e.key === 'Enter' && applyFilters()
									}
									className='h-9 pl-8'
								/>
							</div>
						</div>

						{/* Event type */}
						<div className='space-y-1'>
							<label className='text-xs text-muted-foreground font-medium'>
								{t('audit.filter.eventType')}
							</label>
							<select
								className='w-full h-9 rounded-md border border-input bg-background px-3 text-sm'
								value={pending.event_type}
								onChange={(e) =>
									setPending((p) => ({
										...p,
										event_type: e.target.value
									}))
								}
							>
								{EVENT_TYPE_OPTIONS.map((o) => (
									<option key={o.value} value={o.value}>
										{t(o.labelKey)}
									</option>
								))}
							</select>
						</div>

						{/* Outcome */}
						<div className='space-y-1'>
							<label className='text-xs text-muted-foreground font-medium'>
								{t('audit.filter.outcome')}
							</label>
							<select
								className='w-full h-9 rounded-md border border-input bg-background px-3 text-sm'
								value={pending.outcome}
								onChange={(e) =>
									setPending((p) => ({
										...p,
										outcome: e.target.value
									}))
								}
							>
								{OUTCOME_OPTIONS.map((o) => (
									<option key={o.value} value={o.value}>
										{t(o.labelKey)}
									</option>
								))}
							</select>
						</div>

						{/* Actor ID */}
						<div className='space-y-1'>
							<label className='text-xs text-muted-foreground font-medium'>
								{t('audit.filter.actorId')}
							</label>
							<Input
								type='number'
								placeholder={t(
									'audit.filter.actorIdPlaceholder'
								)}
								value={pending.actor_id}
								onChange={(e) =>
									setPending((p) => ({
										...p,
										actor_id: e.target.value
									}))
								}
								className='h-9'
							/>
						</div>

						{/* From date */}
						<div className='space-y-1'>
							<label className='text-xs text-muted-foreground font-medium'>
								{t('audit.filter.from')}
							</label>
							<Input
								type='datetime-local'
								value={pending.from}
								onChange={(e) =>
									setPending((p) => ({
										...p,
										from: e.target.value
									}))
								}
								className='h-9'
							/>
						</div>
					</div>

					{/* To date */}
					<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3'>
						<div className='space-y-1'>
							<label className='text-xs text-muted-foreground font-medium'>
								{t('audit.filter.to')}
							</label>
							<Input
								type='datetime-local'
								value={pending.to}
								onChange={(e) =>
									setPending((p) => ({
										...p,
										to: e.target.value
									}))
								}
								className='h-9'
							/>
						</div>
					</div>

					<div className='flex items-center gap-2 pt-1'>
						<Button size='sm' onClick={applyFilters}>
							<Filter className='w-3.5 h-3.5' />
							{t('audit.filter.apply')}
						</Button>
						{hasActive && (
							<Button
								size='sm'
								variant='ghost'
								onClick={clearFilters}
							>
								<X className='w-3.5 h-3.5' />
								{t('audit.filter.clear')}
							</Button>
						)}
						<span className='ml-auto text-xs text-muted-foreground'>
							{logsData
								? t('audit.filter.recordCount', {
										total: logsData.total.toLocaleString(
											'vi-VN'
										)
									})
								: ''}
						</span>
					</div>
				</CardContent>
			</Card>

			{/* ── Log table ──────────────────────────────────────────────── */}
			<Card>
				<CardHeader className='pb-3'>
					<div className='flex items-center justify-between flex-wrap gap-2'>
						<CardTitle className='text-base'>
							{t('audit.table.title')}
						</CardTitle>
						<div className='flex items-center gap-2 text-xs text-muted-foreground'>
							<span>{t('audit.table.perPage')}</span>
							{PER_PAGE.map((n) => (
								<button
									key={n}
									onClick={() => {
										setLimit(n)
										setPage(1)
									}}
									className={`px-2 py-0.5 rounded transition-colors ${
										limit === n
											? 'bg-primary text-primary-foreground font-semibold'
											: 'hover:bg-muted'
									}`}
								>
									{n}
								</button>
							))}
						</div>
					</div>
				</CardHeader>

				<CardContent className='p-0'>
					{logsError && (
						<div className='p-6 text-center text-sm text-red-600'>
							<AlertCircle className='w-5 h-5 mx-auto mb-2' />
							{(logsError as Error).message}
						</div>
					)}

					<ScrollArea className='h-[calc(100vh-28rem)]'>
						<Table>
							<TableHeader className='sticky top-0 bg-background z-10 border-b'>
								<TableRow className='bg-muted/40 hover:bg-muted/40'>
									<TableHead className='w-36'>
										<span className='flex items-center gap-1'>
											<Clock className='w-3.5 h-3.5' />
											{t('audit.table.time')}
										</span>
									</TableHead>
									<TableHead>
										{t('audit.table.event')}
									</TableHead>
									<TableHead className='w-20'>
										<span className='flex items-center gap-1'>
											<User className='w-3.5 h-3.5' />
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
								) : !logsData || logsData.data.length === 0 ? (
									<TableRow>
										<TableCell
											colSpan={7}
											className='py-16 text-center text-muted-foreground'
										>
											<Activity className='w-8 h-8 mx-auto mb-2 opacity-25' />
											{t('audit.table.empty')}
										</TableCell>
									</TableRow>
								) : (
									logsData.data.map((entry) => (
										<AuditRow
											key={entry.id}
											entry={entry}
										/>
									))
								)}
							</TableBody>
						</Table>
					</ScrollArea>

					{/* Pagination footer */}
					{logsData && logsData.total_pages > 1 && (
						<div className='flex items-center justify-between px-4 py-3 border-t'>
							<span className='text-xs text-muted-foreground'>
								{t('audit.table.page', {
									current: page,
									total: logsData.total_pages
								})}
							</span>
							<div className='flex items-center gap-1'>
								<Button
									size='sm'
									variant='outline'
									className='h-7 w-7 p-0'
									disabled={page <= 1}
									onClick={() => setPage((p) => p - 1)}
								>
									<ChevronLeft className='w-4 h-4' />
								</Button>
								{Array.from(
									{
										length: Math.min(
											5,
											logsData.total_pages
										)
									},
									(_, i) => {
										const p =
											Math.max(
												1,
												Math.min(
													logsData.total_pages - 4,
													page - 2
												)
											) + i
										return (
											<button
												key={p}
												onClick={() => setPage(p)}
												className={`h-7 w-7 rounded text-xs transition-colors ${
													p === page
														? 'bg-primary text-primary-foreground font-semibold'
														: 'hover:bg-muted'
												}`}
											>
												{p}
											</button>
										)
									}
								)}
								<Button
									size='sm'
									variant='outline'
									className='h-7 w-7 p-0'
									disabled={page >= logsData.total_pages}
									onClick={() => setPage((p) => p + 1)}
								>
									<ChevronRight className='w-4 h-4' />
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>

			{/* ── Insight cards ──────────────────────────────────────────── */}
			{statsData && (
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm'>
								{t('audit.insights.topEvents')}
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-2'>
							{statsData.top_event_types.length === 0 ? (
								<p className='text-xs text-muted-foreground'>
									{t('audit.insights.noData')}
								</p>
							) : (
								statsData.top_event_types.map((item) => (
									<div
										key={item.event_type}
										className='flex items-center justify-between'
									>
										<code className='text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
											{t(
												`audit.eventTypes.${item.event_type}`,
												{
													defaultValue:
														item.event_type
												}
											)}
										</code>
										<Badge variant='secondary'>
											{item.count.toLocaleString('vi-VN')}
										</Badge>
									</div>
								))
							)}
						</CardContent>
					</Card>

					<Card>
						<CardHeader className='pb-2'>
							<CardTitle className='text-sm'>
								{t('audit.insights.topActors')}
							</CardTitle>
						</CardHeader>
						<CardContent className='space-y-2'>
							{statsData.recent_actors.length === 0 ? (
								<p className='text-xs text-muted-foreground'>
									{t('audit.insights.noData')}
								</p>
							) : (
								statsData.recent_actors.map((a) => (
									<div
										key={a.actor_id}
										className='flex items-center justify-between'
									>
										<div className='flex items-center gap-2'>
											<User className='w-3.5 h-3.5 text-muted-foreground' />
											<span className='text-xs'>
												ID {a.actor_id}
											</span>
											<Badge
												variant='outline'
												className='text-xs h-5'
											>
												{a.actor_role
													? t(
															`roles.${a.actor_role}`,
															{
																defaultValue:
																	a.actor_role
															}
														)
													: '—'}
											</Badge>
										</div>
										<Badge variant='secondary'>
											{a.count.toLocaleString('vi-VN')}
										</Badge>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	)
}

// ── Row component with expandable detail ──────────────────────────────────────

function AuditRow({ entry }: { entry: AuditEntry }) {
	const { t } = useTranslation()
	const [expanded, setExpanded] = useState(false)
	const hasDetail = !!entry.error_msg || !!entry.details

	const rowHighlight =
		entry.outcome === 'failure'
			? 'bg-red-50/40 dark:bg-red-950/10'
			: entry.outcome === 'denied'
				? 'bg-amber-50/40 dark:bg-amber-950/10'
				: ''

	return (
		<>
			<TableRow
				className={`hover:bg-muted/30 transition-colors ${rowHighlight}`}
			>
				<TableCell className='text-xs tabular-nums text-muted-foreground whitespace-nowrap'>
					{dayjs(entry.timestamp).format('DD/MM HH:mm:ss')}
				</TableCell>
				<TableCell>
					<code className='text-xs bg-muted px-1.5 py-0.5 rounded'>
						{t(`audit.eventTypes.${entry.event_type}`, {
							defaultValue: entry.event_type
						})}
					</code>
				</TableCell>
				<TableCell className='text-xs tabular-nums'>
					{entry.actor_id || '—'}
				</TableCell>
				<TableCell>
					{entry.actor_role ? (
						<Badge variant='outline' className='text-xs h-5'>
							{t(`roles.${entry.actor_role}`, {
								defaultValue: entry.actor_role
							})}
						</Badge>
					) : (
						<span className='text-muted-foreground text-xs'>—</span>
					)}
				</TableCell>
				<TableCell>
					<OutcomeBadge outcome={entry.outcome} />
				</TableCell>
				<TableCell className='text-xs text-muted-foreground font-mono max-w-[240px] truncate'>
					{entry.endpoint}
				</TableCell>
				<TableCell>
					{hasDetail ? (
						<Button
							variant='ghost'
							size='sm'
							className='h-6 px-2 text-xs'
							onClick={() => setExpanded((v) => !v)}
						>
							{expanded
								? t('audit.table.hide')
								: t('audit.table.show')}
						</Button>
					) : (
						<span className='text-muted-foreground text-xs'>—</span>
					)}
				</TableCell>
			</TableRow>

			{expanded && hasDetail && (
				<TableRow>
					<TableCell
						colSpan={7}
						className='bg-muted/20 px-4 py-2 border-t'
					>
						<div className='space-y-1.5'>
							{entry.error_msg && (
								<p className='text-xs text-red-600 dark:text-red-400 font-mono'>
									<span className='font-semibold'>
										{t('audit.table.errorLabel')}
									</span>{' '}
									{entry.error_msg}
								</p>
							)}
							{entry.details && (
								<pre className='text-xs text-muted-foreground bg-muted rounded p-2 overflow-auto max-h-32'>
									{JSON.stringify(entry.details, null, 2)}
								</pre>
							)}
						</div>
					</TableCell>
				</TableRow>
			)}
		</>
	)
}
