import { useStore } from '@tanstack/react-form'
import { useFieldContext, useFormContext } from '../hooks/demo.form-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea as ShadcnTextarea } from '@/components/ui/textarea'
import * as ShadcnSelect from '@/components/ui/select'
import { Slider as ShadcnSlider } from '@/components/ui/slider'
import { Switch as ShadcnSwitch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useRef, useState, type JSX, type ReactNode } from 'react'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList
} from '@/components/ui/command'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import {
	AlertCircle,
	Check,
	ChevronsUpDown,
	FileText,
	Paperclip,
	Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import ToggleInput from './toggle-input'
import PasswordInput from './password-input'
import { EllipsisText } from './data-table/ellipsis-text'
import { AvatarUpload, type AvatarUploadProps } from './avatar-upload'
import { Checkbox } from '@/components/ui/checkbox'
import { SearchableSelect } from '@/components/ui/searchable-select'
import UnitSelect, { type UnitSelectProps } from './unit-select'

export function SubscribeButton({
	label,
	form: formProp
}: {
	label: string
	form?: string
}) {
	const form = useFormContext()
	return (
		<form.Subscribe selector={(state) => state.isSubmitting}>
			{(isSubmitting) => (
				<Button type='submit' form={formProp} disabled={isSubmitting}>
					{label}
				</Button>
			)}
		</form.Subscribe>
	)
}

export function ErrorMessages({
	errors
}: {
	errors: Array<string | { message: string }>
}) {
	return (
		<>
			{errors.map((error, idx) => (
				<div
					key={`${typeof error === 'string' ? error : error.message}-${idx}`}
					className='text-destructive mt-1 font-bold'
				>
					{typeof error === 'string' ? error : error.message}
				</div>
			))}
		</>
	)
}

export type TextFieldProps = JSX.IntrinsicElements['input'] & {
	label: string
	/** Nhãn nhỏ, gọn — dùng trong form sửa */
	compact?: boolean
}

/** Nhãn dùng chung: to (form tạo) hoặc gọn (form sửa) */
export function FieldLabel({
	htmlFor,
	compact,
	children
}: {
	htmlFor?: string
	compact?: boolean
	children: ReactNode
}) {
	return (
		<Label
			htmlFor={htmlFor}
			className={cn(
				compact ? 'mb-1 text-sm font-medium' : 'mb-2 text-xl font-bold'
			)}
		>
			{children}
		</Label>
	)
}

export function TextField({
	label,
	className,
	compact,
	...inputProps
}: TextFieldProps) {
	const field = useFieldContext<string>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div className={className}>
			<FieldLabel htmlFor={field.name} compact={compact}>
				{label}
			</FieldLabel>
			{inputProps.type === 'password' ? (
				<PasswordInput
					{...inputProps}
					id={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(e) => field.handleChange(e.target.value)}
				/>
			) : (
				<Input
					{...inputProps}
					id={field.name}
					name={field.name}
					value={field.state.value}
					onBlur={field.handleBlur}
					onChange={(e) => field.handleChange(e.target.value)}
				/>
			)}
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export function TextArea({
	label,
	rows = 3,
	compact,
	className
}: {
	label: string
	rows?: number
	compact?: boolean
	className?: string
}) {
	const field = useFieldContext<string>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div className={className}>
			<FieldLabel htmlFor={label} compact={compact}>
				{label}
			</FieldLabel>
			<ShadcnTextarea
				id={label}
				value={field.state.value}
				onBlur={field.handleBlur}
				rows={rows}
				onChange={(e) => field.handleChange(e.target.value)}
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export function Select({
	label,
	values,
	placeholder,
	defaultValue,
	onChange
}: {
	label: string
	values: Array<{ label: string; value: string }>
	placeholder?: string
	defaultValue?: string
	onChange?: (value: string) => void
}) {
	const field = useFieldContext<string>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div>
			<Label htmlFor={label} className='mb-2 text-xl font-bold'>
				{label}
			</Label>
			<ShadcnSelect.Select
				name={field.name}
				value={field.state.value}
				onValueChange={(value) => {
					field.handleChange(value)
					onChange?.(value)
				}}
				// defaultValue={defaultValue}
				// defaultValue={values[0].value}
			>
				<ShadcnSelect.SelectTrigger className='w-full'>
					<ShadcnSelect.SelectValue placeholder={placeholder} />
				</ShadcnSelect.SelectTrigger>
				<ShadcnSelect.SelectContent>
					<ShadcnSelect.SelectGroup>
						<ShadcnSelect.SelectLabel>
							{label}
						</ShadcnSelect.SelectLabel>
						{values.map((value) => (
							<ShadcnSelect.SelectItem
								key={value.value}
								value={value.value}
							>
								{value.label}
							</ShadcnSelect.SelectItem>
						))}
					</ShadcnSelect.SelectGroup>
				</ShadcnSelect.SelectContent>
			</ShadcnSelect.Select>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export function Slider({ label }: { label: string }) {
	const field = useFieldContext<number>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div>
			<Label htmlFor={label} className='mb-2 text-xl font-bold'>
				{label}
			</Label>
			<ShadcnSlider
				id={label}
				onBlur={field.handleBlur}
				value={[field.state.value]}
				onValueChange={(value) => field.handleChange(value[0])}
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export function Switch({ label }: { label: string }) {
	const field = useFieldContext<boolean>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div>
			<div className='flex items-center gap-2'>
				<ShadcnSwitch
					id={label}
					onBlur={field.handleBlur}
					checked={field.state.value}
					onCheckedChange={(checked) => field.handleChange(checked)}
				/>
				<Label htmlFor={label}>{label}</Label>
			</div>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export function Combobox({
	label,
	values,
	placeholder = 'Select option...',
	defaultValue,
	onChange
}: {
	label: string
	values: Array<{ label: string; value: string }>
	placeholder?: string
	defaultValue?: string
	onChange?: (value: string) => void
}) {
	const [open, setOpen] = useState(false)
	const field = useFieldContext<string>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	const selectedValue = field.state.value
	const selectedLabel = values.find(
		(item) => item.value === selectedValue
	)?.label

	return (
		<div>
			<Label htmlFor={label} className='mb-2 text-xl font-bold'>
				{label}
			</Label>
			<Popover open={open} onOpenChange={setOpen} modal={true}>
				<PopoverTrigger asChild>
					<Button
						variant='outline'
						role='combobox'
						aria-expanded={open}
						className='w-full justify-between bg-transparent'
					>
						{selectedLabel || placeholder}
						<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
					</Button>
				</PopoverTrigger>
				<PopoverContent className='w-full p-0'>
					<Command>
						<CommandInput
							placeholder={`Tìm ${label.toLowerCase()}...`}
						/>
						<CommandList>
							<CommandEmpty>No option found.</CommandEmpty>
							<CommandGroup>
								<ScrollArea>
									{values.map((item) => (
										<CommandItem
											key={item.value}
											value={item.value}
											onSelect={(currentValue) => {
												const newValue =
													currentValue ===
													selectedValue
														? ''
														: currentValue
												field.handleChange(newValue)
												onChange?.(newValue)
												setOpen(false)
											}}
										>
											<Check
												className={cn(
													'mr-2 h-4 w-4',
													selectedValue === item.value
														? 'opacity-100'
														: 'opacity-0'
												)}
											/>
											{item.label}
										</CommandItem>
									))}
								</ScrollArea>
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export type EditableInputProps = JSX.IntrinsicElements['input'] & {
	label: string
	ellipsisMaxWidth?: string
}

export function EditableInput({
	label,
	className,
	ellipsisMaxWidth,
	...inputProps
}: EditableInputProps) {
	const field = useFieldContext<string>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div className={className}>
			<Label htmlFor={label} className='mb-2 text-xl font-bold'>
				{label}
			</Label>
			<ToggleInput
				{...inputProps}
				type='text'
				initialValue={field.state.value}
				ellipsisMaxWidth={ellipsisMaxWidth}
				onChange={(value) => {
					// Update form state immediately on change to clear errors
					field.handleChange(value)
				}}
				onSave={(value) => {
					// Save and trigger blur validation
					field.handleChange(value)
					field.handleBlur()
				}}
				onCancel={() => {
					// Trigger blur when canceling to validate
					field.handleBlur()
				}}
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export type UploadFieldProps = JSX.IntrinsicElements['input'] & {
	label: string
	value?: File | null
	accept?: string
	maxSize?: number // in bytes
	showBrowseButton?: boolean
	browseButtonText?: string
	dragDropText?: string
	browseText?: string
	dragDropSize?: 'small' | 'default'
	/** Nhãn nhỏ, gọn như các field khác của form */
	compact?: boolean
}

export function UploadField({
	label,
	compact,
	value,
	accept,
	maxSize = 10 * 1024 * 1024, // 10MB default
	className,
	showBrowseButton = true,
	browseButtonText = 'Choose file',
	dragDropText = 'Drag & Drop a file here',
	browseText = 'or click to browse files',
	dragDropSize = 'default'
}: UploadFieldProps) {
	const field = useFieldContext<File | null>()
	const errors = useStore(field.store, (s) => s.meta.errors)
	const [isDragOver, setIsDragOver] = useState(false)
	const fileInputRef = useRef<HTMLInputElement>(null)

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(true)
	}

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)
	}

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault()
		setIsDragOver(false)

		const files = Array.from(e.dataTransfer.files)
		if (files.length > 0) {
			const file = files[0]
			if (validateFile(file)) {
				field.handleChange(file)
			}
		}
	}

	const handleFileSelect = () => {
		fileInputRef.current?.click()
	}

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null
		if (file && validateFile(file)) {
			field.handleChange(file)
		} else if (!file) {
			field.handleChange(null)
		}
	}

	const validateFile = (file: File): boolean => {
		if (file.size > maxSize) {
			return false
		}
		return true
	}

	const formatFileSize = (bytes: number): string => {
		return (bytes / 1024 / 1024).toFixed(2) + ' MB'
	}

	return (
		<div className={cn('space-y-4', className)}>
			<FieldLabel htmlFor={label} compact={compact}>
				{label}
			</FieldLabel>

			{/* Browse Button */}
			{showBrowseButton && (
				<div className='flex gap-4 items-center'>
					<Button
						type='button'
						variant='outline'
						onClick={handleFileSelect}
						className='border-2 border-foreground bg-background text-foreground hover:bg-secondary px-8 py-3 text-base font-medium'
					>
						{browseButtonText}
					</Button>
				</div>
			)}

			{/* Hidden file input */}
			<Input
				ref={fileInputRef}
				type='file'
				className='hidden'
				accept={accept}
				onChange={handleFileChange}
				onBlur={field.handleBlur}
			/>

			{/* Drag and Drop Area */}

			<div
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={handleFileSelect}
				className={cn(
					`bg-background ${dragDropSize === 'default' ? 'border-2 border-foreground p-8 text-center' : ''} cursor-pointer transition-colors duration-200',
                    isDragOver && 'bg-secondary`,
					value && 'border-primary'
				)}
			>
				{dragDropSize === 'default' && (
					<div className='flex flex-col items-center gap-3'>
						<Upload />
						<p className='text-foreground font-medium text-lg'>
							{dragDropText}
						</p>
						<p className='text-muted-foreground'>{browseText}</p>
					</div>
				)}
				{dragDropSize === 'small' && (
					<div className='flex items-center gap-3 py-1'>
						<Paperclip />
						<EllipsisText>
							{field.state.value === null
								? 'Chọn hoặc kéo thả để tải lên'
								: field.state.value.name}
						</EllipsisText>
					</div>
				)}
			</div>

			{/* Selected File Display */}
			{value && (
				<div className='border-2 border-foreground bg-background p-4'>
					<div className='flex items-center gap-3'>
						<FileText />
						<div className='flex-1'>
							<p className='font-medium text-foreground'>
								{value.name}
							</p>
							<p className='text-sm text-muted-foreground'>
								{formatFileSize(value.size)}
							</p>
						</div>
					</div>
				</div>
			)}

			{/* Error Display */}
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export type AvatarField = Omit<
	AvatarUploadProps,
	'onChange' | 'onBlur' | 'enableUpload'
> & {
	maxSize?: number
	label?: string
}

export function AvatarField({
	label,
	maxSize = 2 * 1024 * 1024,
	...props
}: AvatarField) {
	const field = useFieldContext<File | null>()
	const errors = useStore(field.store, (s) => s.meta.errors)
	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] || null
		if (file && validateFile(file)) {
			field.handleChange(file)
		} else if (!file) {
			field.handleChange(null)
		}
	}

	const validateFile = (file: File): boolean => {
		if (file.size > maxSize) {
			return false
		}
		return true
	}

	return (
		<div className='space-y-4'>
			{label !== undefined && (
				<Label htmlFor={label} className='mb-2 text-xl font-bold'>
					{label}
				</Label>
			)}
			<AvatarUpload
				{...props}
				onChange={handleFileChange}
				onBlur={field.handleBlur}
				id={label}
				enableUpload
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

type FieldValue = string | number | boolean | null | undefined

export type NumberFieldProps = {
	label: string
	compact?: boolean
	className?: string
	min?: number
	max?: number
}

/** Ô số: giá trị trong form là number (rỗng → undefined), input luôn nhận string */
export function NumberField({
	label,
	compact,
	className,
	min,
	max
}: NumberFieldProps) {
	const field = useFieldContext<number | string | null | undefined>()
	const errors = useStore(field.store, (state) => state.meta.errors)
	const value = field.state.value

	return (
		<div className={className}>
			<FieldLabel htmlFor={field.name} compact={compact}>
				{label}
			</FieldLabel>
			<Input
				id={field.name}
				name={field.name}
				type='number'
				inputMode='numeric'
				min={min}
				max={max}
				value={
					value === null || value === undefined ? '' : String(value)
				}
				onBlur={field.handleBlur}
				onChange={(e) => {
					const raw = e.target.value
					if (raw === '') return field.handleChange(undefined)
					const n = Number(raw)
					if (Number.isFinite(n)) field.handleChange(n)
				}}
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export type SelectFieldProps = {
	label: string
	options: Array<{ label: string; value: string; keywords?: string }>
	placeholder?: string
	compact?: boolean
	className?: string
	onChange?: (value: string) => void
}

/**
 * Select có tìm kiếm. Giá trị field có thể là string / number / null:
 * luôn so khớp theo String(value) nên không bị trống khi kiểu dữ liệu lệch.
 */
export function SelectField({
	label,
	options,
	placeholder,
	compact,
	className,
	onChange
}: SelectFieldProps) {
	const field = useFieldContext<FieldValue>()
	const errors = useStore(field.store, (state) => state.meta.errors)
	const current = field.state.value
	const value =
		current === null || current === undefined ? '' : String(current)

	return (
		<div className={className}>
			<FieldLabel htmlFor={field.name} compact={compact}>
				{label}
			</FieldLabel>
			<SearchableSelect
				options={options}
				value={value}
				compact={compact}
				placeholder={placeholder ?? `Chọn ${label.toLowerCase()}`}
				onValueChange={(v) => {
					field.handleChange(v)
					onChange?.(v)
				}}
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export type UnitFieldProps = Pick<
	UnitSelectProps,
	'level' | 'parentId' | 'placeholder' | 'disabled'
> & {
	label: string
	compact?: boolean
	className?: string
}

/** Chọn đơn vị (lớp mặc định), field lưu id dạng number */
export function UnitField({
	label,
	compact,
	className,
	...unitProps
}: UnitFieldProps) {
	const field = useFieldContext<number | string | null | undefined>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div className={className}>
			<FieldLabel htmlFor={field.name} compact={compact}>
				{label}
			</FieldLabel>
			<UnitSelect
				{...unitProps}
				compact={compact}
				value={field.state.value}
				onChange={(id) => field.handleChange(id)}
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}

export function CheckboxField({
	label,
	compact,
	className
}: {
	label: string
	compact?: boolean
	className?: string
}) {
	const field = useFieldContext<boolean | null | undefined>()

	return (
		<div className={cn('flex items-center gap-2', className)}>
			<Checkbox
				id={field.name}
				checked={!!field.state.value}
				onCheckedChange={(val) => field.handleChange(val === true)}
			/>
			<Label
				htmlFor={field.name}
				className={
					compact ? 'text-sm font-medium' : 'text-xl font-bold'
				}
			>
				{label}
			</Label>
		</div>
	)
}
