import type { ColumnDef } from '@tanstack/react-table'
import type { User } from '@/types'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '../data-table/data-table-column-header'
import { DataTableRowActions } from './data-user-table-row-actions'
import { Shield, Award, Briefcase } from 'lucide-react'
import { canSeeUsernames } from '@/lib/utils'

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

/** Cột bảng user — gọi mỗi lần render để ẩn/hiện username theo quyền admin */
export function getBaseUsersColumns(): ColumnDef<User>[] {
	return [
		{
			id: 'displayName',
			accessorFn: (row) => row.displayName,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title='Họ và tên' />
			),
			cell: ({ row }) => (
				<div className='flex items-center gap-2 min-w-[10rem] max-w-[16rem]'>
					<span className='font-medium truncate'>
						{row.original.displayName}
					</span>
					{row.original.isSuperUser && (
						<Badge
							variant='default'
							className='bg-blue-600 shrink-0'
						>
							<Shield className='w-3 h-3' />
						</Badge>
					)}
				</div>
			),
			meta: {
				label: 'Họ và tên'
			}
		},
		// Tên đăng nhập: chỉ super admin (admin.cdhc2) được xem
		...(canSeeUsernames()
			? [
					{
						id: 'username',
						accessorFn: (row: User) => row.username,
						header: ({ column }: { column: any }) => (
							<DataTableColumnHeader
								column={column}
								title='Tên tài khoản'
							/>
						),
						cell: ({ row }: { row: { original: User } }) => (
							<div className='min-w-[8rem] font-mono text-base'>
								{row.original.username || <EmptyCell />}
							</div>
						),
						meta: {
							label: 'Tên tài khoản'
						}
					} as ColumnDef<User>
				]
			: []),
		{
			id: 'unitOrNganh',
			accessorFn: (row) => {
				const labels = row.nganhLabels || []
				if (labels.length) {
					return labels.map((n) => `${n.code} ${n.name}`).join(' ')
				}
				const codes = row.nganhCodes || []
				if (codes.length) return codes.join(' ')
				const u = row.unit
				if (u) return `${u.alias || ''} ${u.name}`.trim()
				return row.unitName || ''
			},
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title='Đơn vị / Ngành' />
			),
			cell: ({ row }) => {
				const nganhLabels = row.original.nganhLabels || []
				const nganhCodes = row.original.nganhCodes || []
				const hasNganh = nganhLabels.length > 0 || nganhCodes.length > 0
				const u = row.original.unit
				const unitLabel = u
					? `${u.alias ? `${u.alias} — ` : ''}${u.name}`
					: row.original.unitName || null
				const isDonVi =
					(row.original.position || '')
						.toLowerCase()
						.includes('đơn vị') ||
					(row.original.username || '')
						.toLowerCase()
						.startsWith('dv.')

				// User ngành → hiện ngành; user đơn vị (và còn lại) → hiện đơn vị
				if (hasNganh && !isDonVi) {
					const items =
						nganhLabels.length > 0
							? nganhLabels
							: nganhCodes.map((code) => ({
									code,
									name: code
								}))
					return (
						<div className='min-w-[12rem] max-w-[18rem] space-y-1'>
							{items.map((n) => (
								<div
									key={n.code}
									className='leading-snug break-words'
								>
									<span className='font-mono text-sm font-semibold'>
										{n.code}
									</span>
									<span className='text-base text-muted-foreground'>
										{' '}
										— {n.name}
									</span>
								</div>
							))}
							<Badge variant='secondary' className='text-xs h-6'>
								Ngành
							</Badge>
						</div>
					)
				}

				return (
					<div className='min-w-[12rem] max-w-[18rem] space-y-0.5'>
						{unitLabel ? (
							<span className='font-medium break-words'>
								{unitLabel}
							</span>
						) : (
							<EmptyCell />
						)}
						{isDonVi ? (
							<Badge
								variant='outline'
								className='text-[10px] h-5'
							>
								ĐV sử dụng
							</Badge>
						) : null}
					</div>
				)
			},
			meta: {
				label: 'Đơn vị / Ngành'
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
					{row.original.createdAt ? (
						formatDate(row.original.createdAt)
					) : (
						<EmptyCell />
					)}
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
}

/** @deprecated dùng getBaseUsersColumns() */
export const baseUsersColumns: ColumnDef<User>[] = getBaseUsersColumns()

// Alternative column set without actions (for battalion view)
export function getBattalionUserColumnsWithoutAction(): ColumnDef<User>[] {
	return [
		{
			id: 'displayName',
			accessorFn: (row) => row.displayName,
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title='Họ và tên' />
			),
			cell: ({ row }) => (
				<div className='flex items-center gap-2'>
					<span className='font-medium'>
						{row.original.displayName}
					</span>
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
		...(canSeeUsernames()
			? [
					{
						id: 'username',
						accessorFn: (row: User) => row.username,
						header: ({ column }: { column: any }) => (
							<DataTableColumnHeader
								column={column}
								title='Tên tài khoản'
							/>
						),
						meta: {
							label: 'Tên tài khoản'
						}
					} as ColumnDef<User>
				]
			: []),
		{
			id: 'unitOrNganh',
			accessorFn: (row) => {
				const labels = row.nganhLabels || []
				if (labels.length) {
					return labels.map((n) => `${n.code} — ${n.name}`).join('; ')
				}
				if (row.nganhCodes?.length) return row.nganhCodes.join('; ')
				const u = row.unit
				if (u) return `${u.alias ? `${u.alias} — ` : ''}${u.name}`
				return row.unitName || ''
			},
			header: ({ column }) => (
				<DataTableColumnHeader column={column} title='Đơn vị / Ngành' />
			),
			meta: {
				label: 'Đơn vị / Ngành'
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
					{row.original.rank && (
						<Award className='w-4 h-4 text-amber-600' />
					)}
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
					{row.original.position && (
						<Briefcase className='w-4 h-4 text-blue-600' />
					)}
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
					{row.original.createdAt
						? formatDate(row.original.createdAt)
						: '-'}
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
}

/** @deprecated dùng getBattalionUserColumnsWithoutAction() */
export const battalionStudentColumnsWithoutAction: ColumnDef<User>[] =
	getBattalionUserColumnsWithoutAction()
