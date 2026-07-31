/**
 * Controlled date input (YYYY-MM-DD) with custom calendar:
 * - Header: Tháng | Năm (clickable)
 * - Click month → 12 square month cells
 * - Click year  → 12 square year cells (paged)
 */
import * as React from 'react'
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import dayjs from 'dayjs'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const MONTH_LABELS = [
	'Th1',
	'Th2',
	'Th3',
	'Th4',
	'Th5',
	'Th6',
	'Th7',
	'Th8',
	'Th9',
	'Th10',
	'Th11',
	'Th12'
] as const

const MONTH_FULL = [
	'Tháng 1',
	'Tháng 2',
	'Tháng 3',
	'Tháng 4',
	'Tháng 5',
	'Tháng 6',
	'Tháng 7',
	'Tháng 8',
	'Tháng 9',
	'Tháng 10',
	'Tháng 11',
	'Tháng 12'
] as const

const START_YEAR = 1950
const END_YEAR = dayjs().year() + 20
const YEARS_PER_PAGE = 12

type PickerView = 'days' | 'months' | 'years'

function parseIso(value?: string | null): Date | undefined {
	if (!value) return undefined
	const d = dayjs(value)
	return d.isValid() ? d.toDate() : undefined
}

function toIso(date: Date): string {
	return dayjs(date).format('YYYY-MM-DD')
}

function displayText(value?: string | null): string {
	const d = parseIso(value)
	return d ? dayjs(d).format('DD/MM/YYYY') : ''
}

function GridCell({
	selected,
	onClick,
	children
}: {
	selected?: boolean
	onClick: () => void
	children: React.ReactNode
}) {
	return (
		<button
			type='button'
			onClick={onClick}
			className={cn(
				'flex aspect-square items-center justify-center rounded-md text-sm font-medium transition-colors',
				'hover:bg-accent hover:text-accent-foreground',
				'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
				selected &&
					'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
			)}
		>
			{children}
		</button>
	)
}

function MonthYearHeader({
	month,
	view,
	onOpenMonths,
	onOpenYears,
	onPrev,
	onNext
}: {
	month: Date
	view: PickerView
	onOpenMonths: () => void
	onOpenYears: () => void
	onPrev: () => void
	onNext: () => void
}) {
	const y = month.getFullYear()
	const m = month.getMonth()
	const decadeStart = Math.floor(y / YEARS_PER_PAGE) * YEARS_PER_PAGE

	return (
		<div className='flex items-center justify-between gap-1 px-1 pb-2'>
			<Button
				type='button'
				variant='ghost'
				size='icon'
				className='size-8 shrink-0'
				onClick={onPrev}
				aria-label='Trước'
			>
				<ChevronLeft className='size-4' />
			</Button>

			<div className='flex min-w-0 flex-1 items-center justify-center gap-1'>
				{view === 'years' ? (
					<button
						type='button'
						className='rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent'
						onClick={onOpenYears}
					>
						{decadeStart} – {decadeStart + YEARS_PER_PAGE - 1}
					</button>
				) : (
					<>
						<button
							type='button'
							className={cn(
								'rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent',
								view === 'months' && 'bg-accent'
							)}
							onClick={onOpenMonths}
						>
							{MONTH_FULL[m]}
						</button>
						<button
							type='button'
							className={cn(
								'rounded-md px-2 py-1 text-sm font-semibold hover:bg-accent'
							)}
							onClick={onOpenYears}
						>
							{y}
						</button>
					</>
				)}
			</div>

			<Button
				type='button'
				variant='ghost'
				size='icon'
				className='size-8 shrink-0'
				onClick={onNext}
				aria-label='Sau'
			>
				<ChevronRight className='size-4' />
			</Button>
		</div>
	)
}

export interface DateInputProps {
	value?: string | null
	onChange: (isoDate: string) => void
	placeholder?: string
	disabled?: boolean
	className?: string
	/** id for accessibility */
	id?: string
}

export default function DateInput({
	value,
	onChange,
	placeholder = 'Chọn ngày',
	disabled,
	className,
	id
}: DateInputProps) {
	const [open, setOpen] = React.useState(false)
	const [view, setView] = React.useState<PickerView>('days')
	const selected = parseIso(value)
	const [month, setMonth] = React.useState<Date>(selected || new Date())

	React.useEffect(() => {
		if (selected) setMonth(selected)
	}, [value])

	React.useEffect(() => {
		if (!open) setView('days')
	}, [open])

	const handleNav = (dir: -1 | 1) => {
		if (view === 'days') {
			setMonth((m) => new Date(m.getFullYear(), m.getMonth() + dir, 1))
		} else if (view === 'months') {
			setMonth((m) => new Date(m.getFullYear() + dir, m.getMonth(), 1))
		} else {
			setMonth(
				(m) =>
					new Date(
						m.getFullYear() + dir * YEARS_PER_PAGE,
						m.getMonth(),
						1
					)
			)
		}
	}

	const text = displayText(value)

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type='button'
					variant='outline'
					disabled={disabled}
					className={cn(
						'w-full justify-start text-left font-normal',
						!text && 'text-muted-foreground',
						className
					)}
				>
					<CalendarIcon className='mr-2 h-4 w-4 shrink-0 opacity-70' />
					<span className='truncate'>{text || placeholder}</span>
				</Button>
			</PopoverTrigger>
			<PopoverContent
				className='w-auto overflow-hidden p-3'
				align='start'
				onWheel={(e) => e.stopPropagation()}
			>
				{/* Tháng + Năm luôn trên đầu */}
				<MonthYearHeader
					month={month}
					view={view}
					onOpenMonths={() =>
						setView((v) => (v === 'months' ? 'days' : 'months'))
					}
					onOpenYears={() =>
						setView((v) => (v === 'years' ? 'days' : 'years'))
					}
					onPrev={() => handleNav(-1)}
					onNext={() => handleNav(1)}
				/>

				{view === 'months' && (
					<div className='grid grid-cols-4 gap-1 p-1'>
						{MONTH_LABELS.map((label, i) => (
							<GridCell
								key={label}
								selected={i === month.getMonth()}
								onClick={() => {
									setMonth(
										(m) => new Date(m.getFullYear(), i, 1)
									)
									setView('days')
								}}
							>
								{label}
							</GridCell>
						))}
					</div>
				)}

				{view === 'years' && (
					<div className='grid grid-cols-4 gap-1 p-1'>
						{Array.from({ length: YEARS_PER_PAGE }, (_, i) => {
							const pageStart =
								Math.floor(
									month.getFullYear() / YEARS_PER_PAGE
								) * YEARS_PER_PAGE
							return pageStart + i
						})
							.filter((y) => y >= START_YEAR && y <= END_YEAR)
							.map((y) => (
								<GridCell
									key={y}
									selected={y === month.getFullYear()}
									onClick={() => {
										setMonth(
											(m) => new Date(y, m.getMonth(), 1)
										)
										setView('months')
									}}
								>
									{y}
								</GridCell>
							))}
					</div>
				)}

				{view === 'days' && (
					<Calendar
						mode='single'
						selected={selected}
						month={month}
						onMonthChange={setMonth}
						onSelect={(date) => {
							if (date) {
								onChange(toIso(date))
								setMonth(date)
								setOpen(false)
							}
						}}
						startMonth={new Date(START_YEAR, 0)}
						endMonth={new Date(END_YEAR, 11)}
						classNames={{
							nav: 'hidden',
							month_caption: 'hidden',
							caption_label: 'hidden'
						}}
					/>
				)}
			</PopoverContent>
		</Popover>
	)
}
