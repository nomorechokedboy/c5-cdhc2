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
import { Check, X, Edit3, Loader2 } from 'lucide-react'
import { EllipsisText } from './data-table/ellipsis-text'

type ToggleInputProps = Omit<JSX.IntrinsicElements['input'], 'placeholder'> & {
	initialValue?: string
	placeholder?: ReactNode
	onSave?: (value: string) => void
	className?: string
	disabled?: boolean
	isLoading?: boolean
	ellipsisMaxWidth?: string
}

export default function ToggleInput({
	initialValue = '',
	placeholder = 'Click to edit...',
	onSave,
	className = '',
	disabled = false,
	isLoading = false,
	onChange,
	ellipsisMaxWidth,
	...inputProps
}: ToggleInputProps) {
	const [isEditing, setIsEditing] = useState(false)
	const [value, setValue] = useState(initialValue)
	const [tempValue, setTempValue] = useState(initialValue)
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		if (isEditing && inputRef.current) {
			inputRef.current.focus()
			inputRef.current.select()
		}
	}, [isEditing])

	const handleSave = () => {
		setValue(tempValue)
		setIsEditing(false)
		onSave?.(tempValue)
	}

	const handleCancel = () => {
		setTempValue(value)
		setIsEditing(false)
	}

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !isLoading) {
			handleSave()
		} else if (e.key === 'Escape' && !isLoading) {
			handleCancel()
		}
	}

	const handleDoubleClick = () => {
		if (!disabled && !isLoading) {
			setIsEditing(true)
			setTempValue(value)
		}
	}

	const handleChange: ChangeEventHandler<HTMLInputElement> = (e) => {
		setTempValue(e.target.value)
		onChange?.(e)
	}

	if (isEditing) {
		return (
			<div className={`flex items-center gap-2 ${className}`}>
				<Input
					{...inputProps}
					ref={inputRef}
					value={tempValue}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onBlur={handleCancel}
					className='flex-1'
					// placeholder={placeholder}
					disabled={disabled || isLoading}
				/>
				{isLoading ? (
					<Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
				) : (
					<>
						<Button
							size='sm'
							variant='ghost'
							onClick={handleSave}
							onMouseDown={(e) => e.preventDefault()} // Prevent input blur on button click
							className='h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50'
							disabled={disabled || isLoading}
						>
							<Check className='h-4 w-4' />
						</Button>
						<Button
							size='sm'
							variant='ghost'
							onClick={handleCancel}
							onMouseDown={(e) => e.preventDefault()} // Prevent input blur on button click
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
				{value || placeholder}
			</EllipsisText>
			{!disabled && !isLoading && (
				<Edit3 className='h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity' />
			)}
			{isLoading && (
				<Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
			)}
		</div>
	)
}
