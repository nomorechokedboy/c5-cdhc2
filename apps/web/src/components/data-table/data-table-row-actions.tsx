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
import type { Student } from '@/types'
import {
	Dialog,
	DialogHeader,
	DialogTitle,
	DialogContent
} from '@/components/ui/dialog'
import StudentInfoTabs from '../student-info-tabs'
import { useState } from 'react'

interface DataTableRowActionsProps<TData> {
	row: Row<TData>
}

export function DataTableRowActions<TData>({
	row
}: DataTableRowActionsProps<TData>) {
	const student = row.original as unknown as Student
	const [dialogOpen, setDialogOpen] = useState(false)

	function handleOpenDialog() {
		setDialogOpen(true)
	}

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						variant='ghost'
						className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
					>
						<MoreHorizontal />
						<span className='sr-only'>Open menu</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end' className='w-[160px]'>
					<DropdownMenuItem onClick={handleOpenDialog}>
						Chi tiết
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						Xóa
						<DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogContent className='max-w-7xl h-[90vh] overflow-y-auto p-6'>
					<DialogHeader className='flex items-center justify-between'>
						<DialogTitle>Thông tin học viên</DialogTitle>
					</DialogHeader>

					<StudentInfoTabs student={student} />
				</DialogContent>
			</Dialog>
		</>
	)
}
