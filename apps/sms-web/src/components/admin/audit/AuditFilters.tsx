import { useId, type ReactNode } from 'react'
import { Filter, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@repo/ui/components/ui/badge'
import { Button } from '@repo/ui/components/ui/button'
import { Card, CardContent } from '@repo/ui/components/ui/card'
import { Input } from '@/components/ui/input'
import { EVENT_TYPE_OPTIONS, OUTCOME_OPTIONS } from './options'
import type { Filters } from './types'

const SELECT_CLASS =
	'border-input bg-background h-9 w-full rounded-md border px-3 text-sm'

function Field({
	label,
	id,
	className,
	children
}: {
	label: string
	id: string
	className?: string
	children: ReactNode
}) {
	return (
		<div className={className}>
			<label
				htmlFor={id}
				className='text-muted-foreground mb-1 block text-xs font-medium'
			>
				{label}
			</label>
			{children}
		</div>
	)
}

/** Bộ lọc nhật ký: gõ vào `pending`, bấm «Áp dụng» (hoặc Enter ở ô tìm) mới đổi `active`. */
export function AuditFilters({
	pending,
	onChange,
	activeCount,
	recordCount,
	onApply,
	onClear
}: {
	pending: Filters
	onChange: (patch: Partial<Filters>) => void
	activeCount: number
	recordCount?: number
	onApply: () => void
	onClear: () => void
}) {
	const { t } = useTranslation()
	const id = useId()

	return (
		<Card>
			<CardContent className='space-y-4'>
				<div className='flex items-center gap-2'>
					<Filter className='h-4 w-4' />
					<h2 className='font-serif text-base font-semibold'>
						{t('audit.filter.title')}
					</h2>
					{activeCount > 0 && (
						<Badge variant='secondary' className='text-xs'>
							{t('audit.filter.active', { count: activeCount })}
						</Badge>
					)}
				</div>

				<div className='grid grid-cols-2 gap-3 lg:grid-cols-4'>
					<Field
						label={t('audit.filter.search')}
						id={`${id}-search`}
						className='col-span-2'
					>
						<div className='relative'>
							<Search className='text-muted-foreground absolute top-2.5 left-2.5 h-3.5 w-3.5' />
							<Input
								id={`${id}-search`}
								placeholder={t(
									'audit.filter.searchPlaceholder'
								)}
								value={pending.search}
								onChange={(e) =>
									onChange({ search: e.target.value })
								}
								onKeyDown={(e) =>
									e.key === 'Enter' && onApply()
								}
								className='h-9 pl-8'
							/>
						</div>
					</Field>

					<Field
						label={t('audit.filter.eventType')}
						id={`${id}-event`}
					>
						<select
							id={`${id}-event`}
							className={SELECT_CLASS}
							value={pending.event_type}
							onChange={(e) =>
								onChange({ event_type: e.target.value })
							}
						>
							{EVENT_TYPE_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{t(o.labelKey)}
								</option>
							))}
						</select>
					</Field>

					<Field
						label={t('audit.filter.outcome')}
						id={`${id}-outcome`}
					>
						<select
							id={`${id}-outcome`}
							className={SELECT_CLASS}
							value={pending.outcome}
							onChange={(e) =>
								onChange({ outcome: e.target.value })
							}
						>
							{OUTCOME_OPTIONS.map((o) => (
								<option key={o.value} value={o.value}>
									{t(o.labelKey)}
								</option>
							))}
						</select>
					</Field>

					<Field label={t('audit.filter.actorId')} id={`${id}-actor`}>
						<Input
							id={`${id}-actor`}
							type='number'
							placeholder={t('audit.filter.actorIdPlaceholder')}
							value={pending.actor_id}
							onChange={(e) =>
								onChange({ actor_id: e.target.value })
							}
							className='h-9'
						/>
					</Field>

					<Field label={t('audit.filter.from')} id={`${id}-from`}>
						<Input
							id={`${id}-from`}
							type='datetime-local'
							value={pending.from}
							onChange={(e) => onChange({ from: e.target.value })}
							className='h-9'
						/>
					</Field>

					<Field label={t('audit.filter.to')} id={`${id}-to`}>
						<Input
							id={`${id}-to`}
							type='datetime-local'
							value={pending.to}
							onChange={(e) => onChange({ to: e.target.value })}
							className='h-9'
						/>
					</Field>
				</div>

				<div className='flex items-center gap-2'>
					<Button size='sm' onClick={onApply}>
						<Filter className='h-3.5 w-3.5' />
						{t('audit.filter.apply')}
					</Button>
					{activeCount > 0 && (
						<Button size='sm' variant='ghost' onClick={onClear}>
							<X className='h-3.5 w-3.5' />
							{t('audit.filter.clear')}
						</Button>
					)}
					<span className='text-muted-foreground ml-auto text-xs'>
						{recordCount !== undefined
							? t('audit.filter.recordCount', {
									total: recordCount.toLocaleString('vi-VN')
								})
							: ''}
					</span>
				</div>
			</CardContent>
		</Card>
	)
}
