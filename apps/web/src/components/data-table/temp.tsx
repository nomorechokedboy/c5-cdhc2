// index.ts
import * as React from 'react';
import {
        type ColumnDef,
        type ColumnFiltersState,
        type SortingState,
        type VisibilityState,
        flexRender,
        getCoreRowModel,
        getFacetedRowModel,
        getFacetedUniqueValues,
        getFilteredRowModel,
        getPaginationRowModel,
        getSortedRowModel,
        useReactTable,
} from '@tanstack/react-table';

import {
        Table,
        TableBody,
        TableCell,
        TableHead,
        TableHeader,
        TableRow,
} from '@/components/ui/table';

import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';

interface DataTableProps<TData, TValue> {
        columns: ColumnDef<TData, TValue>[];
        data: TData[];
}

export function DataTable<TData, TValue>({
        columns,
        data,
}: DataTableProps<TData, TValue>) {
        const [rowSelection, setRowSelection] = React.useState({});
        const [columnVisibility, setColumnVisibility] =
                React.useState<VisibilityState>({});
        const [columnFilters, setColumnFilters] =
                React.useState<ColumnFiltersState>([]);
        const [sorting, setSorting] = React.useState<SortingState>([]);

        const table = useReactTable({
                data,
                columns,
                state: {
                        sorting,
                        columnVisibility,
                        rowSelection,
                        columnFilters,
                },
                enableRowSelection: true,
                onRowSelectionChange: setRowSelection,
                onSortingChange: setSorting,
                onColumnFiltersChange: setColumnFilters,
                onColumnVisibilityChange: setColumnVisibility,
                getCoreRowModel: getCoreRowModel(),
                getFilteredRowModel: getFilteredRowModel(),
                getPaginationRowModel: getPaginationRowModel(),
                getSortedRowModel: getSortedRowModel(),
                getFacetedRowModel: getFacetedRowModel(),
                getFacetedUniqueValues: getFacetedUniqueValues(),
        });

        return (
                <div className="space-y-4">
                        <DataTableToolbar table={table} />
                        <div className="rounded-md border">
                                <Table>
                                        <TableHeader>
                                                {table
                                                        .getHeaderGroups()
                                                        .map((headerGroup) => (
                                                                <TableRow
                                                                        key={
                                                                                headerGroup.id
                                                                        }
                                                                >
                                                                        {headerGroup.headers.map(
                                                                                (
                                                                                        header
                                                                                ) => {
                                                                                        return (
                                                                                                <TableHead
                                                                                                        key={
                                                                                                                header.id
                                                                                                        }
                                                                                                        colSpan={
                                                                                                                header.colSpan
                                                                                                        }
                                                                                                >
                                                                                                        {header.isPlaceholder
                                                                                                                ? null
                                                                                                                : flexRender(
                                                                                                                          header
                                                                                                                                  .column
                                                                                                                                  .columnDef
                                                                                                                                  .header,
                                                                                                                          header.getContext()
                                                                                                                  )}
                                                                                                </TableHead>
                                                                                        );
                                                                                }
                                                                        )}
                                                                </TableRow>
                                                        ))}
                                        </TableHeader>
                                        <TableBody>
                                                {table.getRowModel().rows
                                                        ?.length ? (
                                                        table
                                                                .getRowModel()
                                                                .rows.map(
                                                                        (
                                                                                row
                                                                        ) => (
                                                                                <TableRow
                                                                                        key={
                                                                                                row.id
                                                                                        }
                                                                                        data-state={
                                                                                                row.getIsSelected() &&
                                                                                                'selected'
                                                                                        }
                                                                                >
                                                                                        {row
                                                                                                .getVisibleCells()
                                                                                                .map(
                                                                                                        (
                                                                                                                cell
                                                                                                        ) => (
                                                                                                                <TableCell
                                                                                                                        key={
                                                                                                                                cell.id
                                                                                                                        }
                                                                                                                >
                                                                                                                        {flexRender(
                                                                                                                                cell
                                                                                                                                        .column
                                                                                                                                        .columnDef
                                                                                                                                        .cell,
                                                                                                                                cell.getContext()
                                                                                                                        )}
                                                                                                                </TableCell>
                                                                                                        )
                                                                                                )}
                                                                                </TableRow>
                                                                        )
                                                                )
                                                ) : (
                                                        <TableRow>
                                                                <TableCell
                                                                        colSpan={
                                                                                columns.length
                                                                        }
                                                                        className="h-24 text-center"
                                                                >
                                                                        No
                                                                        results.
                                                                </TableCell>
                                                        </TableRow>
                                                )}
                                        </TableBody>
                                </Table>
                        </div>
                        <DataTablePagination table={table} />
                </div>
        );
}

