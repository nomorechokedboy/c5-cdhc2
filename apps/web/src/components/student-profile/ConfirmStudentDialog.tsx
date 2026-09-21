import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'

interface ConfirmStudentDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	studentName?: string
	pending: boolean
	onConfirm: () => void
}

/** Hỏi lại trước khi xác nhận vì sau đó học viên không sửa được nữa */
export function ConfirmStudentDialog({
	open,
	onOpenChange,
	studentName,
	pending,
	onConfirm
}: ConfirmStudentDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='h-auto max-w-md'>
				<DialogHeader>
					<DialogTitle>Xác nhận hồ sơ học viên</DialogTitle>
					<DialogDescription>
						Xác nhận hồ sơ{studentName ? ` của ${studentName}` : ''}
						? Sau khi xác nhận, bạn không thể chỉnh sửa thông tin
						học viên này nữa.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter>
					<Button
						type='button'
						variant='outline'
						onClick={() => onOpenChange(false)}
						disabled={pending}
					>
						Hủy
					</Button>
					<Button
						type='button'
						onClick={onConfirm}
						disabled={pending}
					>
						{pending ? 'Đang xác nhận...' : 'Xác nhận hồ sơ'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
