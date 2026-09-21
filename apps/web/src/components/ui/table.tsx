import * as React from 'react'

import { cn } from '@/lib/utils'

function Table({ className, ...props }: React.ComponentProps<'table'>) {
	return (
		<div
			data-slot='table-container'
			className='relative w-full overflow-x-auto'
		>
			<table
				data-slot='table'
				className={cn(
					'tabular w-full caption-bottom text-[1.05rem] leading-relaxed',
					className
				)}
				{...props}
			/>
		</div>
	)
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
	return (
		<thead
			data-slot='table-header'
			className={cn('bg-muted/60 [&_tr]:border-b-2', className)}
			{...props}
		/>
	)
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
	return (
		<tbody
			data-slot='table-body'
			className={cn(
				// Sổ kẻ dòng: cứ 5 dòng có một đường đậm hơn, như giấy kẻ ô điện tim
				'[&_tr:last-child]:border-0 [&_tr:nth-child(5n):not(:last-child)]:border-b-2 [&_tr:nth-child(5n):not(:last-child)]:border-b-foreground/20',
				className
			)}
			{...props}
		/>
	)
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
	return (
		<tfoot
			data-slot='table-footer'
			className={cn(
				'bg-muted/50 border-t font-medium [&>tr]:last:border-b-0',
				className
			)}
			{...props}
		/>
	)
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
	return (
		<tr
			data-slot='table-row'
			className={cn(
				'hover:bg-accent/50 data-[state=selected]:bg-accent border-b transition-colors',
				className
			)}
			{...props}
		/>
	)
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
	return (
		<th
			data-slot='table-head'
			className={cn(
				'text-foreground font-display h-11 px-3.5 text-left align-middle font-semibold tracking-wide whitespace-nowrap text-[1.1rem] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
				className
			)}
			{...props}
		/>
	)
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
	return (
		<td
			data-slot='table-cell'
			className={cn(
				'p-3.5 align-middle whitespace-nowrap text-[1.05rem] [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
				className
			)}
			{...props}
		/>
	)
}

function TableCaption({
	className,
	...props
}: React.ComponentProps<'caption'>) {
	return (
		<caption
			data-slot='table-caption'
			className={cn('text-muted-foreground mt-4 text-sm', className)}
			{...props}
		/>
	)
}

export {
	Table,
	TableHeader,
	TableBody,
	TableFooter,
	TableHead,
	TableRow,
	TableCell,
	TableCaption
}