// columns.tsx
import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

import { labels, priorities, statuses } from './data/data';
import type { Task } from './data/schema';
import { DataTableColumnHeader } from './data-table-column-header';
import { DataTableRowActions } from './data-table-row-actions';

export const columns: ColumnDef<Task>[] = [
        {
                id: 'select',
                header: ({ table }) => (
                        <Checkbox
                                checked={
                                        table.getIsAllPageRowsSelected() ||
                                        (table.getIsSomePageRowsSelected() &&
                                                'indeterminate')
                                }
                                onCheckedChange={(value) =>
                                        table.toggleAllPageRowsSelected(!!value)
                                }
                                aria-label="Select all"
                                className="translate-y-[2px]"
                        />
                ),
                cell: ({ row }) => (
                        <Checkbox
                                checked={row.getIsSelected()}
                                onCheckedChange={(value) =>
                                        row.toggleSelected(!!value)
                                }
                                aria-label="Select row"
                                className="translate-y-[2px]"
                        />
                ),
                enableSorting: false,
                enableHiding: false,
        },
        {
                accessorKey: 'id',
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Task" />
                ),
                cell: ({ row }) => (
                        <div className="w-[80px]">{row.getValue('id')}</div>
                ),
                enableSorting: false,
                enableHiding: false,
        },
        {
                accessorKey: 'title',
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Title" />
                ),
                cell: ({ row }) => {
                        const label = labels.find(
                                (label) => label.value === row.original.label
                        );

                        return (
                                <div className="flex space-x-2">
                                        {label && (
                                                <Badge variant="outline">
                                                        {label.label}
                                                </Badge>
                                        )}
                                        <span className="max-w-[500px] truncate font-medium">
                                                {row.getValue('title')}
                                        </span>
                                </div>
                        );
                },
        },
        {
                accessorKey: 'status',
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="Status" />
                ),
                cell: ({ row }) => {
                        const status = statuses.find(
                                (status) =>
                                        status.value === row.getValue('status')
                        );

                        if (!status) {
                                return null;
                        }

                        return (
                                <div className="flex w-[100px] items-center">
                                        {status.icon && (
                                                <status.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span>{status.label}</span>
                                </div>
                        );
                },
                filterFn: (row, id, value) => {
                        return value.includes(row.getValue(id));
                },
        },
        {
                accessorKey: 'priority',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Priority"
                        />
                ),
                cell: ({ row }) => {
                        const priority = priorities.find(
                                (priority) =>
                                        priority.value ===
                                        row.getValue('priority')
                        );

                        if (!priority) {
                                return null;
                        }

                        return (
                                <div className="flex items-center">
                                        {priority.icon && (
                                                <priority.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                        )}
                                        <span>{priority.label}</span>
                                </div>
                        );
                },
                filterFn: (row, id, value) => {
                        return value.includes(row.getValue(id));
                },
        },
        {
                id: 'actions',
                cell: ({ row }) => <DataTableRowActions row={row} />,
        },
];

// data-table-column-header.tsx
import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuSeparator,
        DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DataTableColumnHeaderProps<TData, TValue>
        extends React.HTMLAttributes<HTMLDivElement> {
        column: Column<TData, TValue>;
        title: string;
}

export function DataTableColumnHeader<TData, TValue>({
        column,
        title,
        className,
}: DataTableColumnHeaderProps<TData, TValue>) {
        if (!column.getCanSort()) {
                return <div className={cn(className)}>{title}</div>;
        }

        return (
                <div className={cn('flex items-center space-x-2', className)}>
                        <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                        <Button
                                                variant="ghost"
                                                size="sm"
                                                className="-ml-3 h-8 data-[state=open]:bg-accent"
                                        >
                                                <span>{title}</span>
                                                {column.getIsSorted() ===
                                                'desc' ? (
                                                        <ArrowDown />
                                                ) : column.getIsSorted() ===
                                                  'asc' ? (
                                                        <ArrowUp />
                                                ) : (
                                                        <ChevronsUpDown />
                                                )}
                                        </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                        <DropdownMenuItem
                                                onClick={() =>
                                                        column.toggleSorting(
                                                                false
                                                        )
                                                }
                                        >
                                                <ArrowUp className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                Asc
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                                onClick={() =>
                                                        column.toggleSorting(
                                                                true
                                                        )
                                                }
                                        >
                                                <ArrowDown className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                Desc
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                                onClick={() =>
                                                        column.toggleVisibility(
                                                                false
                                                        )
                                                }
                                        >
                                                <EyeOff className="h-3.5 w-3.5 text-muted-foreground/70" />
                                                Hide
                                        </DropdownMenuItem>
                                </DropdownMenuContent>
                        </DropdownMenu>
                </div>
        );
}

