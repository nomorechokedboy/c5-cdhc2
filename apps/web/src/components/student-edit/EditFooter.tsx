import { Button } from '@/components/ui/button'
import {
	PROFILE_TABS,
	type ProfileTabValue
} from '../student-profile/profile-tabs'

interface EditFooterProps {
	formId: string
	isPending: boolean
	errorTabs: ReadonlySet<ProfileTabValue>
	onCancel?: () => void
}

/** Thanh thao tác ở đáy: nói rõ tab nào còn lỗi, Hủy và Lưu thay đổi */
export function EditFooter({
	formId,
	isPending,
	errorTabs,
	onCancel
}: EditFooterProps) {
	const errorLabels = PROFILE_TABS.filter((t) => errorTabs.has(t.value)).map(
		(t) => t.label
	)

	return (
		<div className='flex items-center justify-between gap-4'>
			<p role='status' className='text-sm text-destructive'>
				{errorLabels.length > 0 &&
					`Cần sửa lại ở: ${errorLabels.join(', ')}`}
			</p>
			<div className='flex gap-2'>
				<Button type='button' variant='outline' onClick={onCancel}>
					Hủy
				</Button>
				<Button type='submit' form={formId} disabled={isPending}>
					{isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
				</Button>
			</div>
		</div>
	)
}
