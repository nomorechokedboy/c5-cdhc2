import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { useStore } from '@tanstack/react-form'
import dayjs from 'dayjs'
import { cn } from '@/lib/utils'
import { useFieldContext } from '@/hooks/demo.form-context'
import { ErrorMessages } from './demo.FormComponents'

function formatDate(date: Date | undefined) {
	if (!date) {
		return ''
	}

	const day = date.getDate().toString().padStart(2, '0')
	const month = (date.getMonth() + 1).toString().padStart(2, '0')
	const year = date.getFullYear().toString()

	return `${day}/${month}/${year}`
}

function isValidDate(date: Date | undefined) {
	if (!date) {
		return false
	}
	return !isNaN(date.getTime())
}

function parseDate(dateString: string): Date | undefined {
	if (!dateString) return undefined

	// First try to parse as dd/mm/yyyy format
	const ddmmyyyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/
	const match = dateString.match(ddmmyyyyRegex)

	if (match) {
		const day = parseInt(match[1], 10)
		const month = parseInt(match[2], 10) - 1 // Month is 0-indexed
		const year = parseInt(match[3], 10)

		const date = new Date(year, month, day)

		// Validate that the date is correct (handles invalid dates like 31/02/2023)
		if (
			date.getFullYear() === year &&
			date.getMonth() === month &&
			date.getDate() === day
		) {
			return date
		}
	}

	// Also handle dd/mm/yy format for backward compatibility
	const ddmmyyRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{2})$/
	const yyMatch = dateString.match(ddmmyyRegex)

	if (yyMatch) {
		const day = parseInt(yyMatch[1], 10)
		const month = parseInt(yyMatch[2], 10) - 1
		let year = parseInt(yyMatch[3], 10)

		// Handle 2-digit years (assume 20xx for 00-30, 19xx for 31-99)
		year += year <= 30 ? 2000 : 1900

		const date = new Date(year, month, day)

		if (
			date.getFullYear() === year &&
			date.getMonth() === month &&
			date.getDate() === day
		) {
			return date
		}
	}

	// Fallback to standard Date parsing for other formats
	const date = new Date(dateString)
	return isValidDate(date) ? date : undefined
}

// The day/month/year segments are edited independently so that changing one
// (typing, backspacing, or selecting-and-replacing) never reflows the digits
// of the other segments -- e.g. deleting the "3" in "12/03/1990" must produce
// "12/0/1990", not corrupt the year into "12/01/990" by re-splitting the
// whole digit stream from scratch.
function parseSegments(value: string): { d: string; m: string; y: string } {
	const [d = '', m = '', y = ''] = value.split('/')
	return { d, m, y }
}

function joinSegments(d: string, m: string, y: string): string {
	let out = d
	const needSlash1 = m.length > 0 || y.length > 0 || d.length === 2
	if (needSlash1) out += `/${m}`
	const needSlash2 = needSlash1 && (m.length === 2 || y.length > 0)
	if (needSlash2) out += `/${y}`
	return out
}

// Smallest [start, end) range in `prev` that differs from `next`, found by
// trimming the common prefix and suffix -- works for any single contiguous
// edit: typing, backspace, delete, paste, or select-and-type-over.
function diffRange(prev: string, next: string) {
	let i = 0
	while (i < prev.length && i < next.length && prev[i] === next[i]) i++
	let j = 0
	while (
		j < prev.length - i &&
		j < next.length - i &&
		prev[prev.length - 1 - j] === next[next.length - 1 - j]
	)
		j++
	return { start: i, endPrev: prev.length - j, endNext: next.length - j }
}

function segmentBoundaries(d: string, m: string, y: string) {
	const joined = joinSegments(d, m, y)
	const firstSlash = joined.indexOf('/')
	const hasSlash1 = firstSlash >= 0
	const secondSlash = hasSlash1 ? joined.indexOf('/', firstSlash + 1) : -1
	return {
		joined,
		mRange: hasSlash1
			? ([firstSlash + 1, firstSlash + 1 + m.length] as const)
			: null,
		yRange:
			secondSlash >= 0
				? ([secondSlash + 1, secondSlash + 1 + y.length] as const)
				: null
	}
}