//data-table-faceted-filter.tsx
import * as React from 'react';
import type { Column } from '@tanstack/react-table';
import { Check, PlusCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
        Command,
        CommandEmpty,
        CommandGroup,
        CommandInput,
        CommandItem,
        CommandList,
        CommandSeparator,
} from '@/components/ui/command';
import {
        Popover,
        PopoverContent,
        PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';

interface DataTableFacetedFilterProps<TData, TValue> {
        column?: Column<TData, TValue>;
        title?: string;
        options: {
                label: string;
                value: string;
                icon?: React.ComponentType<{ className?: string }>;
        }[];
}

export function DataTableFacetedFilter<TData, TValue>({
        column,
        title,
        options,
}: DataTableFacetedFilterProps<TData, TValue>) {
        const facets = column?.getFacetedUniqueValues();
        const selectedValues = new Set(column?.getFilterValue() as string[]);

        return (
                <Popover>
                        <PopoverTrigger asChild>
                                <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-dashed"
                                >
                                        <PlusCircle />
                                        {title}
                                        {selectedValues?.size > 0 && (
                                                <>
                                                        <Separator
                                                                orientation="vertical"
                                                                className="mx-2 h-4"
                                                        />
                                                        <Badge
                                                                variant="secondary"
                                                                className="rounded-sm px-1 font-normal lg:hidden"
                                                        >
                                                                {
                                                                        selectedValues.size
                                                                }
                                                        </Badge>
                                                        <div className="hidden space-x-1 lg:flex">
                                                                {selectedValues.size >
                                                                2 ? (
                                                                        <Badge
                                                                                variant="secondary"
                                                                                className="rounded-sm px-1 font-normal"
                                                                        >
                                                                                {
                                                                                        selectedValues.size
                                                                                }{' '}
                                                                                selected
                                                                        </Badge>
                                                                ) : (
                                                                        options
                                                                                .filter(
                                                                                        (
                                                                                                option
                                                                                        ) =>
                                                                                                selectedValues.has(
                                                                                                        option.value
                                                                                                )
                                                                                )
                                                                                .map(
                                                                                        (
                                                                                                option
                                                                                        ) => (
                                                                                                <Badge
                                                                                                        variant="secondary"
                                                                                                        key={
                                                                                                                option.value
                                                                                                        }
                                                                                                        className="rounded-sm px-1 font-normal"
                                                                                                >
                                                                                                        {
                                                                                                                option.label
                                                                                                        }
                                                                                                </Badge>
                                                                                        )
                                                                                )
                                                                )}
                                                        </div>
                                                </>
                                        )}
                                </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[200px] p-0" align="start">
                                <Command>
                                        <CommandInput placeholder={title} />
                                        <CommandList>
                                                <CommandEmpty>
                                                        No results found.
                                                </CommandEmpty>
                                                <CommandGroup>
                                                        {options.map(
                                                                (option) => {
                                                                        const isSelected =
                                                                                selectedValues.has(
                                                                                        option.value
                                                                                );
                                                                        return (
                                                                                <CommandItem
                                                                                        key={
                                                                                                option.value
                                                                                        }
                                                                                        onSelect={() => {
                                                                                                if (
                                                                                                        isSelected
                                                                                                ) {
                                                                                                        selectedValues.delete(
                                                                                                                option.value
                                                                                                        );
                                                                                                } else {
                                                                                                        selectedValues.add(
                                                                                                                option.value
                                                                                                        );
                                                                                                }
                                                                                                const filterValues =
                                                                                                        Array.from(
                                                                                                                selectedValues
                                                                                                        );
                                                                                                column?.setFilterValue(
                                                                                                        filterValues.length
                                                                                                                ? filterValues
                                                                                                                : undefined
                                                                                                );
                                                                                        }}
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
                                                                                                <option.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                                                                                        )}
                                                                                        <span>
                                                                                                {
                                                                                                        option.label
                                                                                                }
                                                                                        </span>
                                                                                        {facets?.get(
                                                                                                option.value
                                                                                        ) && (
                                                                                                <span className="ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
                                                                                                        {facets.get(
                                                                                                                option.value
                                                                                                        )}
                                                                                                </span>
                                                                                        )}
                                                                                </CommandItem>
                                                                        );
                                                                }
                                                        )}
                                                </CommandGroup>
                                                {selectedValues.size > 0 && (
                                                        <>
                                                                <CommandSeparator />
                                                                <CommandGroup>
                                                                        <CommandItem
                                                                                onSelect={() =>
                                                                                        column?.setFilterValue(
                                                                                                undefined
                                                                                        )
                                                                                }
                                                                                className="justify-center text-center"
                                                                        >
                                                                                Clear
                                                                                filters
                                                                        </CommandItem>
                                                                </CommandGroup>
                                                        </>
                                                )}
                                        </CommandList>
                                </Command>
                        </PopoverContent>
                </Popover>
        );
}

