import { useTranslation } from 'react-i18next'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@repo/ui/components/ui/table'
import type { SemesterReport } from '@/lib/report/types'
import { ConductInput } from './ConductInput'
import {
	BandCell,
	ConductLabelCell,
	ConductScoreCell,
	RankCell,
	ScoreCell
} from './cells'

interface ReportTableProps {
	report: SemesterReport
	/** When given, the rèn luyện column is an input that reports changes. */
	onSaveConduct?: (studentId: number, score: number | null) => void
}

const GROUP_EDGE = 'border-rule border-l'

/** Sổ điểm của một học kỳ: mỗi học viên một dòng, mỗi học phần một cột. */
export function ReportTable({ report, onSaveConduct }: ReportTableProps) {
	const { t } = useTranslation()
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
					<TableHead
						colSpan={report.courses.length}
						className={`${GROUP_EDGE} text-center`}
					>
						{t('report.col.courses')}
					</TableHead>
					<TableHead
						colSpan={5}
						className={`${GROUP_EDGE} text-center`}
					>
						{t('report.col.summary')}
					</TableHead>
				</TableRow>
				<TableRow className='hover:bg-transparent'>
					{report.courses.map((c, i) => (
						<TableHead
							key={c.id}
							title={c.fullname}
							className={`text-center ${i === 0 ? GROUP_EDGE : ''}`}
						>
							{c.shortname}
							<span className='text-muted-foreground block text-xs font-normal'>
								{t('report.col.credits', { count: c.credits })}
							</span>
						</TableHead>
					))}
					<TableHead className={`${GROUP_EDGE} text-center`}>
						{t('report.col.gpa')}
					</TableHead>
					<TableHead>{t('report.col.classification')}</TableHead>
					<TableHead className='text-center'>
						{t('report.col.rank')}
					</TableHead>
					<TableHead className='text-center'>
						{t('report.col.conduct')}
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
						{report.courses.map((c, j) => (
							<ScoreCell
								key={c.id}
								value={s.scores[String(c.id)] ?? null}
								className={j === 0 ? GROUP_EDGE : undefined}
							/>
						))}
						<ScoreCell
							value={s.gpa}
							className={`${GROUP_EDGE} font-semibold`}
						/>
						<BandCell band={s.classification} />
						<RankCell rank={s.rank} />
						{onSaveConduct ? (
							<TableCell className='text-center'>
								<ConductInput
									value={s.conduct?.score ?? null}
									ariaLabel={t('report.conduct.for', {
										name: s.fullname
									})}
									onSave={(score) =>
										onSaveConduct(s.id, score)
									}
								/>
							</TableCell>
						) : (
							<ConductScoreCell conduct={s.conduct} />
						)}
						<ConductLabelCell conduct={s.conduct} />
					</TableRow>
				))}
			</TableBody>
		</Table>
	)
}
