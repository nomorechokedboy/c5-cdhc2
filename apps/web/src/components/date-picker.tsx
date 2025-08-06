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
import { useFieldContext } from '@/hooks/demo.form-context'
import { useStore } from '@tanstack/react-form'
import { ErrorMessages } from './demo.FormComponents'
import dayjs from 'dayjs'

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

// Function to apply date mask formatting
function applyDateMask(value: string, previousValue: string = ''): string {
	// Remove all non-digit characters
	const digitsOnly = value.replace(/\D/g, '')

	// Don't allow more than 8 digits
	const truncated = digitsOnly.slice(0, 8)

	// Apply formatting based on length
	if (truncated.length === 0) return ''
	if (truncated.length <= 2) return truncated
	if (truncated.length <= 4)
		return `${truncated.slice(0, 2)}/${truncated.slice(2)}`
	return `${truncated.slice(0, 2)}/${truncated.slice(2, 4)}/${truncated.slice(4)}`
}

// Function to get cursor position after mask is applied
function getCursorPosition(
	inputValue: string,
	maskedValue: string,
	currentCursor: number
): number {
	// Count digits before cursor position in input
	const digitsBeforeCursor = inputValue
		.slice(0, currentCursor)
		.replace(/\D/g, '').length

	// Find position in masked value that corresponds to the same number of digits
	let digitCount = 0
	let position = 0

	for (let i = 0; i < maskedValue.length; i++) {
		if (/\d/.test(maskedValue[i])) {
			digitCount++
			if (digitCount === digitsBeforeCursor) {
				position = i + 1
				break
			}
		}
		if (digitCount === 0) {
			position = i
		}
	}

	// If we're at the end, place cursor at the end
	if (digitCount < digitsBeforeCursor) {
		position = maskedValue.length
	}

	return position
}

// Function to validate if date format is complete and valid
function validateDateFormat(value: string, label: string): string | null {
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
}

const currentYear = dayjs().year()
const endMonth = new Date(currentYear + 10, 11)

export default function DatePicker({ label, placeholder }: DatePickerProps) {
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
	const validateInput = React.useCallback((value: string) => {
		const error = validateDateFormat(value, label)
		setLocalError(error)
		return error
	}, [])

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const inputValue = e.target.value
		const currentCursor = e.target.selectionStart || 0
		const previousValue = field.state.value

		// Apply mask formatting
		const maskedValue = applyDateMask(inputValue, previousValue)

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
		React.startTransition(() => {
			const newCursorPosition = getCursorPosition(
				inputValue,
				maskedValue,
				currentCursor
			)
			setTimeout(() => {
				if (inputRef.current) {
					inputRef.current.setSelectionRange(
						newCursorPosition,
						newCursorPosition
					)
				}
			}, 0)
		})
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
			return
		}

		// Handle backspace to remove slashes properly
		if (e.key === 'Backspace') {
			const input = e.target as HTMLInputElement
			const cursorPosition = input.selectionStart || 0
			const value = input.value

			// If cursor is right after a slash, move cursor back to delete the digit before slash
			if (cursorPosition > 0 && value[cursorPosition - 1] === '/') {
				e.preventDefault()
				const newValue =
					value.slice(0, cursorPosition - 2) +
					value.slice(cursorPosition)
				const maskedValue = applyDateMask(newValue)
				field.handleChange(maskedValue)

				setTimeout(() => {
					if (inputRef.current) {
						const newCursor = Math.max(0, cursorPosition - 2)
						inputRef.current.setSelectionRange(newCursor, newCursor)
					}
				}, 0)
			}
		}
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
		<div className='flex flex-col gap-2'>
			<Label htmlFor={label} className='text-xl font-bold'>
				{label}
			</Label>
			<div className='relative flex gap-2'>
				<Input
					ref={inputRef}
					id={label}
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
							id='date-picker'
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
