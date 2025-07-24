import type { ColumnDef } from '@tanstack/react-table';
import type { Student } from '@/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '../data-table/data-table-column-header';
import { EllipsisText } from '../data-table/ellipsis-text';
import { DataTableRowActions } from '../data-table/data-table-row-actions';

function isoToDdMmYyyy(isoDate: string): string {
        const [year, month, day] = isoDate.split('-');
        return `${day}/${month}/${year}`;
}

export const baseStudentsColumns: ColumnDef<Student>[] = [
        {
                id: 'class.name',
                accessorFn: (row) => row.class.name,
                header: 'Lớp',
                cell: ({ row }) => (
                        <div className="w-20">
                                <Badge
                                        className="bg-green-400 text-white font-bold"
                                        variant="secondary"
                                >
                                        {row.getValue('class.name')}
                                </Badge>
                        </div>
                ),
                filterFn: (row, id, value) => {
                        return value.includes(row.getValue(id));
                },
                meta: {
                        label: 'Lớp',
                },
        },
        {
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
                meta: {
                        label: 'Họ và tên',
                },
        },
        {
                accessorKey: 'dob',
                header: 'Năm sinh',
                cell: ({ row }) => (
                        <div className="">{row.getValue('dob')}</div>
                ),
                meta: {
                        label: 'Năm sinh',
                },
        },
];

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
        ...baseStudentsColumns,
        {
                accessorKey: 'birthPlace',
                header: 'Quê quán',
                cell: ({ row }) => (
                        <EllipsisText>
                                {row.getValue('birthPlace')}
                        </EllipsisText>
                ),
                meta: {
                        label: 'Quê quán',
                },
        },
        {
                accessorKey: 'address',
                header: ({ column }) => (
                        <DataTableColumnHeader
                                column={column}
                                title="Trú quán"
                        />
                ),
                cell: ({ row }) => {
                        return (
                                <div className="min-w-32">
                                        {row.getValue('address') || (
                                                <Badge>N/A</Badge>
                                        )}
                                </div>
                        );
                },
                enableHiding: true,
                meta: {
                        label: 'Trú quán',
                },
        },
        {
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
                meta: {
                        label: 'Cấp bậc',
                },
        },
        {
                accessorKey: 'position',
                header: 'Chức vụ',
                cell: ({ row }) => (
                        <div className="min-w-20">
                                {row.getValue('position')}
                        </div>
                ),
                enableHiding: true,
                meta: {
                        label: 'Chức vụ',
                },
        },
        {
                accessorKey: 'previousUnit',
                header: 'Đơn vị cũ',
                cell: ({ row }) => (
                        <EllipsisText>
                                {row.getValue('previousUnit')}
                        </EllipsisText>
                ),
                meta: {
                        label: 'Đơn vị cũ',
                },
        },
        {
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
                meta: {
                        label: 'Dân tộc',
                },
        },
        {
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
                meta: {
                        label: 'Học vấn',
                },
        },
        {
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
                meta: {
                        label: 'Họ tên bố',
                },
        },
        {
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
                meta: {
                        label: 'Họ tên mẹ',
                },
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
