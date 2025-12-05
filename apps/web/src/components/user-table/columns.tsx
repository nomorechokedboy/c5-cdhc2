import type { ColumnDef } from '@tanstack/react-table'
import type { User } from '@/types'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '../data-table/data-table-column-header'
import { DataTableRowActions } from './data-user-table-row-actions'
import { Shield, Award, Briefcase } from 'lucide-react'

// Helper function to format ISO date to DD/MM/YYYY
function formatDate(isoDate: string): string {
	if (!isoDate) return 'N/A'
	const date = new Date(isoDate)
	const day = date.getDate().toString().padStart(2, '0')
	const month = (date.getMonth() + 1).toString().padStart(2, '0')
	const year = date.getFullYear()
	return `${day}/${month}/${year}`
}

// Helper component for empty data cells
const EmptyCell = () => (
	<Badge variant='secondary' className='bg-gray-200 text-gray-600'>
		Chưa có thông tin
	</Badge>
)

export const baseUsersColumns: ColumnDef<User>[] = [
	{
		id: 'displayName',
		accessorFn: (row) => row.displayName,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ và tên' />
		),
		cell: ({ row }) => (
			<div className='flex items-center gap-2 min-w-40'>
				<span className='font-medium'>{row.original.displayName}</span>
				{row.original.isSuperUser && (
					<Badge variant='default' className='bg-blue-600'>
						<Shield className='w-3 h-3' />
					</Badge>
				)}
			</div>
		),
		meta: {
			label: 'Họ và tên'
		}
	},
	{
		id: 'username',
		accessorFn: (row) => row.username,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tên tài khoản' />
		),
		cell: ({ row }) => (
			<div className='min-w-32'>
				{row.original.username || <EmptyCell />}
			</div>
		),
		meta: {
			label: 'Tên tài khoản'
		}
	},
	{
		id: 'unit.name',
		accessorFn: (row) => row.unit?.name || null,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Đơn vị' />
		),
		cell: ({ row }) => (
			<div className='min-w-36'>
				{row.original.unit?.name || <EmptyCell />}
			</div>
		),
		meta: {
			label: 'Đơn vị'
		}
	},
	{
		id: 'rank',
		accessorFn: (row) => row.rank || null,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Cấp bậc' />
		),
		cell: ({ row }) => (
			<div className='min-w-28'>
				{row.original.rank ? (
					<div className='flex items-center gap-2'>
						<Award className='w-4 h-4 text-amber-600' />
						<span>{row.original.rank}</span>
					</div>
				) : (
					<EmptyCell />
				)}
			</div>
		),
		meta: {
			label: 'Cấp bậc'
		}
	},
	{
		id: 'position',
		accessorFn: (row) => row.position || null,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Chức vụ' />
		),
		cell: ({ row }) => (
			<div className='min-w-36'>
				{row.original.position ? (
					<div className='flex items-center gap-2'>
						<Briefcase className='w-4 h-4 text-blue-600' />
						<span>{row.original.position}</span>
					</div>
				) : (
					<EmptyCell />
				)}
			</div>
		),
		meta: {
			label: 'Chức vụ'
		}
	},
	{
		id: 'createdAt',
		accessorKey: 'createdAt',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Ngày tạo' />
		),
		cell: ({ row }) => (
			<div className='min-w-28 text-gray-600'>
				{row.original.createdAt ? formatDate(row.original.createdAt) : <EmptyCell />}
			</div>
		),
		meta: {
			label: 'Ngày tạo'
		}
	},
	{
		id: 'actions',
		cell: ({ row }) => <DataTableRowActions row={row} />
	}
]

// Alternative column set without actions (for battalion view)
export const battalionStudentColumnsWithoutAction: ColumnDef<User>[] = [
	{
		id: 'displayName',
		accessorFn: (row) => row.displayName,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ và tên' />
		),
		cell: ({ row }) => (
			<div className='flex items-center gap-2'>
				<span className='font-medium'>{row.original.displayName}</span>
				{row.original.isSuperUser && (
					<Badge variant='default' className='bg-blue-600'>
						<Shield className='w-3 h-3' />
					</Badge>
				)}
			</div>
		),
		meta: {
			label: 'Họ và tên'
		}
	},
	{
		id: 'username',
		accessorFn: (row) => row.username,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tên tài khoản' />
		),
		meta: {
			label: 'Tên tài khoản'
		}
	},
	{
		id: 'unit.name',
		accessorFn: (row) => row.unit?.name || null,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Đơn vị' />
		),
		meta: {
			label: 'Đơn vị'
		}
	},
	{
		id: 'rank',
		accessorFn: (row) => row.rank || null,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Cấp bậc' />
		),
		cell: ({ row }) => (
			<div className='flex items-center gap-2'>
				{row.original.rank && <Award className='w-4 h-4 text-amber-600' />}
				<span>{row.original.rank || '-'}</span>
			</div>
		),
		meta: {
			label: 'Cấp bậc'
		}
	},
	{
		id: 'position',
		accessorFn: (row) => row.position || null,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Chức vụ' />
		),
		cell: ({ row }) => (
			<div className='flex items-center gap-2'>
				{row.original.position && <Briefcase className='w-4 h-4 text-blue-600' />}
				<span>{row.original.position || '-'}</span>
			</div>
		),
		meta: {
			label: 'Chức vụ'
		}
	},
	{
		id: 'createdAt',
		accessorKey: 'createdAt',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Ngày tạo' />
		),
		cell: ({ row }) => (
			<div className='text-gray-600'>
				{row.original.createdAt ? formatDate(row.original.createdAt) : '-'}
			</div>
		),
		meta: {
			label: 'Ngày tạo'
		}
	},
	{
		id: 'actions',
		header: 'Thao tác',
		cell: ({ row }) => (
			<button
				onClick={() => console.log('Edit:', row.original.id)}
				className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors'
			>
				Sửa
			</button>
		),
		meta: {
			label: 'Thao tác'
		}
	}
]
