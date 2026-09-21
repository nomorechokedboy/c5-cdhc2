import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'

export interface ConfirmOptions {
	title: string
	description?: string
	/** Chữ trên nút đồng ý; mặc định «Đồng ý» */
	confirmLabel?: string
	/** Việc xoá/không hoàn tác: nút đồng ý màu đỏ */
	destructive?: boolean
}

interface ConfirmDialogProps extends ConfirmOptions {
	open: boolean
	onConfirm: () => void
	/** Hủy, đóng bằng Esc hoặc bấm ra ngoài */
	onCancel: () => void
}

/** Hộp thoại hỏi lại theo giao diện của hệ thống, thay cho `confirm()` của trình duyệt */
export function ConfirmDialog({
	open,
	title,
	description,
	confirmLabel = 'Đồng ý',
	destructive,
	onConfirm,
	onCancel
}: ConfirmDialogProps) {
	return (
		<Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
			<DialogContent className='h-auto max-w-md'>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					{description && (
						<DialogDescription>{description}</DialogDescription>
					)}
				</DialogHeader>
				<DialogFooter>
					<Button type='button' variant='outline' onClick={onCancel}>
						Hủy
					</Button>
					<Button
						type='button'
						variant={destructive ? 'destructive' : 'default'}
						onClick={onConfirm}
					>
						{confirmLabel}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
