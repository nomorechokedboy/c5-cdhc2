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
import { useState } from 'react'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { useDeleteUsers } from './useDeleteUsers'
import { isSuperAdmin } from '@/lib/utils'
import AssignRoleDialog from './assign-role-dialog'
import AssignNganhDialog from './assign-nganh-dialog'
import ResetPasswordDialog from './reset-password-dialog'
import DeleteUsersConfirmDialog from './delete-users-confirm-dialog'
import useUserData from '@/hooks/useUsers'
import { useQueryClient } from '@tanstack/react-query'

interface DataTableRowActionsProps<TData> {
	row: Row<TData>
	onDeleteRows?: OnDeleteRows
}

export function DataTableRowActions<TData>({
	row,
	onDeleteRows
}: DataTableRowActionsProps<TData>) {
	const user = row.original as unknown as User
	const [dialogOpen, setDialogOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const qc = useQueryClient()
	const { refetch: refetchUsers } = useUserData()

	const { mutateAsync: deleteUserMutate, isPending: isDeleting } =
		useDeleteUsers()

	const [assignRoleDialogOpen, setAssignRoleDialogOpen] = useState(false)
	const [assignNganhOpen, setAssignNganhOpen] = useState(false)
	const [resetPwOpen, setResetPwOpen] = useState(false)

	function handleOpenDialog() {
		setDialogOpen(true)
	}

	async function confirmDelete() {
		try {
			if (user.isSuperUser) {
				toast.error('Không thể xóa tài khoản admin')
				return
			}
			await deleteUserMutate([user.id])
			onDeleteRows?.([user.id])
			await Promise.all([
				refetchUsers(),
				qc.invalidateQueries({ queryKey: ['users'] }),
				qc.invalidateQueries({ queryKey: ['pending-permissions'] }),
				qc.refetchQueries({ queryKey: ['users'], type: 'all' })
			])
			toast.success(`Đã xóa «${user.displayName || user.username}»`)
			setDeleteOpen(false)
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Lỗi xóa dữ liệu!'
			toast.error(msg)
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
						disabled={isDeleting}
					>
						<MoreHorizontal />
						<span className='sr-only'>Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end' className='w-[180px]'>
					<DropdownMenuItem onClick={handleOpenDialog}>
						Chi tiết
					</DropdownMenuItem>
					{isSuperAdmin() && (
						<>
							<DropdownMenuItem
								onClick={() => setResetPwOpen(true)}
							>
								Đặt lại mật khẩu
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => setAssignRoleDialogOpen(true)}
							>
								Phân quyền
							</DropdownMenuItem>
							<DropdownMenuItem
								onClick={() => setAssignNganhOpen(true)}
							>
								Gán ngành
							</DropdownMenuItem>
							<DropdownMenuSeparator />
							<DropdownMenuItem
								disabled={isDeleting || !!user.isSuperUser}
								className='text-destructive focus:text-destructive'
								onClick={() => setDeleteOpen(true)}
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

			<DeleteUsersConfirmDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				users={[user]}
				pending={isDeleting}
				onConfirm={confirmDelete}
			/>

			{assignRoleDialogOpen && (
				<AssignRoleDialog
					open={assignRoleDialogOpen}
					onOpenChange={setAssignRoleDialogOpen}
					userId={user.id}
					userName={user.displayName}
				/>
			)}
			{assignNganhOpen && (
				<AssignNganhDialog
					open={assignNganhOpen}
					onOpenChange={setAssignNganhOpen}
					user={user}
				/>
			)}
			{resetPwOpen && (
				<ResetPasswordDialog
					open={resetPwOpen}
					onOpenChange={setResetPwOpen}
					user={user}
					onSuccess={() => refetchUsers()}
				/>
			)}
		</>
	)
}
