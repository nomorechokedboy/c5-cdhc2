import type { ColumnDef } from '@tanstack/react-table'
import type { Student } from '@/types'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '../data-table/data-table-column-header'
import { DataTableRowActions } from '../data-table/data-table-row-actions'
import EditableCell from '../data-table/editable-cell'
import EditableMilitaryRank from '../data-table/editable-military-rank'
import { toDdMmYyyy } from '@/common'

function isoToDdMmYyyy(isoDate: string): string {
	const [year, month, day] = isoDate.split('-')
	return `${day}/${month}/${year}`
}

export const baseStudentsColumns: ColumnDef<Student>[] = [
	{
		id: 'class.name',
		accessorFn: (row) => row.class.name,
		header: 'Lớp',
		cell: ({ row }) => (
			<div className='w-20'>
				<Badge
					className='bg-green-400 text-white font-bold'
					variant='secondary'
				>
					{row.getValue('class.name')}
				</Badge>
			</div>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Lớp'
		}
	},
	{
		accessorKey: 'fullName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ và tên' />
		),
		cell: EditableCell,
		meta: {
			label: 'Họ và tên'
		}
	},
	{
		accessorKey: 'dob',
		header: 'Năm sinh',
		cell: ({ row }) => (
			<div className=''>{toDdMmYyyy(row.getValue('dob'))}</div>
		),
		meta: {
			label: 'Năm sinh'
		},
		enableHiding: true
	}
]

