import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import type { StudentRow, YearReport } from '@/lib/report/types'
import {
	BandCell,
	ConductLabelCell,
	ConductScoreCell,
	RankCell,
	ScoreCell
} from './cells'

const GROUP_EDGE = 'border-rule border-l'

/** Sổ điểm cả năm: mỗi học kỳ một nhóm (ĐTB và rèn luyện), rồi tổng kết năm. */
export function YearTable({ report }: { report: YearReport }) {
	const { t } = useTranslation()

	// Rows of each semester by student id, so a student's semester result sits on their row.
	const byPeriod = useMemo(
		() =>
			report.periods.map(
				(p) =>
					new Map<number, StudentRow>(
						p.students.map((s) => [s.id, s])
					)
			),
		[report.periods]
	)

	return (
		<Table>
			<TableHeader>
				<TableRow className='hover:bg-transparent'>
					<TableHead rowSpan={2} className='w-12 text-center'>
						{t('report.col.no')}
					</TableHead>
					<TableHead rowSpan={2}>
						{t('report.col.idnumber')}
					</TableHead>
					<TableHead
						rowSpan={2}
						className='bg-card sticky left-0 z-10'
					>
						{t('report.col.name')}
					</TableHead>
					{report.periods.map((p) => (
						<TableHead
							key={p.semester}
							colSpan={2}
							className={`${GROUP_EDGE} text-center`}
						>
							{t('report.semester', { number: p.semester })}
						</TableHead>
					))}
					<TableHead
						colSpan={5}
						className={`${GROUP_EDGE} text-center`}
					>
						{t('report.col.summary')}
					</TableHead>
				</TableRow>
				<TableRow className='hover:bg-transparent'>
					{report.periods.map((p) => (
						<PeriodHeads key={p.semester} />
					))}
					<TableHead className={`${GROUP_EDGE} text-center`}>
						{t('report.col.gpaYear')}
					</TableHead>
					<TableHead>{t('report.col.classification')}</TableHead>
					<TableHead className='text-center'>
						{t('report.col.rank')}
					</TableHead>
					<TableHead className='text-center'>
						{t('report.col.conductYear')}
					</TableHead>
					<TableHead>{t('report.col.conductLabel')}</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{report.students.map((s, i) => (
					<TableRow key={s.id} className='group/row'>
						<TableCell className='text-muted-foreground text-center'>
							{i + 1}
						</TableCell>
						<TableCell className='whitespace-nowrap'>
							{s.idnumber}
						</TableCell>
						<TableCell className='bg-card group-hover/row:bg-accent sticky left-0 z-10 font-medium whitespace-nowrap'>
							{s.fullname}
						</TableCell>
						{byPeriod.map((rows, k) => {
							const row = rows.get(s.id)
							return (
								<PeriodCells
									key={report.periods[k].semester}
									row={row}
								/>
							)
						})}
						<ScoreCell
							value={s.gpa}
							className={`${GROUP_EDGE} font-semibold`}
						/>
						<BandCell band={s.classification} />
						<RankCell rank={s.rank} />
						<ConductScoreCell conduct={s.conduct} />
						<ConductLabelCell conduct={s.conduct} />
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}

function PeriodHeads() {
	const { t } = useTranslation()
	return (
		<>
			<TableHead className={`${GROUP_EDGE} text-center`}>
				{t('report.col.gpa')}
			</TableHead>
			<TableHead className='text-center'>
				{t('report.col.conduct')}
			</TableHead>
		</>
	)
}

function PeriodCells({ row }: { row: StudentRow | undefined }) {
	return (
		<>
			<ScoreCell value={row?.gpa ?? null} className={GROUP_EDGE} />
			<ConductScoreCell conduct={row?.conduct ?? null} />
		</>
	)
}
