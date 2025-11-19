import type { ColumnDef } from '@tanstack/react-table'
import type { User } from '@/types'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '../data-table/data-table-column-header'
import { useUserTableContext } from './UserTableContext'

function isoToDdMmYyyy(isoDate: string): string {
	if (!isoDate) return 'N/A'
	const date = new Date(isoDate)
	const day = date.getDate().toString().padStart(2, '0')
	const month = (date.getMonth() + 1).toString().padStart(2, '0')
	const year = date.getFullYear()
	return `${day}/${month}/${year}`
}

export const baseStudentsColumns: ColumnDef<User>[] = [
	{
		id: 'displayName',
		accessorFn: (row) => row.displayName,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tên người dùng' />
		),
		meta: {
			label: 'Tên người dùng'
		}
	},
	{
		accessorKey: 'createdAt',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Ngày tạo' />
		),
		cell: ({ row }) => (
			<div className='min-w-28'>
				{row.getValue('createdAt') ? (
					isoToDdMmYyyy(row.getValue('createdAt'))
				) : (
					<Badge className='bg-blue-500 font-bold'>
						Chưa có thông tin...
					</Badge>
				)}
			</div>
		),
		meta: {
			label: 'Ngày tạo'
		}
	},
	{
		accessorKey: 'updateAt',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Ngày cập nhật' />
		),
		cell: ({ row }) => (
			<div className='min-w-28'>
				{row.getValue('updateAt') ? (
					isoToDdMmYyyy(row.getValue('updateAt'))
				) : (
					<Badge className='bg-blue-500 font-bold'>
						Chưa có thông tin...
					</Badge>
				)}
			</div>
		),
		meta: {
			label: 'Ngày cập nhật'
		}
	},
	{
		id: 'username',
		accessorFn: (row) => row.username,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tên tài khoản' />
		),
		cell: ({ row }) => (
			<div className='min-w-28'>
				{row.getValue('username') ? (
					row.getValue('username')
				) : (
					<Badge className='bg-blue-500 font-bold'>
						Chưa có thông tin...
					</Badge>
				)}
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
			<div className='min-w-28'>
				{row.getValue('unit.name') ? (
					row.getValue('unit.name')
				) : (
					<Badge className='bg-blue-500 font-bold'>
						Chưa có thông tin...
					</Badge>
				)}
			</div>
		),
		meta: {
			label: 'Đơn vị'
		}
	},
	{
		id: 'actions',
		header: 'Thao tác',
		cell: ({ row }) => {
			const { onEditUser } = useUserTableContext()
			const user = row.original

			return (
				<button
					onClick={() => onEditUser(user)}
					className='px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600'
				>
					Sửa
				</button>
			)
		}
	}
]

export const battalionStudentColumnsWithoutAction: ColumnDef<User>[] = [
	{
		id: 'displayName',
		accessorFn: (row) => row.displayName,
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tên người dùng' />
		),
		meta: {
			label: 'Tên người dùng'
		}
	},
	{
		accessorKey: 'createAt',
		header: 'Ngày tạo',
		cell: ({ row }) => (
			<div className=''>{isoToDdMmYyyy(row.getValue('createAt'))}</div>
		),
		meta: {
			label: 'Ngày tạo'
		}
	},
	{
		accessorKey: 'updateAt',
		header: 'Ngày cập nhật',
		cell: ({ row }) => (
			<div className=''>{isoToDdMmYyyy(row.getValue('updateAt'))}</div>
		),
		meta: {
			label: 'Ngày cập nhật'
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
		id: 'actions',
		header: 'Thao tác',
		cell: ({ row }) => {
			const id = row.original.id

			return (
				<button
					onClick={() => console.log('Edit:', id)}
					className='px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600'
				>
					Sửa
				</button>
			)
		},
		meta: {
			label: 'Thao tác'
		}
	}
]

// export const hcyuColumnVisibility = {
// 	dob: false,
// 	enlistmentPeriod: false,
// 	isGraduated: false,
// 	major: false,
// 	phone: false,
// 	position: false,
// 	policyBeneficiaryGroup: false,
// 	cpvId: false,
// 	previousPosition: false,
// 	religion: false,
// 	schoolName: false,
// 	shortcoming: false,
// 	talent: false,
// 	fatherName: false,
// 	fatherJob: false,
// 	fatherPhoneNumber: false,
// 	motherName: false,
// 	motherJob: false,
// 	motherPhoneNumber: false,
// 	address: false,
// 	birthPlace: false,
// 	cpvOfficialAt: false
// }