export const columns: ColumnDef<Student>[] = [
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
				className='translate-y-[2px] z-99'
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label='Select row'
				className='translate-y-[2px] z-99'
			/>
		),
		enableSorting: false,
		enableHiding: false
	},
	...baseStudentsColumns,
	{
		accessorKey: 'birthPlace',
		header: 'Quê quán',
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Quê quán'
		}
	},
	{
		accessorKey: 'address',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Trú quán' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Trú quán'
		}
	},
	{
		accessorKey: 'enlistmentPeriod',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Thời gian nhập ngũ' />
		),
		cell: ({ row }) => (
			<div className='min-w-32'>{row.getValue('enlistmentPeriod')}</div>
		),
		enableHiding: true,
		meta: {
			label: 'Thời gian nhập ngũ'
		}
	},
	{
		accessorKey: 'isGraduated',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Đã tốt nghiệp' />
		),
		cell: ({ row }) => (
			<Badge
				className={
					row.getValue('isGraduated') ? 'bg-green-500' : 'bg-red-500'
				}
			>
				{row.getValue('isGraduated') ? 'Có' : 'Không'}
			</Badge>
		),
		enableHiding: true,
		meta: {
			label: 'Đã tốt nghiệp'
		}
	},
	{
		accessorKey: 'major',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Chuyên ngành' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chuyên ngành'
		}
	},
	{
		accessorKey: 'phone',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Số điện thoại' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Số điện thoại'
		}
	},
	{
		accessorKey: 'policyBeneficiaryGroup',
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title='Đối tượng chính sách'
			/>
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Đối tượng chính sách'
		}
	},
	{
		accessorKey: 'politicalOrg',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Đoàn/Đảng' />
		),
		cell: ({ row }) => {
			const val = row.getValue('politicalOrg')
			const org =
				val === '' || val === undefined
					? 'N/A'
					: val === 'cpv'
						? 'Đảng'
						: 'Đoàn'

			return (
				<Badge className='bg-purple-500 text-white font-bold'>
					{org}
				</Badge>
			)
		},
		enableHiding: true,
		meta: {
			label: 'Đoàn/Đảng'
		}
	},
	{
		accessorKey: 'politicalOrgOfficialDate',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Ngày vào Đoàn/Đảng' />
		),
		cell: ({ row }) => (
			<div className='min-w-28'>
				{row.getValue('politicalOrgOfficialDate')
					? isoToDdMmYyyy(row.getValue('politicalOrgOfficialDate'))
					: 'N/A'}
			</div>
		),
		enableHiding: true,
		meta: {
			label: 'Ngày vào Đoàn/Đảng'
		}
	},
	{
		accessorKey: 'cpvId',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Số thẻ Đảng' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Số thẻ Đảng'
		}
	},
	{
		accessorKey: 'cpvOfficialAt',
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title='Ngày chính thức vào Đảng'
			/>
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Ngày chính thức vào Đảng'
		}
	},
	{
		accessorKey: 'previousPosition',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Chức vụ cũ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chức vụ cũ'
		}
	},
	{
		accessorKey: 'religion',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tôn giáo' />
		),
		cell: ({ row }) => (
			<Badge className='bg-orange-500 text-white font-bold'>
				{row.getValue('religion')}
			</Badge>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		enableHiding: true,
		meta: {
			label: 'Tôn giáo'
		}
	},
	{
		accessorKey: 'schoolName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tên trường' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Tên trường'
		}
	},
	{
		accessorKey: 'shortcoming',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Khuyết điểm' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Khuyết điểm'
		}
	},
	{
		accessorKey: 'talent',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tài năng' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Tài năng'
		}
	},
	{
		accessorKey: 'rank',
		header: 'Cấp bậc',
		cell: EditableMilitaryRank,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		enableHiding: true,
		meta: {
			label: 'Cấp bậc'
		}
	},
	{
		accessorKey: 'position',
		header: 'Chức vụ',
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chức vụ'
		}
	},
	{
		accessorKey: 'previousUnit',
		header: 'Đơn vị cũ',
		cell: EditableCell,
		enableHiding: true,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Đơn vị cũ'
		}
	},
	{
		accessorKey: 'ethnic',
		header: 'Dân tộc',
		cell: ({ row }) => (
			<Badge className='bg-cyan-500 text-white font-bold'>
				{row.getValue('ethnic')}
			</Badge>
		),
		enableHiding: true,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Dân tộc'
		}
	},
	{
		accessorKey: 'educationLevel',
		header: 'Học vấn',
		cell: ({ row }) => (
			<Badge className='bg-blue-500 dark:bg-blue-600 text-white font-bold'>
				{row.getValue('educationLevel')}
			</Badge>
		),
		enableHiding: true,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Học vấn'
		}
	},
	{
		accessorKey: 'fatherName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ tên bố' />
		),
		cell: EditableCell,
		meta: {
			label: 'Họ tên bố'
		}
	},
	{
		accessorKey: 'fatherJob',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Nghề nghiệp của bố' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Nghề nghiệp của bố'
		}
	},
	{
		accessorKey: 'fatherPhoneNumber',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='SĐT bố' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'SĐT bố'
		}
	},
	{
		accessorKey: 'motherName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ tên mẹ' />
		),
		cell: EditableCell,
		meta: {
			label: 'Họ tên mẹ'
		}
	},
	{
		accessorKey: 'motherJob',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Nghề nghiệp của mẹ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Nghề nghiệp của mẹ'
		}
	},
	// {
	//         accessorKey: 'motherJobAddress',
	//         header: ({ column }) => (
	//                 <DataTableColumnHeader
	//                         column={column}
	//                         title="Nơi làm việc của mẹ"
	//                 />
	//         ),
	//         cell: ({ row }) => (
	//                 <EllipsisText>
	//                         {row.getValue('motherJobAddress')}
	//                 </EllipsisText>
	//         ),
	//         enableHiding: true,
	//         meta: {
	//                 label: 'Nơi làm việc của mẹ',
	//         },
	// },
	{
		accessorKey: 'motherPhoneNumber',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='SĐT mẹ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'SĐT mẹ'
		}
	},
	{
		id: 'actions',
		cell: ({ row }) => <DataTableRowActions row={row} />
	}
]

