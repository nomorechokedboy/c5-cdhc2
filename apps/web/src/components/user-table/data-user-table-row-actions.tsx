import type { Row } from '@tanstack/react-table'
import { MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import type { OnDeleteRows, User } from '@/types'
import {
	Dialog,
	DialogHeader,
	DialogTitle,
	DialogContent
} from '@/components/ui/dialog'
import UserInfoTabs from './user-info-tabs'
import { useState, type MouseEvent } from 'react'
import useDeleteStudents from '@/hooks/useDeleteStudents'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { useDeleteUsers } from './useDeleteUsers'
import useUserData from '@/hooks/useUsers'
import { isSuperAdmin } from '@/lib/utils'

interface DataTableRowActionsProps<TData> {
	row: Row<TData>
	onDeleteRows?: OnDeleteRows
}

export function DataTableRowActions<TData>({
	row,
	onDeleteRows
}: DataTableRowActionsProps<TData>) {
	const user = row.original as unknown as User
	// Thêm log để debug
	console.log('Row original:', row.original)
	console.log('Student cast:', user)
	const [dialogOpen, setDialogOpen] = useState(false)
	const {
		data: users = [],
		isLoading: isLoadingStudents,
		refetch: refetchStudents
	} = useUserData()
	console.log('isloading', isLoadingStudents)
	const { mutateAsync: deleteUserMutate, isPending: isDeletingStudent } =
		useDeleteUsers()

	function handleOpenDialog() {
		setDialogOpen(true)
	}

	async function handleDeleteRow(_: MouseEvent<HTMLDivElement>) {
		try {
			if (
				!confirm(
					'Bạn có chắc chắn muốn xóa người dùng này không? Hành động này không thể hoàn tác.'
				)
			) {
				return
			}
			await deleteUserMutate([user.id]).then(() =>
				onDeleteRows?.([user.id])
			)
			toast.success('Xóa dữ liệu thành công!')
			refetchStudents()
		} catch (err) {
			toast.error(err.message ?? 'Lỗi xóa dữ liệu!')
			if (err instanceof AxiosError) {
				console.error('Http error: ', err.response?.data)
			}
		}
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant='ghost'
						className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
						disabled={isDeletingStudent}
					>
						<MoreHorizontal />
						<span className='sr-only'>Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end' className='w-[160px]'>
					<DropdownMenuItem onClick={handleOpenDialog}>
						Chi tiết
					</DropdownMenuItem>
					{isSuperAdmin() && (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								disabled={isDeletingStudent}
								onClick={handleDeleteRow}
							>
								Xóa
								<DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
							</DropdownMenuItem>
						</>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className='max-w-7xl h-[90vh] overflow-y-auto p-6'>
					<DialogHeader className='flex items-center justify-between'>
						<DialogTitle>Thông tin người dùng</DialogTitle>
					</DialogHeader>

					<UserInfoTabs user={user} />
				</DialogContent>
			</Dialog>
		</>
	)
}
