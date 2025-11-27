import { DataTableRowActions } from '@/components/data-table/data-table-row-actions'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
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
		cell: ({ row }) => {
			const status = row.getValue('status') as 'ongoing' | 'graduated'
			const statusLabel = status === 'ongoing' ? 'Đang diễn ra' : status === 'graduated' ? 'Đã tốt nghiệp' : ''
			const statusVariant = status === 'ongoing' ? 'default' : 'secondary'
			return (
				<div className='flex items-center gap-2'>
					<span>{row.getValue('name')}</span>
					{status && (
						<Badge variant={statusVariant} className='text-xs'>
							{statusLabel}
						</Badge>
					)}
				</div>
			)
		}
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
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		}
	},
	{
		id: 'actions',
		cell: ({ row }) => <DataTableRowActions row={row} />
	}
]
