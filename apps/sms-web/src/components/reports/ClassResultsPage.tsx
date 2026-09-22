import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from '@repo/ui/components/ui/tabs'
import { categoryFromParam } from '@/lib/report/category'
import { resolvePeriod, type PeriodKey } from '@/lib/report/periods'
import type { CourseCategory } from '@/types'
import { PeriodPicker } from './PeriodPicker'
import { ReportEmpty, ReportError, ReportSkeleton } from './ReportStates'
import { SemesterReportView } from './SemesterReportView'
import { useCategories, usePeriods } from './useReport'
import { WarningsBanner } from './WarningsBanner'
import { YearReportView } from './YearReportView'

/** Resolves the class from the URL (idnumber or id) so reloads and deep links work. */
export function ClassResults({ categoryParam }: { categoryParam: string }) {
	const { t } = useTranslation()
	const categories = useCategories()

	if (categories.isLoading) {
		return (
			<div className='p-6'>
				<ReportSkeleton />
			</div>
		)
	}
	if (categories.isError) {
		return (
			<div className='p-6'>
				<ReportError
					message={categories.error.message}
					onRetry={() => categories.refetch()}
				/>
			</div>
		)
	}
	const category = categoryFromParam(categories.data ?? [], categoryParam)
	if (!category) {
		return (
			<div className='p-6'>
				<ReportEmpty message={t('report.states.classNotFound')} />
			</div>
		)
	}
	return <ClassResultsPage category={category} />
}

export function ClassResultsPage({ category }: { category: CourseCategory }) {
	const { t } = useTranslation()
	const periodsQuery = usePeriods(category.id)
	const [tab, setTab] = useState<'semester' | 'year'>('semester')
	const [wanted, setWanted] = useState<Partial<PeriodKey>>({})

	const periods = periodsQuery.data?.periods ?? []
	const period = resolvePeriod(periods, wanted)
	const unassigned = periodsQuery.data?.unassigned ?? []
	const param = category.idnumber?.trim()
		? category.idnumber
		: String(category.id)

	return (
		<div className='container mx-auto space-y-6 p-6'>
			<header className='space-y-1'>
				<h2 className='ink-in text-3xl font-bold'>
					{t('report.classTitle', { name: category.name })}
				</h2>
				<Link
					to='/khoa-hoc/$categoryIdnumber'
					params={{ categoryIdnumber: param }}
					state={{ category: { id: category.id } }}
					className='text-muted-foreground text-sm underline'
				>
					{t('report.back')}
				</Link>
			</header>

			{periodsQuery.isLoading ? (
				<ReportSkeleton />
			) : periodsQuery.isError ? (
				<ReportError
					message={periodsQuery.error.message}
					onRetry={() => periodsQuery.refetch()}
				/>
			) : (
				<>
					<WarningsBanner
						warnings={[]}
						courses={[]}
						unassigned={unassigned}
					/>
					{!period ? (
						<ReportEmpty message={t('report.states.noPeriods')} />
					) : (
						<Tabs
							value={tab}
							onValueChange={(v) =>
								setTab(v as 'semester' | 'year')
							}
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
								<SemesterReportView
									categoryId={category.id}
									year={period.year}
									semester={period.semester}
								/>
							</TabsContent>
							<TabsContent value='year' className='mt-6'>
								<YearReportView
									categoryId={category.id}
									year={period.year}
								/>
							</TabsContent>
						</Tabs>
					)}
				</>
			)}
		</div>
	)
}
