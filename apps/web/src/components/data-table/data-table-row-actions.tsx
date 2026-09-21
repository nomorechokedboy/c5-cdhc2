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
import type { OnDeleteRows, Student } from '@/types'
import { Dialog, DialogTitle, DialogContent } from '@/components/ui/dialog'
import { StudentProfile } from '../student-profile'
import { RECORD_DIALOG_CLASS, RECORD_TITLE_CLASS } from '../student-record'
import { useState, type MouseEvent } from 'react'
import useDeleteStudents from '@/hooks/useDeleteStudents'
import { toast } from 'sonner'
import { AxiosError } from 'axios'
import { isSuperAdmin } from '@/lib/utils'
import { useConfirm } from '../confirm-dialog'

interface DataTableRowActionsProps<TData> {
	row: Row<TData>
	onDeleteRows?: OnDeleteRows
}

export function DataTableRowActions<TData>({
	row,
	onDeleteRows
}: DataTableRowActionsProps<TData>) {
	const student = row.original as unknown as Student
	const [dialogOpen, setDialogOpen] = useState(false)
	const { mutateAsync: deleteStudentMutate, isPending: isDeletingStudent } =
		useDeleteStudents()

	const { confirm, confirmDialog } = useConfirm()

	const canDelete = isSuperAdmin() || student.status !== 'confirmed'

	function handleOpenDialog() {
		setDialogOpen(true)
	}

	async function handleDeleteRow(_: MouseEvent<HTMLDivElement>) {
		try {
			const ok = await confirm({
				title: 'Xóa học viên này?',
				description: 'Hành động này không thể hoàn tác.',
				confirmLabel: 'Xóa',
				destructive: true
			})
			if (!ok) return
			await deleteStudentMutate({ ids: [student.id] }).then(() =>
				onDeleteRows?.([student.id])
			)
			toast.success('Xóa dữ liệu thành công!')
		} catch (err) {
			toast.error('Xóa dữ liệu bị lỗi!')
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
					{canDelete && (
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
			{confirmDialog}
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className={RECORD_DIALOG_CLASS}>
					<StudentProfile
						student={student}
						heading={
							<DialogTitle className={RECORD_TITLE_CLASS}>
								Thông tin học viên
							</DialogTitle>
						}
					/>
				</DialogContent>
			</Dialog>
		</>
	)
}
