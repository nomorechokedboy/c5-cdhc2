import { useQuery } from '@tanstack/react-query'
import { GetLeavePersonnel } from '@/api/leave'
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog'

export default function PersonnelPreviewDialog({
	personnelId,
	fallbackName,
	onClose
}: {
	personnelId: number
	fallbackName?: string | null
	onClose: () => void
}) {
	const { data, isLoading } = useQuery({
		queryKey: ['leave-personnel', personnelId],
		queryFn: () => GetLeavePersonnel(personnelId)
	})

	const rows = data
		? [
				['Mã quân nhân', data.code],
				['Họ tên', data.fullName],
				['Đối tượng', data.objectType],
				['Cấp bậc', data.rank],
				['Chức vụ', data.position],
				['Đơn vị', data.unitName],
				['Ngày nhập ngũ', data.enlistmentDate],
				['Email', data.email]
			]
		: []

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>
						Thông tin quân nhân:{' '}
						{data?.fullName || fallbackName || personnelId}
					</DialogTitle>
				</DialogHeader>
				{isLoading ? (
					<p className='text-sm text-muted-foreground'>Đang tải...</p>
				) : (
					<div className='grid grid-cols-2 gap-x-4 gap-y-3 text-sm'>
						{rows.map(([label, value]) => (
							<div key={label}>
								<div className='text-muted-foreground'>
									{label}
								</div>
								<div className='font-medium'>
									{value || '—'}
								</div>
							</div>
						))}
					</div>
				)}
			</DialogContent>
		</Dialog>
	)
}