export const battalionStudentColumns: ColumnDef<Student>[] = [
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
				className='translate-y-[2px] z-99'
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label='Select row'
				className='translate-y-[2px] z-99'
			/>
		),
		enableSorting: false,
		enableHiding: false
	},
	{
		id: 'class.name',
		accessorFn: (row) => `${row.class.name} - ${row.class.unit.alias}`,
		header: 'Lớp',
		cell: ({ row }) => (
			<div className='w-20'>
				<Badge
					className='bg-green-400 text-white font-bold'
					variant='secondary'
				>
					{row.getValue('class.name')}
				</Badge>
			</div>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Lớp'
		}
	},
	{
		accessorKey: 'fullName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ và tên' />
		),
		cell: EditableCell,
		meta: {
			label: 'Họ và tên'
		}
	},
	{
		accessorKey: 'dob',
		header: 'Năm sinh',
		cell: ({ row }) => (
			<div className=''>{isoToDdMmYyyy(row.getValue('dob'))}</div>
		),
		meta: {
			label: 'Năm sinh'
		}
	},
	{
		accessorKey: 'birthPlace',
		header: 'Quê quán',
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Quê quán'
		}
	},
	{
		accessorKey: 'address',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Trú quán' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Trú quán'
		}
	},
	{
		accessorKey: 'enlistmentPeriod',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Thời gian nhập ngũ' />
		),
		cell: ({ row }) => (
			<div className='min-w-32'>{row.getValue('enlistmentPeriod')}</div>
		),
		enableHiding: true,
		meta: {
			label: 'Thời gian nhập ngũ'
		}
	},
	{
		accessorKey: 'isGraduated',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Đã tốt nghiệp' />
		),
		cell: ({ row }) => (
			<Badge
				className={
					row.getValue('isGraduated') ? 'bg-green-500' : 'bg-red-500'
				}
			>
				{row.getValue('isGraduated') ? 'Có' : 'Không'}
			</Badge>
		),
		enableHiding: true,
		meta: {
			label: 'Đã tốt nghiệp'
		}
	},
	{
		accessorKey: 'major',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Chuyên ngành' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chuyên ngành'
		}
	},
	{
		accessorKey: 'phone',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Số điện thoại' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Số điện thoại'
		}
	},
	{
		accessorKey: 'policyBeneficiaryGroup',
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title='Đối tượng chính sách'
			/>
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Đối tượng chính sách'
		}
	},
	{
		accessorKey: 'politicalOrg',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Đoàn/Đảng' />
		),
		cell: ({ row }) => {
			const val = row.getValue('politicalOrg')
			const org =
				val === '' || val === undefined
					? 'N/A'
					: val === 'cpv'
						? 'Đảng'
						: 'Đoàn'

			return (
				<Badge className='bg-purple-500 text-white font-bold'>
					{org}
				</Badge>
			)
		},
		enableHiding: true,
		meta: {
			label: 'Đoàn/Đảng'
		}
	},
	{
		accessorKey: 'politicalOrgOfficialDate',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Ngày vào Đoàn/Đảng' />
		),
		cell: ({ row }) => (
			<div className='min-w-28'>
				{row.getValue('politicalOrgOfficialDate')
					? isoToDdMmYyyy(row.getValue('politicalOrgOfficialDate'))
					: 'N/A'}
			</div>
		),
		enableHiding: true,
		meta: {
			label: 'Ngày vào Đoàn/Đảng'
		}
	},
	{
		accessorKey: 'cpvId',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Số thẻ Đảng' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Số thẻ Đảng'
		}
	},
	{
		accessorKey: 'cpvOfficialAt',
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title='Ngày chính thức vào Đảng'
			/>
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Ngày chính thức vào Đảng'
		}
	},
	{
		accessorKey: 'previousPosition',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Chức vụ cũ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chức vụ cũ'
		}
	},
	{
		accessorKey: 'religion',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tôn giáo' />
		),
		cell: ({ row }) => (
			<Badge className='bg-orange-500 text-white font-bold'>
				{row.getValue('religion')}
			</Badge>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		enableHiding: true,
		meta: {
			label: 'Tôn giáo'
		}
	},
	{
		accessorKey: 'schoolName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tên trường' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Tên trường'
		}
	},
	{
		accessorKey: 'shortcoming',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Khuyết điểm' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Khuyết điểm'
		}
	},
	{
		accessorKey: 'talent',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tài năng' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Tài năng'
		}
	},
	{
		accessorKey: 'rank',
		header: 'Cấp bậc',
		cell: EditableMilitaryRank,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		enableHiding: true,
		meta: {
			label: 'Cấp bậc'
		}
	},
	{
		accessorKey: 'position',
		header: 'Chức vụ',
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chức vụ'
		}
	},
	{
		accessorKey: 'previousUnit',
		header: 'Đơn vị cũ',
		cell: EditableCell,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Đơn vị cũ'
		}
	},
	{
		accessorKey: 'ethnic',
		header: 'Dân tộc',
		cell: ({ row }) => (
			<Badge className='bg-cyan-500 text-white font-bold'>
				{row.getValue('ethnic')}
			</Badge>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Dân tộc'
		}
	},
	{
		accessorKey: 'educationLevel',
		header: 'Học vấn',
		cell: ({ row }) => (
			<Badge className='bg-blue-500 dark:bg-blue-600 text-white font-bold'>
				{row.getValue('educationLevel')}
			</Badge>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Học vấn'
		}
	},
	{
		accessorKey: 'fatherName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ tên bố' />
		),
		cell: EditableCell,
		meta: {
			label: 'Họ tên bố'
		}
	},
	{
		accessorKey: 'fatherJob',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Nghề nghiệp của bố' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Nghề nghiệp của bố'
		}
	},
	{
		accessorKey: 'fatherPhoneNumber',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='SĐT bố' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'SĐT bố'
		}
	},
	{
		accessorKey: 'motherName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ tên mẹ' />
		),
		cell: EditableCell,
		meta: {
			label: 'Họ tên mẹ'
		}
	},
	{
		accessorKey: 'motherJob',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Nghề nghiệp của mẹ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Nghề nghiệp của mẹ'
		}
	},
	// {
	//         accessorKey: 'motherJobAddress',
	//         header: ({ column }) => (
	//                 <DataTableColumnHeader
	//                         column={column}
	//                         title="Nơi làm việc của mẹ"
	//                 />
	//         ),
	//         cell: ({ row }) => (
	//                 <EllipsisText>
	//                         {row.getValue('motherJobAddress')}
	//                 </EllipsisText>
	//         ),
	//         enableHiding: true,
	//         meta: {
	//                 label: 'Nơi làm việc của mẹ',
	//         },
	// },
	{
		accessorKey: 'motherPhoneNumber',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='SĐT mẹ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'SĐT mẹ'
		}
	},
	{
		id: 'actions',
		cell: ({ row }) => <DataTableRowActions row={row} />
	}
]

