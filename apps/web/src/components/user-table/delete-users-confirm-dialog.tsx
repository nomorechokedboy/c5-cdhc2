/**
 * Dialog xác nhận xóa người dùng — hiển thị bảng các user sẽ bị xóa.
 */
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2 } from 'lucide-react'
import type { User } from '@/types'
import { canSeeUsernames } from '@/lib/utils'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	users: User[]
	pending?: boolean
	onConfirm: () => void | Promise<void>
}

function unitOrNganhLabel(u: User): string {
	const labels = u.nganhLabels || []
	if (labels.length) {
		return labels.map((n) => `${n.code} — ${n.name}`).join('; ')
	}
	if (u.nganhCodes?.length) return u.nganhCodes.join('; ')
	const unit = u.unit
	if (unit) {
		return `${unit.alias ? `${unit.alias} — ` : ''}${unit.name}`
	}
	return u.unitName || '—'
}

export default function DeleteUsersConfirmDialog({
	open,
	onOpenChange,
	users,
	pending,
	onConfirm
}: Props) {
	const count = users.length
	const showLogin = canSeeUsernames()

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className='sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col'>
				<DialogHeader>
					<DialogTitle className='flex items-center gap-2 text-destructive'>
						<Trash2 className='w-5 h-5' />
						Xác nhận xóa {count} người dùng
					</DialogTitle>
				</DialogHeader>

				<p className='text-sm text-muted-foreground'>
					Bạn sắp xóa{' '}
					<strong className='text-foreground'>{count}</strong> tài
					khoản sau. Hành động <strong>không thể hoàn tác</strong>.
				</p>

				<div className='rounded-lg border overflow-auto max-h-[min(50vh,360px)] flex-1 min-h-0'>
					<Table className='min-w-[520px]'>
						<TableHeader>
							<TableRow className='bg-muted/40'>
								<TableHead className='w-10 text-center'>
									#
								</TableHead>
								<TableHead>Họ và tên</TableHead>
								{showLogin && (
									<TableHead>Tên tài khoản</TableHead>
								)}
								<TableHead>Đơn vị / Ngành</TableHead>
								<TableHead className='w-24'>
									Trạng thái
								</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map((u, i) => (
								<TableRow key={u.id} className='align-top'>
									<TableCell className='text-center text-muted-foreground tabular-nums text-xs'>
										{i + 1}
									</TableCell>
									<TableCell className='font-medium text-sm break-words'>
										{u.displayName || '—'}
										{u.isSuperUser ? (
											<Badge className='ml-1.5 text-[10px] h-5'>
												Admin
											</Badge>
										) : null}
									</TableCell>
									{showLogin && (
										<TableCell className='font-mono text-sm'>
											{u.username}
										</TableCell>
									)}
									<TableCell className='text-sm text-muted-foreground break-words'>
										{unitOrNganhLabel(u)}
									</TableCell>
									<TableCell className='text-xs'>
										{u.status === 'pending' ? (
											<Badge variant='destructive'>
												pending
											</Badge>
										) : (
											<Badge variant='secondary'>
												{u.status || '—'}
											</Badge>
										)}
									</TableCell>
								</TableRow>
							))}
							{!users.length ? (
								<TableRow>
									<TableCell
										colSpan={5}
										className='text-center text-muted-foreground py-8'
									>
										Không có người dùng nào được chọn.
									</TableCell>
								</TableRow>
							) : null}
						</TableBody>
					</Table>
				</div>

				<DialogFooter className='gap-2 sm:gap-2'>
					<Button
						type='button'
						variant='outline'
						disabled={pending}
						onClick={() => onOpenChange(false)}
					>
						Hủy
					</Button>
					<Button
						type='button'
						variant='destructive'
						disabled={pending || !count}
						onClick={() => void onConfirm()}
					>
						{pending ? (
							<>
								<Loader2 className='w-4 h-4 mr-1.5 animate-spin' />
								Đang xóa…
							</>
						) : (
							<>
								<Trash2 className='w-4 h-4 mr-1.5' />
								Xóa {count} người dùng
							</>
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
