import type { Column } from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { useEffect, useState, type ChangeEvent } from 'react'
import { useDebounce } from 'react-use'

interface DataTableColumnHeaderProps<TData, TValue>
	extends React.HTMLAttributes<HTMLDivElement> {
	column: Column<TData, TValue>
	title: string
}

export function DataTableColumnHeader<TData, TValue>({
	column,
	title,
	className
}: DataTableColumnHeaderProps<TData, TValue>) {
	if (!column.getCanSort()) {
		return <div className={cn(className)}>{title}</div>
	}

	useEffect(() => {
		const filterValue = (column.getFilterValue() as string) ?? ''
		setSearchValue(filterValue)
	}, [column.getFilterValue()])

	const [searchValue, setSearchValue] = useState(() => {
		return (column.getFilterValue() as string) ?? ''
	})

	useDebounce(
		() => {
			column.setFilterValue(searchValue || undefined)
		},
		300, // 300ms delay
		[searchValue]
	)

	if (!column.getCanSort()) {
		return <div className={cn(className)}>{title}</div>
	}

	function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
		setSearchValue(event.target.value)
	}

	return (
		<div className={cn('flex items-center space-x-2', className)}>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant='ghost'
						size='sm'
						className='-ml-3 h-8 data-[state=open]:bg-accent'
					>
						<span>{title}</span>
						{column.getIsSorted() === 'desc' ? (
							<ArrowDown />
						) : column.getIsSorted() === 'asc' ? (
							<ArrowUp />
						) : (
							<ChevronsUpDown />
						)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start'>
					<Input
						placeholder='Tìm kiếm...'
						value={searchValue}
						onChange={handleSearchChange}
						type='search'
					/>
					<DropdownMenuItem
						onClick={() => column.toggleSorting(false)}
					>
						<ArrowUp className='h-3.5 w-3.5 text-muted-foreground/70' />
						Từ A-Z
					</DropdownMenuItem>
					<DropdownMenuItem
						onClick={() => column.toggleSorting(true)}
					>
						<ArrowDown className='h-3.5 w-3.5 text-muted-foreground/70' />
						Từ Z-A
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onClick={() => column.toggleVisibility(false)}
					>
						<EyeOff className='h-3.5 w-3.5 text-muted-foreground/70' />
						Ẩn cột
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	)
}
