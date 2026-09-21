import { User } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@repo/ui/components/ui/badge'
import { Card, CardContent, CardHeader } from '@repo/ui/components/ui/card'
import type { AuditStatsResponse } from './types'

function InsightCard({
	title,
	empty,
	children
}: {
	title: string
	empty: boolean
	children: ReactNode
}) {
	const { t } = useTranslation()
	return (
		<Card>
			<CardHeader>
				<h2 className='font-serif text-base font-semibold'>{title}</h2>
			</CardHeader>
			<CardContent className='space-y-2'>
				{empty ? (
					<p className='text-muted-foreground text-xs'>
						{t('audit.insights.noData')}
					</p>
				) : (
					children
				)}
			</CardContent>
		</Card>
	)
}

/** Hai thẻ tóm tắt: sự kiện nhiều nhất và người dùng hoạt động gần đây. */
export function AuditInsights({ stats }: { stats: AuditStatsResponse }) {
	const { t } = useTranslation()

	return (
		<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
			<InsightCard
				title={t('audit.insights.topEvents')}
				empty={stats.top_event_types.length === 0}
			>
				{stats.top_event_types.map((item) => (
					<div
						key={item.event_type}
						className='flex items-center justify-between'
					>
						<span className='text-sm'>
							{t(`audit.eventTypes.${item.event_type}`, {
								defaultValue: item.event_type
							})}
						</span>
						<Badge variant='secondary'>
							{item.count.toLocaleString('vi-VN')}
						</Badge>
					</div>
				))}
			</InsightCard>

			<InsightCard
				title={t('audit.insights.topActors')}
				empty={stats.recent_actors.length === 0}
			>
				{stats.recent_actors.map((a) => (
					<div
						key={a.actor_id}
						className='flex items-center justify-between'
					>
						<div className='flex items-center gap-2'>
							<User className='text-muted-foreground h-3.5 w-3.5' />
							<span className='text-sm'>ID {a.actor_id}</span>
							<Badge variant='outline' className='h-5 text-xs'>
								{a.actor_role
									? t(`roles.${a.actor_role}`, {
											defaultValue: a.actor_role
										})
									: '—'}
							</Badge>
						</div>
						<Badge variant='secondary'>
							{a.count.toLocaleString('vi-VN')}
						</Badge>
					</div>
				))}
			</InsightCard>
		</div>
	)
}
