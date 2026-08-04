import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import { ListLeaveLocalities, type LeaveLocality } from '@/api/leave'
import { Button } from '@/components/ui/button'
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
import { cn } from '@/lib/utils'

export interface LocalityOption {
	/** Giá trị lưu: "Xã A, Tỉnh B" */
	path: string
	wardName: string
	provinceName: string
	wardId: number
	provinceId: number
}

function buildOptions(tree: LeaveLocality[]): LocalityOption[] {
	const out: LocalityOption[] = []
	for (const province of tree) {
		if (province.level !== 'province') continue
		const wards = province.children || []
		if (!wards.length) {
			// province-only selectable
			out.push({
				path: province.name,
				wardName: '',
				provinceName: province.name,
				wardId: 0,
				provinceId: province.id
			})
			continue
		}
		for (const ward of wards) {
			out.push({
				path: `${ward.name}, ${province.name}`,
				wardName: ward.name,
				provinceName: province.name,
				wardId: ward.id,
				provinceId: province.id
			})
		}
	}
	return out
}

interface Props {
	value: string
	onChange: (path: string) => void
	placeholder?: string
	disabled?: boolean
}

export default function LocalityPicker({
	value,
	onChange,
	placeholder = 'Chọn xã/phường…',
	disabled
}: Props) {
	const [open, setOpen] = useState(false)
	const { data: tree = [], isLoading } = useQuery({
		queryKey: ['leave-localities-tree'],
		queryFn: () => ListLeaveLocalities({ tree: true })
	})

	const options = useMemo(() => buildOptions(tree), [tree])

	return (
		<div className='flex gap-1'>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type='button'
						variant='outline'
						role='combobox'
						aria-expanded={open}
						disabled={disabled || isLoading}
						className='w-full justify-between font-normal'
					>
						<span
							className={cn(
								'truncate',
								!value && 'text-muted-foreground'
							)}
						>
							{value ||
								(isLoading
									? 'Đang tải địa phương…'
									: placeholder)}
						</span>
						<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
					</Button>
				</PopoverTrigger>
				<PopoverContent
					className='w-[var(--radix-popover-trigger-width)] p-0'
					align='start'
				>
					<Command>
						<CommandInput placeholder='Tìm tỉnh / xã / phường…' />
						<CommandList>
							<CommandEmpty>
								{options.length === 0
									? 'Chưa có địa phương — hãy import danh sách xã'
									: 'Không tìm thấy'}
							</CommandEmpty>
							<CommandGroup>
								{options.map((o) => (
									<CommandItem
										key={`${o.provinceId}-${o.wardId}-${o.path}`}
										value={`${o.wardName} ${o.provinceName} ${o.path}`}
										onSelect={() => {
											onChange(o.path)
											setOpen(false)
										}}
									>
										<Check
											className={cn(
												'mr-2 h-4 w-4',
												value === o.path
													? 'opacity-100'
													: 'opacity-0'
											)}
										/>
										<div className='flex min-w-0 flex-col'>
											<span className='truncate'>
												{o.wardName || o.provinceName}
											</span>
											{o.wardName && (
												<span className='truncate text-xs text-muted-foreground'>
													{o.provinceName}
												</span>
											)}
										</div>
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
			{value ? (
				<Button
					type='button'
					variant='ghost'
					size='icon'
					className='shrink-0'
					onClick={() => onChange('')}
					title='Xóa'
				>
					<X className='h-4 w-4' />
				</Button>
			) : null}
		</div>
	)
}
