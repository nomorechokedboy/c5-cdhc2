import * as React from 'react'
import { Check, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
	CommandSeparator
} from '@/components/ui/command'
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'

export type Option = {
	label: string
	value: string
	icon?: React.ComponentType<{ className?: string }>
	key?: React.Key
}

export type GroupedOption = {
	label: string
	options: Option[]
}

export interface FacetedFilterUIProps {
	title?: string
	options: (Option | GroupedOption)[]
	selectedValues: Set<string>
	facets?: Map<any, number>
	onSelect: (value: string, isSelected: boolean) => void
	onClear: () => void
}

function isGroup(opt: Option | GroupedOption): opt is GroupedOption {
	return (opt as GroupedOption).options !== undefined
}

export default function FacetedFilter({
	title,
	options,
	selectedValues,
	facets,
	onSelect,
	onClear
}: FacetedFilterUIProps) {
	const renderOption = (option: Option) => {
		const isSelected = selectedValues.has(option.value)
		return (
			<CommandItem
				key={option.key ?? option.value}
				onSelect={() => onSelect(option.value, isSelected)}
			>
				<div
					className={cn(
						'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
						isSelected
							? 'bg-primary text-primary-foreground'
							: 'opacity-50 [&_svg]:invisible'
					)}
				>
					<Check />
				</div>
				{option.icon && (
					<option.icon className='mr-2 h-4 w-4 text-muted-foreground' />
				)}
				<span>{option.label}</span>
				{facets?.get(option.value) && (
					<span className='ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs'>
						{facets.get(option.value)}
					</span>
				)}
			</CommandItem>
		)
	}

	const flatOptions: Option[] = options.flatMap((opt) =>
		isGroup(opt) ? opt.options : opt
	)

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					size='sm'
					className='h-8 border-dashed'
				>
					<PlusCircle />
					{title}
					{selectedValues?.size > 0 && (
						<>
							<Separator
								orientation='vertical'
								className='mx-2 h-4'
							/>
							<Badge
								variant='secondary'
								className='rounded-sm px-1 font-normal lg:hidden'
							>
								{selectedValues.size}
							</Badge>
							<div className='hidden space-x-1 lg:flex'>
								{selectedValues.size > 2 ? (
									<Badge
										variant='secondary'
										className='rounded-sm px-1 font-normal'
									>
										{selectedValues.size} selected
									</Badge>
								) : (
									Array.from(selectedValues).map((value) => {
										const found = flatOptions.find(
											(o) => o.value === value
										)
										return (
											found && (
												<Badge
													variant='secondary'
													key={
														found.key ?? found.value
													}
													className='rounded-sm px-1 font-normal'
												>
													{found.label}
												</Badge>
											)
										)
									})
								)}
							</div>
						</>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-[240px] p-0' align='start'>
				<Command>
					<CommandInput placeholder={title} />
					<CommandList>
						<CommandEmpty>No results found.</CommandEmpty>

						{options.map((opt, idx) =>
							isGroup(opt) ? (
								<React.Fragment key={idx}>
									<CommandGroup heading={opt.label}>
										{opt.options.map(renderOption)}
									</CommandGroup>
									{idx < options.length - 1 && (
										<CommandSeparator />
									)}
								</React.Fragment>
							) : (
								<CommandGroup key={opt.key ?? opt.value}>
									{renderOption(opt)}
								</CommandGroup>
							)
						)}

						{selectedValues.size > 0 && (
							<>
								<CommandSeparator />
								<CommandGroup>
									<CommandItem
										onSelect={onClear}
										className='justify-center text-center'
									>
										Clear filters
									</CommandItem>
								</CommandGroup>
							</>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	)
}