// Whole-date input (paste, autofill, drag-drop, or typing over a selection
// that spans separators). Unlike a single keystroke it carries its own
// structure, so it is reformatted from scratch instead of being spliced into
// one segment of the previous value.
function parseBulkDate(input: string): { d: string; m: string; y: string } {
	if (/\D/.test(input)) {
		const [d = '', m = '', y = ''] = input.split(/\D+/)
		const nd = d.slice(0, 2)
		const nm = m.slice(0, 2)
		const ny = y.slice(0, 4)
		// Fully entered date: pad "5/2/2001" to "05/02/2001"
		if (nd && nm && ny.length === 4) {
			return { d: nd.padStart(2, '0'), m: nm.padStart(2, '0'), y: ny }
		}
		return { d: nd, m: nm, y: ny }
	}
	return {
		d: input.slice(0, 2),
		m: input.slice(2, 4),
		y: input.slice(4, 8)
	}
}

// Reformats an edited dd/mm/yyyy string without letting the edit bleed into
// unrelated segments, and reports where the caret should end up.
function applyDateEdit(
	prevValue: string,
	inputValue: string
): { value: string; cursor: number } {
	// Select-all + delete spans every segment, which the per-segment editing
	// below would only partly clear.
	if (inputValue === '') return { value: '', cursor: 0 }

	const { d, m, y } = parseSegments(prevValue)
	const { joined, mRange, yRange } = segmentBoundaries(d, m, y)
	const { start, endPrev, endNext } = diffRange(joined, inputValue)
	const inserted = inputValue.slice(start, endNext)
	const replacement = inserted.replace(/\D/g, '')
	const isDeletion = inputValue.length < joined.length

	const spansSeparator = joined.slice(start, endPrev).includes('/')
	if (inserted.length > 1 || (inserted.length > 0 && spansSeparator)) {
		const bulk = parseBulkDate(inputValue)
		const value = joinSegments(bulk.d, bulk.m, bulk.y)
		return { value, cursor: value.length }
	}

	let seg: 'd' | 'm' | 'y' = 'd'
	if (mRange && start >= mRange[0]) seg = 'm'
	if (yRange && start >= yRange[0]) seg = 'y'
	// Backspacing right after a slash removes the separator itself, which
	// really means "delete the last digit of the segment before it".
	if (isDeletion && mRange && start === mRange[0] && endPrev <= mRange[0])
		seg = 'd'
	if (isDeletion && yRange && start === yRange[0] && endPrev <= yRange[0])
		seg = 'm'

	const removedOnlySlash =
		isDeletion && joined.slice(start, endPrev) === '/' && replacement === ''

	let nd = d
	let nm = m
	let ny = y
	let localCursor = 0

	function spliceSegment(
		orig: string,
		range: readonly [number, number],
		maxLen: number
	) {
		const localStart = Math.max(0, Math.min(orig.length, start - range[0]))
		const localEnd = Math.max(0, Math.min(orig.length, endPrev - range[0]))
		const next = (
			orig.slice(0, localStart) +
			replacement +
			orig.slice(localEnd)
		).slice(0, maxLen)
		localCursor = Math.min(localStart + replacement.length, next.length)
		return next
	}

	if (removedOnlySlash) {
		if (seg === 'd') {
			nd = d.slice(0, -1)
			localCursor = nd.length
		} else if (seg === 'm') {
			nm = m.slice(0, -1)
			localCursor = nm.length
		}
	} else if (seg === 'd') {
		nd = spliceSegment(d, [0, d.length], 2)
	} else if (seg === 'm') {
		nm = spliceSegment(m, mRange!, 2)
	} else {
		ny = spliceSegment(y, yRange!, 4)
	}

	const value = joinSegments(nd, nm, ny)
	const newBounds = segmentBoundaries(nd, nm, ny)
	const segStart =
		seg === 'd'
			? 0
			: seg === 'm'
				? newBounds.mRange![0]
				: newBounds.yRange![0]

	let cursor = segStart + localCursor
	// Typing forward past a segment that just completed lands the cursor
	// right before the auto-inserted "/" -- hop over it so the next
	// keystroke lands in the next segment instead of pushing the slash
	// further right (this is what let users type through the whole date
	// without clicking into each segment).
	if (!isDeletion && replacement.length > 0) {
		while (value[cursor] === '/') cursor++
	}

	return { value, cursor }
}

// Function to validate if date format is complete and valid
function validateDateFormat(
	value: string,
	label: string,
	optional = false
): string | null {
	// Trường không bắt buộc: để trống là hợp lệ
	if (optional && value.trim() === '') return null

	// Check if format is complete (should be exactly dd/mm/yyyy)
	const ddmmyyyyRegex = /^\d{2}\/\d{2}\/\d{4}$/
	if (!ddmmyyyyRegex.test(value)) {
		return `Hãy nhập ${label} theo định dạng dd/mm/yyyy`
	}

	// Check if it's a valid date
	const date = parseDate(value)
	if (!date) {
		return 'Vui lòng nhập một ngày hợp lệ'
	}

	return null // No error
}

