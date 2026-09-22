import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@repo/ui/components/ui/tabs'
import { ReportError as ReportApiError } from '@/api/reports'
import { resolvePeriod, type PeriodKey } from '@/lib/report/periods'
import { MySemesterCard, MyYearCard } from './MyResultCards'
import { PeriodPicker } from './PeriodPicker'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'
import { useMyPeriods, useMySemester, useMyYear } from './useReport'

function useMessage() {
	const { t } = useTranslation()
	return (err: Error) =>
		err instanceof ReportApiError && err.status === 404
			? t('report.mine.noClass')
			: err.message
}

function MySemesterView({ year, semester }: PeriodKey) {
	const message = useMessage()
	const query = useMySemester(year, semester)
	if (query.isLoading) return <ReportSkeleton />
	if (query.isError) {
		return (
			<ReportError
				message={message(query.error)}
				onRetry={() => query.refetch()}
			/>
		)
	}
	return <MySemesterCard data={query.data!} />
}

function MyYearView({ year }: { year: number }) {
	const message = useMessage()
	const query = useMyYear(year)
	if (query.isLoading) return <ReportSkeleton />
	if (query.isError) {
		return (
			<ReportError
				message={message(query.error)}
				onRetry={() => query.refetch()}
			/>
		)
	}
	return <MyYearCard data={query.data!} />
}

export function MyResultsPage() {
	const { t } = useTranslation()
	const message = useMessage()
	const periodsQuery = useMyPeriods()
	const [tab, setTab] = useState<'semester' | 'year'>('semester')
	const [wanted, setWanted] = useState<Partial<PeriodKey>>({})

	const periods = periodsQuery.data?.periods ?? []
	const period = resolvePeriod(periods, wanted)

	return (
		<div className='container mx-auto space-y-6 p-6'>
			<header className='space-y-1'>
				<h2 className='ink-in text-3xl font-bold'>
					{t('report.mine.title')}
				</h2>
				<p className='text-muted-foreground'>
					{t('report.mine.subtitle')}
				</p>
			</header>

			{periodsQuery.isLoading ? (
				<ReportSkeleton />
			) : periodsQuery.isError ? (
				<ReportError
					message={message(periodsQuery.error)}
					onRetry={() => periodsQuery.refetch()}
				/>
			) : !period ? (
				<ReportEmpty message={t('report.states.noPeriods')} />
			) : (
				<Tabs
					value={tab}
					onValueChange={(v) => setTab(v as 'semester' | 'year')}
				>
					<div className='flex flex-wrap items-center justify-between gap-3'>
						<TabsList>
							<TabsTrigger value='semester'>
								{t('report.tabSemester')}
							</TabsTrigger>
							<TabsTrigger value='year'>
								{t('report.tabYear')}
							</TabsTrigger>
						</TabsList>
						<PeriodPicker
							periods={periods}
							value={period}
							withSemester={tab === 'semester'}
							onChange={setWanted}
						/>
					</div>
					<TabsContent value='semester' className='mt-6'>
						<MySemesterView
							year={period.year}
							semester={period.semester}
						/>
					</TabsContent>
					<TabsContent value='year' className='mt-6'>
						<MyYearView year={period.year} />
					</TabsContent>
				</Tabs>
			)}
		</div>
	)
}
