import type { ColumnDef } from '@tanstack/react-table';
import type { Student } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { EllipsisText } from '../data-table/ellipsis-text';
import { DataTableRowActions } from '../data-table/data-table-row-actions';

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
                id: 'TT',
                accessorKey: 'id',
                header: ({ column }) => (
                        <DataTableColumnHeader column={column} title="TT" />
                ),
                cell: ({ row }) => (
                        <div className="w-12 ">{row.getValue('id')}</div>
                ),
        },
        {
                id: 'Lớp',
                accessorKey: 'className',
                header: 'Lớp',
                cell: ({ row }) => (
                        <div className="w-20">
                                <Badge
                                        className="bg-green-400 text-white font-bold"
                                        variant="secondary"
                                >
                                        {row.getValue('className')}
                                </Badge>
                        </div>
                ),
                filterFn: (row, id, value) => {
                        return value.includes(row.getValue(id));
                },
        },
        {
                id: 'Họ và tên',
                accessorKey: 'fullName',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Họ và tên"
                        />
                ),
                cell: ({ row }) => (
                        <div className="font-medium min-w-32">
                                {row.getValue('fullName')}
                        </div>
                ),
        },
        {
                id: 'Năm sinh',
                accessorKey: 'dob',
                header: 'Năm sinh',
                cell: ({ row }) => (
                        <div className="">{row.getValue('dob')}</div>
                ),
        },
        {
                id: 'Quê quán',
                accessorKey: 'birthPlace',
                header: 'Quê quán',
                cell: ({ row }) => (
                        <EllipsisText>
                                {row.getValue('birthPlace')}
                        </EllipsisText>
                ),
        },
        {
                id: 'Trú quán',
                accessorKey: 'address',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Trú quán"
                        />
                ),
                cell: ({ row }) => (
                        <div className="min-w-32">
                                {row.getValue('address') || <Badge>N/A</Badge>}
                        </div>
                ),
                enableHiding: true,
        },
        {
                id: 'Cấp bậc',
                accessorKey: 'rank',
                header: 'Cấp bậc',
                cell: ({ row }) => (
                        <div className="min-w-20">
                                <Badge className="bg-[#3A5F0B] text-white font-bold">
                                        {row.getValue('rank')}
                                </Badge>
                        </div>
                ),
                filterFn: (row, id, value) => {
                        return value.includes(row.getValue(id));
                },
                enableHiding: true,
        },
        {
                id: 'Chức vụ',
                accessorKey: 'position',
                header: 'Chức vụ',
                cell: ({ row }) => (
                        <div className="min-w-20">
                                {row.getValue('position')}
                        </div>
                ),
                enableHiding: true,
        },
        {
                id: 'Đơn vị cũ',
                accessorKey: 'previousUnit',
                header: 'Đơn vị cũ',
                cell: ({ row }) => (
                        <EllipsisText>
                                {row.getValue('previousUnit')}
                        </EllipsisText>
                ),
        },
        {
                id: 'Dân tộc',
                accessorKey: 'ethnic',
                header: 'Dân tộc',
                cell: ({ row }) => (
                        <Badge className="bg-blue-500 dark:bg-blue-600 text-white font-bold">
                                {row.getValue('ethnic')}
                        </Badge>
                ),
                filterFn: (row, id, value) => {
                        return value.includes(row.getValue(id));
                },
        },
        {
                id: 'Học vấn',
                accessorKey: 'educationLevel',
                header: 'Học vấn',
                cell: ({ row }) => (
                        <Badge className="bg-blue-500 dark:bg-blue-600 text-white font-bold">
                                {row.getValue('educationLevel')}
                        </Badge>
                ),
                filterFn: (row, id, value) => {
                        return value.includes(row.getValue(id));
                },
        },
        {
                id: 'Họ tên bố',
                accessorKey: 'fatherName',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Họ tên bố"
                        />
                ),
                cell: ({ row }) => (
                        <div className="min-w-32">
                                {row.getValue('fatherName')}
                        </div>
                ),
        },
        {
                id: 'Họ tên mẹ',
                accessorKey: 'motherName',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Họ tên mẹ"
                        />
                ),
                cell: ({ row }) => (
                        <div className="min-w-32">
                                {row.getValue('motherName')}
                        </div>
                ),
        },
        // {
        //         accessorKey: 'Vợ',
        //         header: ({ column }) => (
        //                 <DataTableColumnHeader
        //                         column={column}
        //                         title="Họ tên vợ"
        //                 />
        //         ),
        //         cell: ({ row }) => (
        //                 <div className="min-w-32">
        //                         {row.getValue('Vợ') || <Badge>N/A</Badge>}
        //                 </div>
        //         ),
        //         enableHiding: true,
        // },
        {
                id: 'actions',
                cell: ({ row }) => <DataTableRowActions row={row} />,
        },
];
