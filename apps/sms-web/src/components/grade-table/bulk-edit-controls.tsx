import { Button } from '@repo/ui/components/ui/button'
import { Edit2, Edit3, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
	const { t } = useTranslation()

	if (bulkEditMode) {
		return (
			<Button variant='outline' onClick={onExitBulkEdit}>
				<X className='h-4 w-4 mr-2' />
				{t('grades.exitEdit')}
			</Button>
		)
	}

	return (
		<div className='flex items-center gap-2'>
			<Button variant='outline' onClick={onEditAll}>
				<Edit2 className='h-4 w-4 mr-2' />
				{t('grades.editAllButton')}
			</Button>
			<Button variant='outline' onClick={onEditCategory}>
				<Edit3 className='h-4 w-4 mr-2' />
				{t('grades.editCategoryButton')}
			</Button>
		</div>
	)
}
