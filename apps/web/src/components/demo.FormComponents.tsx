import { useStore } from '@tanstack/react-form'
import { useFieldContext, useFormContext } from '../hooks/demo.form-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea as ShadcnTextarea } from '@/components/ui/textarea'
import * as ShadcnSelect from '@/components/ui/select'
import { Slider as ShadcnSlider } from '@/components/ui/slider'
import { Switch as ShadcnSwitch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { useState, type JSX } from 'react'
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
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import ToggleInput from './toggle-input'
import PasswordInput from './password-input'

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
					className='text-red-500 mt-1 font-bold'
				>
					{typeof error === 'string' ? error : error.message}
				</div>
			))}
		</>
	)
}

export type TextFieldProps = JSX.IntrinsicElements['input'] & {
	label: string
}

export function TextField({ label, className, ...inputProps }: TextFieldProps) {
	const field = useFieldContext<string>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div className={className}>
			<Label htmlFor={label} className='mb-2 text-xl font-bold'>
				{label}
			</Label>
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
	rows = 3
}: {
	label: string
	rows?: number
}) {
	const field = useFieldContext<string>()
	const errors = useStore(field.store, (state) => state.meta.errors)

	return (
		<div>
			<Label htmlFor={label} className='mb-2 text-xl font-bold'>
				{label}
			</Label>
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
				initialValue={field.state.value}
				value={field.state.value}
				onBlur={field.handleBlur}
				onChange={(e) => field.handleChange(e.target.value)}
				ellipsisMaxWidth={ellipsisMaxWidth}
				type='text'
			/>
			{field.state.meta.isTouched && <ErrorMessages errors={errors} />}
		</div>
	)
}
