import type React from 'react'
import {
	useState,
	useRef,
	useEffect,
	type ReactNode,
	type JSX,
	type ChangeEventHandler
} from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue
} from '@/components/ui/select'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/components/ui/command'
import { Calendar } from '@/components/ui/calendar'
import {
	Check,
	X,
	Edit3,
	Loader2,
	Calendar as CalendarIcon,
	ChevronDown,
	ChevronsUpDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import dayjs from 'dayjs'
import { EllipsisText } from './data-table/ellipsis-text'
import { ScrollArea } from '@/components/ui/scroll-area'

// Types
type Option = {
	value: string
	label: string
}

export type InputType = 'text' | 'date' | 'select' | 'combobox'

// Base props that are common to all input types
type BaseToggleInputProps = {
	placeholder?: ReactNode
	className?: string
	disabled?: boolean
	isLoading?: boolean
	ellipsisMaxWidth?: string
}

// Type-specific props using conditional types
type TypeSpecificProps<T extends InputType> = T extends 'text'
	? {
			type: 'text'
			initialValue?: string
			onSave?: (value: string) => void
		} & Omit<
			JSX.IntrinsicElements['input'],
			'placeholder' | 'type' | 'value' | 'onChange'
		>
	: T extends 'date'
		? {
				type: 'date'
				initialValue?: Date | null
				onSave?: (value: Date | null) => void
				dateFormat?: string
			}
		: T extends 'select'
			? {
					type: 'select'
					initialValue?: string
					onSave?: (value: string) => void
					options: Option[] // Required for select
				}
			: T extends 'combobox'
				? {
						type: 'combobox'
						initialValue?: string
						onSave?: (value: string) => void
						options: Option[] // Required for combobox
						searchPlaceholder?: string
						emptyMessage?: string
						allowCustomValue?: boolean
					}
				: never

// Final props type using generics
export type ToggleInputProps<T extends InputType = InputType> =
	BaseToggleInputProps & TypeSpecificProps<T>

export default function ToggleInput<T extends InputType>(
	props: ToggleInputProps<T>
) {
	const {
		type,
		initialValue,
		placeholder = 'Click to edit...',
		onSave,
		className = '',
		disabled = false,
		isLoading = false,
		ellipsisMaxWidth,
		...restProps
	} = props

	const [isEditing, setIsEditing] = useState(false)
	const [value, setValue] = useState(
		initialValue ?? (type === 'date' ? null : '')
	)
	const [tempValue, setTempValue] = useState(
		initialValue ?? (type === 'date' ? null : '')
	)
	const [isPopoverOpen, setIsPopoverOpen] = useState(false)
	const inputRef = useRef<HTMLInputElement>(null)

	// Focus input when editing starts (text input only)
	useEffect(() => {
		if (isEditing && type === 'text' && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isEditing, type])

	// Common handlers
	const handleSave = () => {
		setValue(tempValue)
		setIsEditing(false)
		setIsPopoverOpen(false)
		onSave?.(tempValue)
	}

	const handleCancel = () => {
		setTempValue(value)
		setIsEditing(false)
		setIsPopoverOpen(false)
	}

	const handleDoubleClick = () => {
		if (!disabled && !isLoading) {
			setIsEditing(true)
			setTempValue(value)
			if (type === 'date' || type === 'combobox') {
				setIsPopoverOpen(true)
			}
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !isLoading && type === 'text') {
			handleSave()
		} else if (e.key === 'Escape' && !isLoading) {
			handleCancel()
		}
	}

	// Type-specific handlers
	const handleTextChange: ChangeEventHandler<HTMLInputElement> = (e) => {
		setTempValue(e.target.value)
		if (type === 'text' && 'onChange' in restProps) {
			restProps.onChange?.(e)
		}
	}

	const handleDateSelect = (date: Date | undefined) => {
		setTempValue(date || null)
		setIsPopoverOpen(false)
	}

	const handleSelectChange = (newValue: string) => {
		setTempValue(newValue)
	}

	const handleComboboxSelect = (selectedValue: string) => {
		setTempValue(selectedValue)
		setIsPopoverOpen(false)
	}

	// Display value formatters
	const getDisplayValue = () => {
		if (!value) return placeholder

		switch (type) {
			case 'text':
				return value
			case 'date': {
				const dateFormat =
					(props as TypeSpecificProps<'date'>).dateFormat ||
					'MMMM D, YYYY'
				return value
					? dayjs(value as Date).format(dateFormat)
					: placeholder
			}
			case 'select':
			case 'combobox': {
				const options = (
					props as
						| TypeSpecificProps<'select'>
						| TypeSpecificProps<'combobox'>
				).options
				const option = options.find((opt) => opt.value === value)
				return option?.label || value
			}
			default:
				return value
		}
	}

	// Get display icon
	const getDisplayIcon = () => {
		switch (type) {
			case 'date':
				return (
					<CalendarIcon className='mr-2 h-4 w-4 text-muted-foreground' />
				)
			case 'select':
				return <ChevronDown className='h-4 w-4 text-muted-foreground' />
			case 'combobox':
				return (
					<ChevronsUpDown className='h-4 w-4 text-muted-foreground' />
				)
			default:
				return null
		}
	}

	// Render editing state
	const renderEditingInput = () => {
		switch (type) {
			case 'text':
				return (
					<Input
						{...(restProps as any)}
						ref={inputRef}
						value={tempValue || ''}
						onChange={handleTextChange}
						onKeyDown={handleKeyDown}
						onBlur={handleCancel}
						className='flex-1'
						disabled={disabled || isLoading}
					/>
				)

			case 'date': {
				const dateProps = props as TypeSpecificProps<'date'>
				return (
					<Popover
						open={isPopoverOpen}
						onOpenChange={setIsPopoverOpen}
					>
						<PopoverTrigger asChild>
							<Button
								variant='outline'
								className={cn(
									'flex-1 justify-start text-left font-normal',
									!tempValue && 'text-muted-foreground'
								)}
								disabled={disabled || isLoading}
								onKeyDown={handleKeyDown}
							>
								<CalendarIcon className='mr-2 h-4 w-4' />
								{tempValue
									? dayjs(tempValue as Date).format(
											dateProps.dateFormat ||
												'MMMM D, YYYY'
										)
									: placeholder}
							</Button>
						</PopoverTrigger>
						<PopoverContent className='w-auto p-0' align='start'>
							<Calendar
								mode='single'
								selected={(tempValue as Date) || undefined}
								onSelect={handleDateSelect}
								initialFocus
							/>
						</PopoverContent>
					</Popover>
				)
			}

			case 'select': {
				const selectProps = props as TypeSpecificProps<'select'>
				return (
					<Select
						value={tempValue || ''}
						onValueChange={handleSelectChange}
					>
						<SelectTrigger
							className='flex-1'
							onKeyDown={handleKeyDown}
							disabled={disabled || isLoading}
						>
							<SelectValue placeholder={placeholder as string} />
						</SelectTrigger>
						<SelectContent>
							{selectProps.options.map((option) => (
								<SelectItem
									key={option.value}
									value={option.value}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)
			}

			case 'combobox': {
				const comboboxProps = props as TypeSpecificProps<'combobox'>
				const getComboboxDisplayValue = () => {
					if (!tempValue) return placeholder
					const option = comboboxProps.options.find(
						(opt) => opt.value === tempValue
					)
					return option?.label || tempValue
				}

				return (
					<Popover
						open={isPopoverOpen}
						onOpenChange={setIsPopoverOpen}
						modal={true}
					>
						<PopoverTrigger asChild>
							<Button
								variant='outline'
								role='combobox'
								aria-expanded={isPopoverOpen}
								className={cn(
									'flex-1 justify-between font-normal',
									!tempValue && 'text-muted-foreground'
								)}
								disabled={disabled || isLoading}
								onKeyDown={handleKeyDown}
							>
								{getComboboxDisplayValue()}
								<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
							</Button>
						</PopoverTrigger>
						<PopoverContent className='w-full p-0'>
							<Command>
								<CommandInput
									placeholder={
										comboboxProps.searchPlaceholder ||
										'Search...'
									}
								/>
								<CommandList>
									<CommandEmpty>
										{comboboxProps.emptyMessage ||
											'No options found.'}
									</CommandEmpty>
									<CommandGroup>
										<ScrollArea>
											{comboboxProps.options.map(
												(option) => (
													<CommandItem
														key={option.value}
														value={option.value}
														onSelect={() =>
															handleComboboxSelect(
																option.value
															)
														}
													>
														<Check
															className={cn(
																'mr-2 h-4 w-4',
																tempValue ===
																	option.value
																	? 'opacity-100'
																	: 'opacity-0'
															)}
														/>
														{option.label}
													</CommandItem>
												)
											)}
										</ScrollArea>
									</CommandGroup>
								</CommandList>
							</Command>
						</PopoverContent>
					</Popover>
				)
			}

			default:
				return null
		}
	}

	// Editing state
	if (isEditing) {
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				{renderEditingInput()}
				{isLoading ? (
					<Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
				) : (
					<>
						<Button
							size='sm'
							variant='ghost'
							onClick={handleSave}
							onMouseDown={(e) => e.preventDefault()}
							className='h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50'
							disabled={disabled || isLoading}
						>
							<Check className='h-4 w-4' />
						</Button>
						<Button
							size='sm'
							variant='ghost'
							onClick={handleCancel}
							onMouseDown={(e) => e.preventDefault()}
							className='h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50'
							disabled={disabled || isLoading}
						>
							<X className='h-4 w-4' />
						</Button>
					</>
				)}
			</div>
		)
	}

	// Display state
	return (
		<div
			className={`group flex items-center gap-2 min-h-[40px] px-3 py-2 border border-transparent rounded-md transition-colors ${
				disabled || isLoading
					? 'pointer-events-none opacity-70 cursor-not-allowed'
					: 'cursor-pointer hover:border-border hover:bg-muted/50'
			} ${className}`}
			onDoubleClick={
				disabled || isLoading ? undefined : handleDoubleClick
			}
		>
			<EllipsisText
				className={`flex-1 ${!value ? 'text-muted-foreground' : ''}`}
				maxWidth={ellipsisMaxWidth}
			>
				{getDisplayValue()}
			</EllipsisText>
			<div className='flex items-center gap-1'>
				{(type === 'select' || type === 'combobox') && getDisplayIcon()}
				{!disabled && !isLoading && (
					<Edit3 className='h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity' />
				)}
			</div>
			{isLoading && (
				<Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
			)}
		</div>
	)
}
