import { useTranslation } from 'react-i18next'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle
} from '@repo/ui/components/ui/card'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import { Score } from '@/components/score'
import { bandKey, conductKey } from '@/lib/report/labels'
import type { Band, Conduct, MySemester, MyYear } from '@/lib/report/types'
import { Dash, ScoreCell } from './cells'

function ResultHead({
	gpa,
	band,
	conduct
}: {
	gpa: number | null
	band: Band | null
	conduct: Conduct | null
}) {
	const { t } = useTranslation()
	return (
		<div className='flex flex-wrap items-end gap-x-10 gap-y-3'>
			<div>
				<p className='text-muted-foreground text-sm'>
					{t('report.col.gpa')}
				</p>
				{gpa === null ? (
					<Dash />
				) : (
					<Score value={gpa} className='total-rule text-4xl' />
				)}
			</div>
			<div>
				<p className='text-muted-foreground text-sm'>
					{t('report.col.classification')}
				</p>
				<p className='text-lg'>{band ? t(bandKey(band)) : <Dash />}</p>
			</div>
			<div>
				<p className='text-muted-foreground text-sm'>
					{t('report.mine.conduct')}
				</p>
				<p className='text-lg'>
					{conduct ? (
						<>
							<span className='score'>
								{conduct.score.toFixed(1)}
							</span>{' '}
							<span>{t(conductKey(conduct.label))}</span>
						</>
					) : (
						<Dash />
					)}
				</p>
			</div>
		</div>
	)
}

const rankText = (
	t: (key: string, o?: Record<string, unknown>) => string,
	rank: number | null,
	ranked: number
) =>
	rank === null
		? t('report.mine.notRanked')
		: t('report.mine.rankOf', { rank, ranked })

export function MySemesterCard({ data }: { data: MySemester }) {
	const { t } = useTranslation()
	const { row } = data
	return (
		<Card>
			<CardHeader>
				<CardTitle>
					{t('report.semester', { number: data.semester })},{' '}
					{t('report.year', { number: data.year })}
				</CardTitle>
				<CardDescription>
					{rankText(t, row.rank, data.ranked)}
				</CardDescription>
			</CardHeader>
			<CardContent className='space-y-5'>
				<ResultHead
					gpa={row.gpa}
					band={row.classification}
					conduct={row.conduct}
				/>
				<Table>
					<TableHeader>
						<TableRow className='hover:bg-transparent'>
							<TableHead>{t('report.summary.course')}</TableHead>
							<TableHead className='text-center'>
								{t('report.mine.credits')}
							</TableHead>
							<TableHead className='text-center'>
								{t('report.col.gpa')}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data.courses.map((c) => (
							<TableRow key={c.id}>
								<TableCell>{c.fullname}</TableCell>
								<TableCell className='score text-center'>
									{c.credits}
								</TableCell>
								<ScoreCell
									value={row.scores[String(c.id)] ?? null}
								/>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	)
}

export function MyYearCard({ data }: { data: MyYear }) {
	const { t } = useTranslation()
	const { row } = data
	return (
		<div className='space-y-6'>
			<Card>
				<CardHeader>
					<CardTitle>
						{t('report.mine.yearTitle', { number: data.year })}
					</CardTitle>
					<CardDescription>
						{rankText(t, row.rank, data.ranked)}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<ResultHead
						gpa={row.gpa}
						band={row.classification}
						conduct={row.conduct}
					/>
				</CardContent>
			</Card>
			<div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
				{data.periods.map((p) => (
					<MySemesterCard key={p.semester} data={p} />
				))}
			</div>
		</div>
	)
}