// data-table-pagination.tsx
import type { Table } from '@tanstack/react-table';
import {
        ChevronLeft,
        ChevronRight,
        ChevronsLeft,
        ChevronsRight,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
        Select,
        SelectContent,
        SelectItem,
        SelectTrigger,
        SelectValue,
} from '@/components/ui/select';

interface DataTablePaginationProps<TData> {
        table: Table<TData>;
}

export function DataTablePagination<TData>({
        table,
}: DataTablePaginationProps<TData>) {
        return (
                <div className="flex items-center justify-between px-2">
                        <div className="flex-1 text-sm text-muted-foreground">
                                {
                                        table.getFilteredSelectedRowModel().rows
                                                .length
                                }{' '}
                                of {table.getFilteredRowModel().rows.length}{' '}
                                row(s) selected.
                        </div>
                        <div className="flex items-center space-x-6 lg:space-x-8">
                                <div className="flex items-center space-x-2">
                                        <p className="text-sm font-medium">
                                                Rows per page
                                        </p>
                                        <Select
                                                value={`${table.getState().pagination.pageSize}`}
                                                onValueChange={(value) => {
                                                        table.setPageSize(
                                                                Number(value)
                                                        );
                                                }}
                                        >
                                                <SelectTrigger className="h-8 w-[70px]">
                                                        <SelectValue
                                                                placeholder={
                                                                        table.getState()
                                                                                .pagination
                                                                                .pageSize
                                                                }
                                                        />
                                                </SelectTrigger>
                                                <SelectContent side="top">
                                                        {[
                                                                10, 20, 30, 40,
                                                                50,
                                                        ].map((pageSize) => (
                                                                <SelectItem
                                                                        key={
                                                                                pageSize
                                                                        }
                                                                        value={`${pageSize}`}
                                                                >
                                                                        {
                                                                                pageSize
                                                                        }
                                                                </SelectItem>
                                                        ))}
                                                </SelectContent>
                                        </Select>
                                </div>
                                <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                                        Page{' '}
                                        {table.getState().pagination.pageIndex +
                                                1}{' '}
                                        of {table.getPageCount()}
                                </div>
                                <div className="flex items-center space-x-2">
                                        <Button
                                                variant="outline"
                                                className="hidden h-8 w-8 p-0 lg:flex"
                                                onClick={() =>
                                                        table.setPageIndex(0)
                                                }
                                                disabled={
                                                        !table.getCanPreviousPage()
                                                }
                                        >
                                                <span className="sr-only">
                                                        Go to first page
                                                </span>
                                                <ChevronsLeft />
                                        </Button>
                                        <Button
                                                variant="outline"
                                                className="h-8 w-8 p-0"
                                                onClick={() =>
                                                        table.previousPage()
                                                }
                                                disabled={
                                                        !table.getCanPreviousPage()
                                                }
                                        >
                                                <span className="sr-only">
                                                        Go to previous page
                                                </span>
                                                <ChevronLeft />
                                        </Button>
                                        <Button
                                                variant="outline"
                                                className="h-8 w-8 p-0"
                                                onClick={() => table.nextPage()}
                                                disabled={
                                                        !table.getCanNextPage()
                                                }
                                        >
                                                <span className="sr-only">
                                                        Go to next page
                                                </span>
                                                <ChevronRight />
                                        </Button>
                                        <Button
                                                variant="outline"
                                                className="hidden h-8 w-8 p-0 lg:flex"
                                                onClick={() =>
                                                        table.setPageIndex(
                                                                table.getPageCount() -
                                                                        1
                                                        )
                                                }
                                                disabled={
                                                        !table.getCanNextPage()
                                                }
                                        >
                                                <span className="sr-only">
                                                        Go to last page
                                                </span>
                                                <ChevronsRight />
                                        </Button>
                                </div>
                        </div>
                </div>
        );
}