export const columnsWithoutAction: ColumnDef<Student>[] = [
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
				className='translate-y-[2px] z-99'
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(value) => row.toggleSelected(!!value)}
				aria-label='Select row'
				className='translate-y-[2px] z-99'
			/>
		),
		enableSorting: false,
		enableHiding: false
	},
	...baseStudentsColumns,
	{
		accessorKey: 'birthPlace',
		header: 'Quê quán',
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Quê quán'
		}
	},
	{
		accessorKey: 'address',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Trú quán' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Trú quán'
		}
	},
	{
		accessorKey: 'enlistmentPeriod',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Thời gian nhập ngũ' />
		),
		cell: ({ row }) => (
			<div className='min-w-32'>{row.getValue('enlistmentPeriod')}</div>
		),
		enableHiding: true,
		meta: {
			label: 'Thời gian nhập ngũ'
		}
	},
	{
		accessorKey: 'isGraduated',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Đã tốt nghiệp' />
		),
		cell: ({ row }) => (
			<Badge
				className={
					row.getValue('isGraduated') ? 'bg-green-500' : 'bg-red-500'
				}
			>
				{row.getValue('isGraduated') ? 'Có' : 'Không'}
			</Badge>
		),
		enableHiding: true,
		meta: {
			label: 'Đã tốt nghiệp'
		}
	},
	{
		accessorKey: 'major',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Chuyên ngành' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chuyên ngành'
		}
	},
	{
		accessorKey: 'phone',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Số điện thoại' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Số điện thoại'
		}
	},
	{
		accessorKey: 'policyBeneficiaryGroup',
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title='Đối tượng chính sách'
			/>
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Đối tượng chính sách'
		}
	},
	{
		accessorKey: 'politicalOrg',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Đoàn/Đảng' />
		),
		cell: ({ row }) => {
			const val = row.getValue('politicalOrg')
			const org =
				val === '' || val === undefined
					? 'N/A'
					: val === 'cpv'
						? 'Đảng'
						: 'Đoàn'

			return (
				<Badge className='bg-purple-500 text-white font-bold'>
					{org}
				</Badge>
			)
		},
		enableHiding: true,
		meta: {
			label: 'Đoàn/Đảng'
		}
	},
	{
		accessorKey: 'politicalOrgOfficialDate',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Ngày vào Đoàn/Đảng' />
		),
		cell: ({ row }) => (
			<div className='min-w-28'>
				{row.getValue('politicalOrgOfficialDate')
					? isoToDdMmYyyy(row.getValue('politicalOrgOfficialDate'))
					: 'N/A'}
			</div>
		),
		enableHiding: true,
		meta: {
			label: 'Ngày vào Đoàn/Đảng'
		}
	},
	{
		accessorKey: 'cpvId',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Số thẻ Đảng' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Số thẻ Đảng'
		}
	},
	{
		accessorKey: 'cpvOfficialAt',
		header: ({ column }) => (
			<DataTableColumnHeader
				column={column}
				title='Ngày chính thức vào Đảng'
			/>
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Ngày chính thức vào Đảng'
		}
	},
	{
		accessorKey: 'previousPosition',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Chức vụ cũ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chức vụ cũ'
		}
	},
	{
		accessorKey: 'religion',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tôn giáo' />
		),
		cell: ({ row }) => (
			<Badge className='bg-orange-500 text-white font-bold'>
				{row.getValue('religion')}
			</Badge>
		),
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		enableHiding: true,
		meta: {
			label: 'Tôn giáo'
		}
	},
	{
		accessorKey: 'schoolName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tên trường' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Tên trường'
		}
	},
	{
		accessorKey: 'shortcoming',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Khuyết điểm' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Khuyết điểm'
		}
	},
	{
		accessorKey: 'talent',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Tài năng' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Tài năng'
		}
	},
	{
		accessorKey: 'rank',
		header: 'Cấp bậc',
		cell: EditableMilitaryRank,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		enableHiding: true,
		meta: {
			label: 'Cấp bậc'
		}
	},
	{
		accessorKey: 'position',
		header: 'Chức vụ',
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Chức vụ'
		}
	},
	{
		accessorKey: 'previousUnit',
		header: 'Đơn vị cũ',
		cell: EditableCell,
		enableHiding: true,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Đơn vị cũ'
		}
	},
	{
		accessorKey: 'ethnic',
		header: 'Dân tộc',
		cell: ({ row }) => (
			<Badge className='bg-cyan-500 text-white font-bold'>
				{row.getValue('ethnic')}
			</Badge>
		),
		enableHiding: true,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Dân tộc'
		}
	},
	{
		accessorKey: 'educationLevel',
		header: 'Học vấn',
		cell: ({ row }) => (
			<Badge className='bg-blue-500 dark:bg-blue-600 text-white font-bold'>
				{row.getValue('educationLevel')}
			</Badge>
		),
		enableHiding: true,
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id))
		},
		meta: {
			label: 'Học vấn'
		}
	},
	{
		accessorKey: 'fatherName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ tên bố' />
		),
		cell: EditableCell,
		meta: {
			label: 'Họ tên bố'
		}
	},
	{
		accessorKey: 'fatherJob',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Nghề nghiệp của bố' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Nghề nghiệp của bố'
		}
	},
	{
		accessorKey: 'fatherPhoneNumber',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='SĐT bố' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'SĐT bố'
		}
	},
	{
		accessorKey: 'motherName',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Họ tên mẹ' />
		),
		cell: EditableCell,
		meta: {
			label: 'Họ tên mẹ'
		}
	},
	{
		accessorKey: 'motherJob',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='Nghề nghiệp của mẹ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'Nghề nghiệp của mẹ'
		}
	},
	// {
	//         accessorKey: 'motherJobAddress',
	//         header: ({ column }) => (
	//                 <DataTableColumnHeader
	//                         column={column}
	//                         title="Nơi làm việc của mẹ"
	//                 />
	//         ),
	//         cell: ({ row }) => (
	//                 <EllipsisText>
	//                         {row.getValue('motherJobAddress')}
	//                 </EllipsisText>
	//         ),
	//         enableHiding: true,
	//         meta: {
	//                 label: 'Nơi làm việc của mẹ',
	//         },
	// },
	{
		accessorKey: 'motherPhoneNumber',
		header: ({ column }) => (
			<DataTableColumnHeader column={column} title='SĐT mẹ' />
		),
		cell: EditableCell,
		enableHiding: true,
		meta: {
			label: 'SĐT mẹ'
		}
	}
]
