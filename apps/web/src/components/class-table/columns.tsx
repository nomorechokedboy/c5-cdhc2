import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { Checkbox } from '@/components/ui/checkbox'
import type { Class } from '@/types'
import type { ColumnDef } from '@tanstack/react-table'

export const columns: ColumnDef<Class>[] = [
	{
		id: 'select',
		header: ({ table }) => (
			<Checkbox
				checked={
					table.getIsAllPageRowsSelected() ||
					(table.getIsSomePageRowsSelected() && 'indeterminate')
				}
				onCheckedChange={(value) =>
					table.toggleAllPageRowsSelected(!!value)
				}
				aria-label='Select all'
				className='translate-y-[2px]'
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label='Select row'
				className='translate-y-[2px]'
			/>
		),
		enableSorting: false,
		enableHiding: false
	},
	{
		accessorKey: 'name',
		header: 'Tên lớp',
		cell: ({ row }) => <div className=''>{row.getValue('name')}</div>
	},
	{
		accessorKey: 'description',
		header: 'Mô tả',
		cell: ({ row }) => <div className=''>{row.getValue('description')}</div>
	},
	{
		accessorKey: 'status',
		header: 'Trạng thái',
		cell: ({ row }) => {
			const value = row.getValue('status') as string | undefined
			const label =
				value === 'graduated'
					? 'Đã tốt nghiệp'
					: value === 'ongoing'
						? 'Đang diễn ra'
						: (value ?? '')
			return <div className=''>{label}</div>
		}
	},
	{
		id: 'actions',
		cell: ({ row }) => <DataTableRowActions row={row} />
	}
]
