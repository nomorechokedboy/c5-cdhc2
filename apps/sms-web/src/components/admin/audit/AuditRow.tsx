import { useState } from 'react'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import { useTranslation } from 'react-i18next'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { TableCell, TableRow } from '@repo/ui/components/ui/table'
import { cn } from '@/lib/utils'
import { OutcomeBadge } from './OutcomeBadge'
import type { AuditEntry } from './types'

dayjs.locale('vi')

const ROW_TINT: Record<AuditEntry['outcome'], string> = {
	success: '',
	failure: 'bg-destructive/5',
	denied: 'bg-warning/5'
}

/** Một dòng nhật ký; có lỗi hoặc chi tiết thì mở rộng được ngay bên dưới. */
export function AuditRow({ entry }: { entry: AuditEntry }) {
	const { t } = useTranslation()
	const [expanded, setExpanded] = useState(false)
	const hasDetail = !!entry.error_msg || !!entry.details

	return (
		<>
			<TableRow className={cn(ROW_TINT[entry.outcome])}>
				<TableCell className='text-muted-foreground text-xs whitespace-nowrap tabular-nums'>
					{dayjs(entry.timestamp).format('DD/MM HH:mm:ss')}
				</TableCell>
				<TableCell className='text-sm font-medium'>
					{t(`audit.eventTypes.${entry.event_type}`, {
						defaultValue: entry.event_type
					})}
				</TableCell>
				<TableCell className='text-xs tabular-nums'>
					{entry.actor_id || '—'}
				</TableCell>
				<TableCell>
					{entry.actor_role ? (
						<Badge variant='outline' className='h-5 text-xs'>
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
				<TableCell className='text-muted-foreground max-w-[240px] truncate font-mono text-xs'>
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
				<TableRow className='hover:bg-transparent'>
					<TableCell colSpan={7} className='bg-muted/40 px-4 py-2'>
						<div className='space-y-1.5'>
							{entry.error_msg && (
								<p className='text-destructive font-mono text-xs'>
									<span className='font-semibold'>
										{t('audit.table.errorLabel')}
									</span>{' '}
									{entry.error_msg}
								</p>
							)}
							{!!entry.details && (
								<pre className='text-muted-foreground bg-muted max-h-32 overflow-auto rounded p-2 text-xs'>
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
