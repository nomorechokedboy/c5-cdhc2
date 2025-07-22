import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTableViewOptions } from './data-table-view-options';
import {
        ClassOptions,
        EduLevelOptions,
        MilitaryRankOptions,
} from './data/data';
import { DataTableFacetedFilter } from './data-table-faceted-filter';
import type { Table } from '@tanstack/react-table';
import { ehtnicOptions } from '@/data/ethnics';
import { ReactNode } from 'react';

export interface DataTableToolbarProps<TData> {
        table: Table<TData>;
        leftSection?: ReactNode;
        rightSection?: ReactNode;
}

export function DataTableToolbar<TData>({
        table,
        leftSection: LeftSection,
        rightSection: RightSection,
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
                                {table.getColumn('Lớp') && (
                                        <DataTableFacetedFilter
                                                column={table.getColumn('Lớp')}
                                                title="Lớp"
                                                options={ClassOptions}
                                        />
                                )}
                                {table.getColumn('CB') && (
                                        <DataTableFacetedFilter
                                                column={table.getColumn('CB')}
                                                title="Cấp bậc"
                                                options={MilitaryRankOptions}
                                        />
                                )}
                                {table.getColumn('Dân tộc') && (
                                        <DataTableFacetedFilter
                                                column={table.getColumn(
                                                        'Dân tộc'
                                                )}
                                                title="Dân tộc"
                                                options={ehtnicOptions}
                                        />
                                )}
                                {table.getColumn('Trình độ học vấn') && (
                                        <DataTableFacetedFilter
                                                column={table.getColumn(
                                                        'Trình độ học vấn'
                                                )}
                                                title="Trình độ học vấn"
                                                options={EduLevelOptions}
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
                        <div className="flex items-center gap-2">
                                <DataTableViewOptions table={table} />
                                {RightSection}
                        </div>
                </div>
        );
}
