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
import {
        DataTableToolbar,
        type DataTableToolbarProps,
} from './data-table-toolbar';
import { ComponentType, useState } from 'react';

type ToolbarProps<TData> = Omit<DataTableToolbarProps<TData>, 'table'>;

interface DataTableProps<TData, TValue> {
        cardClassName?: string;
        cardComponent?: ComponentType<{ data: TData; index: number }>;
        columns: ColumnDef<TData, TValue>[];
        data: TData[];
        defaultColumnVisibility?: VisibilityState;
        defaultViewMode?: ViewMode;
        toolbarProps?: ToolbarProps<TData>;
}

type ViewMode = 'table' | 'card';

export function DataTable<TData, TValue>({
        cardClassName = '',
        cardComponent: CardComponent,
        columns,
        data,
        defaultColumnVisibility = {},
        defaultViewMode = 'table',
        toolbarProps,
}: DataTableProps<TData, TValue>) {
        const [rowSelection, setRowSelection] = useState({});
        const [columnVisibility, setColumnVisibility] =
                useState<VisibilityState>(defaultColumnVisibility);
        const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
                []
        );
        const [sorting, setSorting] = useState<SortingState>([]);
        const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

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

        const renderTableView = () => {
                return (
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
                );
        };

        const renderCardView = () => {
                if (!CardComponent) {
                        return (
                                <div className="text-center py-8 text-muted-foreground">
                                        No card component provided
                                </div>
                        );
                }

                const rows = table.getRowModel().rows;

                if (!rows?.length) {
                        return (
                                <div className="text-center py-8 text-muted-foreground">
                                        No results.
                                </div>
                        );
                }

                return (
                        <div
                                className={`grid gap-4 ${cardClassName || 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'}`}
                        >
                                {rows.map((row, index) => (
                                        <CardComponent
                                                key={row.id}
                                                data={row.original}
                                                index={index}
                                        />
                                ))}
                        </div>
                );
        };

        return (
                <div className="space-y-4">
                        <DataTableToolbar table={table} {...toolbarProps} />
                        {viewMode === 'table'
                                ? renderTableView()
                                : renderCardView()}
                        <DataTablePagination table={table} />
                </div>
        );
}
