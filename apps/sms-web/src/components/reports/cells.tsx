import { useTranslation } from 'react-i18next'
import { TableCell } from '@repo/ui/components/ui/table'
import { Score } from '@/components/score'
import { bandKey, conductKey, scoreTone, TONE_CLASS } from '@/lib/report/labels'
import type { Band, Conduct } from '@/lib/report/types'
import { cn } from '@/lib/utils'

export const Dash = () => <span className='text-muted-foreground'>—</span>

export function ScoreCell({
	value,
	className
}: {
	value: number | null
	className?: string
}) {
	return (
		<TableCell
			className={cn(
				'text-center',
				value !== null && TONE_CLASS[scoreTone(value)],
				className
			)}
		>
			{value === null ? <Dash /> : <Score value={value} />}
		</TableCell>
	)
}

export function BandCell({ band }: { band: Band | null }) {
	const { t } = useTranslation()
	return (
		<TableCell className='whitespace-nowrap'>
			{band ? t(bandKey(band)) : <Dash />}
		</TableCell>
	)
}

export function RankCell({ rank }: { rank: number | null }) {
	return (
		<TableCell className='score text-center'>
			{rank === null ? <Dash /> : rank}
		</TableCell>
	)
}

export function ConductScoreCell({ conduct }: { conduct: Conduct | null }) {
	return (
		<TableCell className='score text-center'>
			{conduct ? conduct.score.toFixed(1) : <Dash />}
		</TableCell>
	)
}

export function ConductLabelCell({ conduct }: { conduct: Conduct | null }) {
	const { t } = useTranslation()
	return (
		<TableCell className='whitespace-nowrap'>
			{conduct ? t(conductKey(conduct.label)) : <Dash />}
		</TableCell>
	)
}