export interface DatePickerProps {
	label: string
	placeholder?: string
	/** Cho phép để trống (không báo lỗi định dạng khi trống) */
	optional?: boolean
	/** Nhãn nhỏ, gọn — dùng trong form sửa */
	compact?: boolean
	className?: string
	id?: string
}

const currentYear = dayjs().year()
const endMonth = new Date(currentYear + 10, 11)

export default function DatePicker({
	label,
	placeholder,
	optional = false,
	compact = false,
	className,
	id
}: DatePickerProps) {
	const field = useFieldContext<string>()
	const errors = useStore(field.store, (state) => state.meta.errors)
	const [open, setOpen] = React.useState(false)
	const inputRef = React.useRef<HTMLInputElement>(null)
	const [localError, setLocalError] = React.useState<string | null>(null)

	// Parse the field value to get the current date
	const currentDate = React.useMemo(() => {
		return parseDate(field.state.value)
	}, [field.state.value])

	const [month, setMonth] = React.useState<Date | undefined>(
		currentDate || new Date()
	)

	// Update month when date changes
	React.useEffect(() => {
		if (currentDate) {
			setMonth(currentDate)
		}
	}, [currentDate])

	// Validate on blur or value change
	const validateInput = React.useCallback(
		(value: string) => {
			const error = validateDateFormat(value, label, optional)
			setLocalError(error)
			return error
		},
		[label, optional]
	)

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value
		const previousValue = field.state.value

		const { value: maskedValue, cursor } = applyDateEdit(
			previousValue,
			inputValue
		)

		// Update field value
		field.handleChange(maskedValue)

		// Clear local error when user is typing (to avoid annoying real-time validation)
		setLocalError(null)

		// Update month if valid date is entered
		const date = parseDate(maskedValue)
		if (date) {
			setMonth(date)
		}

		// Set cursor position after mask is applied
		setTimeout(() => {
			if (inputRef.current) {
				inputRef.current.setSelectionRange(cursor, cursor)
			}
		}, 0)
	}

	const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
		field.handleBlur()
		// Validate on blur
		validateInput(field.state.value)
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault()
			setOpen(true)
		}
		// Backspacing right after a slash is handled by applyDateEdit in
		// handleInputChange (it treats removing the separator as deleting
		// the last digit of the segment before it), so no special-casing
		// is needed here.
	}

	const handleDateSelect = (date: Date | undefined) => {
		if (date) {
			const formattedDate = formatDate(date)
			field.handleChange(formattedDate)
			setMonth(date)
			// Clear error when date is selected from calendar
			setLocalError(null)
		}
		setOpen(false)
	}

	// Combine form errors with local validation errors
	const allErrors = React.useMemo(() => {
		const formErrors = Array.isArray(errors) ? errors : []
		const localErrors = localError ? [localError] : []
		return [...formErrors, ...localErrors]
	}, [errors, localError])

	return (
		<div
			className={cn(
				'flex flex-col',
				compact ? 'gap-1' : 'gap-2',
				className
			)}
		>
			<Label
				htmlFor={field.name}
				className={
					compact ? 'text-sm font-medium' : 'text-xl font-bold'
				}
			>
				{label}
			</Label>
			<div className='relative flex gap-2'>
				<Input
					ref={inputRef}
					id={field.name}
					value={field.state.value}
					placeholder={placeholder || 'Ngày/tháng/năm'}
					className='bg-background pr-10'
					onBlur={handleBlur}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					maxLength={10} // dd/mm/yyyy = 10 characters
				/>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							id={id}
							type='button'
							variant='ghost'
							className='absolute top-1/2 right-2 size-6 -translate-y-1/2'
						>
							<CalendarIcon className='size-3.5' />
							<span className='sr-only'>Select date</span>
						</Button>
					</PopoverTrigger>
					<PopoverContent
						className='w-auto overflow-hidden p-0'
						align='end'
						alignOffset={-8}
						sideOffset={10}
					>
						<Calendar
							mode='single'
							selected={currentDate}
							captionLayout='dropdown'
							month={month}
							onMonthChange={setMonth}
							onSelect={handleDateSelect}
							endMonth={endMonth}
						/>
					</PopoverContent>
				</Popover>
			</div>
			{field.state.meta.isTouched && allErrors.length > 0 && (
				<ErrorMessages errors={allErrors} />
			)}
		</div>
	)
}
