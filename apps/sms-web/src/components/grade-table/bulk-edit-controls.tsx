import { Button } from '@repo/ui/components/ui/button'
import { Edit2, Edit3, X } from 'lucide-react'

interface BulkEditControlsProps {
	bulkEditMode: 'single-category' | 'all-grades' | null
	onEditAll: () => void
	onEditCategory: () => void
	onExitBulkEdit: () => void
}

export default function BulkEditControls({
	bulkEditMode,
	onEditAll,
	onEditCategory,
	onExitBulkEdit
}: BulkEditControlsProps) {
	if (bulkEditMode) {
		return (
			<Button variant='outline' onClick={onExitBulkEdit}>
				<X className='h-4 w-4 mr-2' />
				Thoát khỏi chế độ chỉnh sửa
			</Button>
		)
	}

	return (
		<div className='flex items-center gap-2'>
			<Button variant='outline' onClick={onEditAll}>
				<Edit2 className='h-4 w-4 mr-2' />
				Chỉnh sửa toàn bộ điểm số học viên
			</Button>
			<Button variant='outline' onClick={onEditCategory}>
				<Edit3 className='h-4 w-4 mr-2' />
				Chỉnh sửa một cột điểm học viên
			</Button>
		</div>
	)
}
