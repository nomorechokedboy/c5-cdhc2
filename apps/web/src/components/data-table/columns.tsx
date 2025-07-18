import type { ColumnDef } from '@tanstack/react-table';
import type { Student } from '@/types';
import { EllipsisText } from './ellipsis-text';
import { Checkbox } from '@/components/ui/checkbox';
import { DataTableRowActions } from './data-table-row-actions';
import { DataTableColumnHeader } from './data-table-column-header';
import { Badge } from '@/components/ui/badge';

export const columns: ColumnDef<Student>[] = [
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
                accessorKey: 'TT',
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="TT" />
                ),
                cell: ({ row }) => (
                        <div className="w-12 ">{row.getValue('TT')}</div>
                ),
        },
        {
                accessorKey: 'Lớp',
                header: 'Lớp',
                cell: ({ row }) => (
                        <div className="w-20">
                                <Badge
                                        className="bg-green-100"
                                        variant="secondary"
                                >
                                        {row.getValue('Lớp')}
                                </Badge>
                        </div>
                ),
        },
        {
                accessorKey: 'Họ và tên',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Họ và tên"
                        />
                ),
                cell: ({ row }) => (
                        <div className="font-medium min-w-32">
                                {row.getValue('Họ và tên')}
                        </div>
                ),
        },
        {
                accessorKey: 'Năm sinh',
                header: 'Năm sinh',
                cell: ({ row }) => (
                        <div className="">{row.getValue('Năm sinh')}</div>
                ),
        },
        {
                accessorKey: 'Quê quán',
                header: 'Quê quán',
                cell: ({ row }) => (
                        <EllipsisText>{row.getValue('Quê quán')}</EllipsisText>
                ),
        },
        {
                accessorKey: 'CB',
                header: 'Cấp bậc',
                cell: ({ row }) => (
                        <div className="min-w-20">
                                <Badge className="bg-[#3A5F0B]">
                                        {row.getValue('CB')}
                                </Badge>
                        </div>
                ),
        },
        {
                accessorKey: 'CV',
                header: 'Chức vụ',
                cell: ({ row }) => (
                        <div className="min-w-20">{row.getValue('CV')}</div>
                ),
        },
        {
                accessorKey: 'Đơn vị cũ',
                header: 'Đơn vị cũ',
                cell: ({ row }) => (
                        <EllipsisText>{row.getValue('Đơn vị cũ')}</EllipsisText>
                ),
        },
        {
                accessorKey: 'Dân tộc',
                header: 'Dân tộc',
                cell: ({ row }) => (
                        <div className="">{row.getValue('Dân tộc')}</div>
                ),
        },
        {
                accessorKey: 'Trình độ học vấn',
                header: 'Học vấn',
                cell: ({ row }) => (
                        <div className="">
                                {row.getValue('Trình độ học vấn')}
                        </div>
                ),
        },
        {
                accessorKey: 'Bố',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Họ tên bố"
                        />
                ),
                cell: ({ row }) => (
                        <div className="min-w-32">{row.getValue('Bố')}</div>
                ),
        },
        {
                accessorKey: 'Mẹ',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Họ tên mẹ"
                        />
                ),
                cell: ({ row }) => (
                        <div className="min-w-32">{row.getValue('Mẹ')}</div>
                ),
        },
        {
                id: 'actions',
                cell: ({ row }) => <DataTableRowActions row={row} />,
        },
];
