import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Navigate } from '@tanstack/react-router'
import { RefreshCw, Trash2 } from 'lucide-react'
import useAuth from '@/hooks/useAuth'
import { Button } from '@repo/ui/components/ui/button'
import { toast } from '@repo/ui/components/ui/sonner'
import { Ledger } from '@/components/dashboard'
import { fetchLogs, fetchStats, purge } from './audit/api'
import { AuditFilters } from './audit/AuditFilters'
import { AuditInsights } from './audit/AuditInsights'
import { AuditTable } from './audit/AuditTable'
import { PurgePanel } from './audit/PurgePanel'
import { EMPTY_FILTERS, type Filters } from './audit/types'

const count = (n?: number) => n?.toLocaleString('vi-VN') ?? '—'

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
	const activeCount = Object.values(active).filter((v) => v !== '').length

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

	return (
		<div className='container mx-auto max-w-screen-2xl min-w-0 space-y-6 p-6'>
			<div className='flex flex-wrap items-end justify-between gap-3'>
				<div className='space-y-1'>
					<h1 className='text-3xl font-semibold tracking-tight'>
						{t('audit.title')}
					</h1>
					<p className='text-muted-foreground'>
						{t('audit.subtitle')}
					</p>
				</div>
				<div className='flex items-center gap-2'>
					<Button variant='outline' size='sm' onClick={refresh}>
						<RefreshCw className='h-4 w-4' />
						{t('audit.refresh')}
					</Button>
					<Button
						variant='outline'
						size='sm'
						onClick={() => setShowPurge((v) => !v)}
					>
						<Trash2 className='h-4 w-4' />
						{t('audit.purgeButton')}
					</Button>
				</div>
			</div>

			<Ledger
				items={[
					{
						label: t('audit.stats.total'),
						value: count(statsData?.total_events)
					},
					{
						label: t('audit.stats.today'),
						value: count(statsData?.today_events)
					},
					{
						label: t('audit.stats.failures'),
						value: count(statsData?.failure_count)
					},
					{
						label: t('audit.stats.denied'),
						value: count(statsData?.denied_count)
					}
				]}
			/>

			{showPurge && (
				<PurgePanel
					days={purgeDays}
					onDays={setPurgeDays}
					isPurging={isPurging}
					onConfirm={() => doPurge(purgeDays)}
					onCancel={() => setShowPurge(false)}
				/>
			)}

			<AuditFilters
				pending={pending}
				onChange={(patch) => setPending((p) => ({ ...p, ...patch }))}
				activeCount={activeCount}
				recordCount={logsData?.total}
				onApply={applyFilters}
				onClear={clearFilters}
			/>

			<AuditTable
				logs={logsData}
				isLoading={isLoading}
				error={logsError as Error | null}
				page={page}
				limit={limit}
				onPage={setPage}
				onLimit={(n) => {
					setLimit(n)
					setPage(1)
				}}
			/>

			{statsData && <AuditInsights stats={statsData} />}
		</div>
	)
}
