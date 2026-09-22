import { useTranslation } from 'react-i18next'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@repo/ui/components/ui/select'
import {
	resolvePeriod,
	semestersOf,
	yearsOf,
	type PeriodKey
} from '@/lib/report/periods'

interface PeriodPickerProps {
	periods: PeriodKey[]
	value: PeriodKey
	withSemester: boolean
	onChange: (period: PeriodKey) => void
}

export function PeriodPicker({
	periods,
	value,
	withSemester,
	onChange
}: PeriodPickerProps) {
	const { t } = useTranslation()
	return (
		<div className='flex flex-wrap items-center gap-3'>
			<Select
				value={String(value.year)}
				onValueChange={(year) =>
					onChange(
						resolvePeriod(periods, { year: Number(year) }) ?? value
					)
				}
			>
				<SelectTrigger
					aria-label={t('report.pickYear')}
					className='w-36'
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{yearsOf(periods).map((y) => (
						<SelectItem key={y} value={String(y)}>
							{t('report.year', { number: y })}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{withSemester && (
				<Select
					value={String(value.semester)}
					onValueChange={(semester) =>
						onChange({
							year: value.year,
							semester: Number(semester)
						})
					}
				>
					<SelectTrigger
						aria-label={t('report.pickSemester')}
						className='w-36'
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{semestersOf(periods, value.year).map((s) => (
							<SelectItem key={s} value={String(s)}>
								{t('report.semester', { number: s })}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}
		</div>
	)
}