// data-table-row-actions.tsx
import type { Row } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
        DropdownMenu,
        DropdownMenuContent,
        DropdownMenuItem,
        DropdownMenuRadioGroup,
        DropdownMenuRadioItem,
        DropdownMenuSeparator,
        DropdownMenuShortcut,
        DropdownMenuSub,
        DropdownMenuSubContent,
        DropdownMenuSubTrigger,
        DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { labels } from './data/data';
import { taskSchema } from './data/schema';

interface DataTableRowActionsProps<TData> {
        row: Row<TData>;
}

export function DataTableRowActions<TData>({
        row,
}: DataTableRowActionsProps<TData>) {
        const task = taskSchema.parse(row.original);

        return (
                <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                                <Button
                                        variant="ghost"
                                        className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
                                >
                                        <MoreHorizontal />
                                        <span className="sr-only">
                                                Open menu
                                        </span>
                                </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[160px]">
                                <DropdownMenuItem>Edit</DropdownMenuItem>
                                <DropdownMenuItem>Make a copy</DropdownMenuItem>
                                <DropdownMenuItem>Favorite</DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                                Labels
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                                <DropdownMenuRadioGroup
                                                        value={task.label}
                                                >
                                                        {labels.map((label) => (
                                                                <DropdownMenuRadioItem
                                                                        key={
                                                                                label.value
                                                                        }
                                                                        value={
                                                                                label.value
                                                                        }
                                                                >
                                                                        {
                                                                                label.label
                                                                        }
                                                                </DropdownMenuRadioItem>
                                                        ))}
                                                </DropdownMenuRadioGroup>
                                        </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem>
                                        Delete
                                        <DropdownMenuShortcut>
                                                ⌘⌫
                                        </DropdownMenuShortcut>
                                </DropdownMenuItem>
                        </DropdownMenuContent>
                </DropdownMenu>
        );
}

// data-table-toolbar.tsx
import { X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';

import { priorities, statuses } from './data/data';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import type { Table } from '@tanstack/react-table';

interface DataTableToolbarProps<TData> {
        table: Table<TData>;
}

export function DataTableToolbar<TData>({
        table,
}: DataTableToolbarProps<TData>) {
        const isFiltered = table.getState().columnFilters.length > 0;

        return (
                <div className="flex items-center justify-between">
                        <div className="flex flex-1 items-center space-x-2">
                                <Input
                                        placeholder="Filter tasks..."
                                        value={
                                                (table
                                                        .getColumn('title')
                                                        ?.getFilterValue() as string) ??
                                                ''
                                        }
                                        onChange={(event) =>
                                                table
                                                        .getColumn('title')
                                                        ?.setFilterValue(
                                                                event.target
                                                                        .value
                                                        )
                                        }
                                        className="h-8 w-[150px] lg:w-[250px]"
                                />
                                {table.getColumn('status') && (
                                        <DataTableFacetedFilter
                                                column={table.getColumn(
                                                        'status'
                                                )}
                                                title="Status"
                                                options={statuses}
                                        />
                                )}
                                {table.getColumn('priority') && (
                                        <DataTableFacetedFilter
                                                column={table.getColumn(
                                                        'priority'
                                                )}
                                                title="Priority"
                                                options={priorities}
                                        />
                                )}
                                {isFiltered && (
                                        <Button
                                                variant="ghost"
                                                onClick={() =>
                                                        table.resetColumnFilters()
                                                }
                                                className="h-8 px-2 lg:px-3"
                                        >
                                                Reset
                                                <X />
                                        </Button>
                                )}
                        </div>
                        <DataTableViewOptions table={table} />
                </div>
        );
}
