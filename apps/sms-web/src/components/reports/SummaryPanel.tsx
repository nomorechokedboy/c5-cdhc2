import { useTranslation } from 'react-i18next'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import { Score } from '@/components/score'
import { BAND_BAR, BANDS, bandKey } from '@/lib/report/labels'
import type { ReportCourse, Summary } from '@/lib/report/types'
import { Dash } from './cells'

const fmt = (v: number | null) => (v === null ? <Dash /> : v.toFixed(2))

interface SummaryPanelProps {
	summary: Summary
	courses?: ReportCourse[]
}

export function SummaryPanel({ summary, courses }: SummaryPanelProps) {
	const { t } = useTranslation()
	const present = BANDS.filter((b) => (summary.byClassification[b] ?? 0) > 0)
	const perCourse = summary.perCourse

	return (
		<section className='space-y-6'>
			<h3 className='text-lg'>{t('report.summary.title')}</h3>

			<div className='divide-rule bg-card flex w-full divide-x overflow-hidden rounded-lg border sm:w-fit'>
				{[
					{
						label: t('report.summary.headcount'),
						value: <>{summary.headcount}</>
					},
					{
						label: t('report.summary.classGpa'),
						value: fmt(summary.classGpa)
					},
					{
						label: t('report.summary.maxGpa'),
						value: fmt(summary.maxGpa)
					}
				].map(({ label, value }) => (
					<div
						key={label}
						className='min-w-0 flex-1 px-4 py-3 sm:min-w-36 sm:px-6'
					>
						<p className='score text-2xl'>{value}</p>
						<p className='text-muted-foreground text-sm'>{label}</p>
					</div>
				))}
			</div>

			<div className='space-y-2'>
				<h4 className='text-sm font-medium'>
					{t('report.summary.distribution')}
				</h4>
				{present.length > 0 && (
					<div className='flex h-4 w-full overflow-hidden rounded-full border'>
						{present.map((b) => (
							<div
								key={b}
								data-band={b}
								className={BAND_BAR[b]}
								style={{
									flexGrow: summary.byClassification[b]
								}}
							/>
						))}
					</div>
				)}
				<ul
					aria-label={t('report.summary.distribution')}
					className='flex flex-wrap gap-x-4 gap-y-1 text-sm'
				>
					{BANDS.map((b) => (
						<li key={b} className='flex items-center gap-1.5'>
							<span
								className={`${BAND_BAR[b]} inline-block h-2.5 w-2.5 rounded-full`}
							/>
							<span>{t(bandKey(b))}</span>
							<span className='score'>
								{summary.byClassification[b] ?? 0}
							</span>
						</li>
					))}
				</ul>
			</div>

			{summary.top.length > 0 && (
				<div className='space-y-2'>
					<h4 className='text-sm font-medium'>
						{t('report.summary.top')}
					</h4>
					<ul
						aria-label={t('report.summary.top')}
						className='space-y-1'
					>
						{summary.top.map((e) => (
							<li
								key={`${e.rank}-${e.fullname}`}
								className='flex items-baseline gap-3'
							>
								<span className='score w-6 text-right'>
									{e.rank}
								</span>
								<span className='flex-1'>{e.fullname}</span>
								<Score value={e.gpa} />
							</li>
						))}
					</ul>
				</div>
			)}

			{courses && perCourse && (
				<div className='space-y-2'>
					<h4 className='text-sm font-medium'>
						{t('report.summary.perCourse')}
					</h4>
					<Table>
						<TableHeader>
							<TableRow className='hover:bg-transparent'>
								<TableHead>
									{t('report.summary.course')}
								</TableHead>
								<TableHead className='text-center'>
									{t('report.summary.mean')}
								</TableHead>
								{BANDS.map((b) => (
									<TableHead key={b} className='text-center'>
										{t(bandKey(b))}
									</TableHead>
								))}
							</TableRow>
						</TableHeader>
						<TableBody>
							{courses.map((c) => {
								const stats = perCourse[String(c.id)]
								return (
									<TableRow key={c.id}>
										<TableCell title={c.fullname}>
											{c.shortname}
										</TableCell>
										<TableCell className='score text-center'>
											{fmt(stats?.mean ?? null)}
										</TableCell>
										{BANDS.map((b) => (
											<TableCell
												key={b}
												className='score text-center'
											>
												{stats?.bands[b] ?? 0}
											</TableCell>
										))}
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</div>
			)}
		</section>
	)
}
