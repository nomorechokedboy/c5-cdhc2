import { Button } from '@/components/ui/button'
import {
	PROFILE_TABS,
	type ProfileTabValue
} from '../student-profile/profile-tabs'

interface EditFooterProps {
	isPending: boolean
	errorTabs: ReadonlySet<ProfileTabValue>
	onCancel?: () => void
}

/** Thanh thao tác dính đáy hộp thoại: luôn thấy nút Lưu dù form dài */
export function EditFooter({
	isPending,
	errorTabs,
	onCancel
}: EditFooterProps) {
	const errorLabels = PROFILE_TABS.filter((t) => errorTabs.has(t.value)).map(
		(t) => t.label
	)

	return (
		<div className='sticky bottom-0 z-10 -mx-6 -mb-6 mt-auto flex items-center justify-between gap-4 border-t bg-card/95 px-6 py-3 backdrop-blur'>
			<p role='status' className='text-sm text-destructive'>
				{errorLabels.length > 0 &&
					`Cần sửa lại ở: ${errorLabels.join(', ')}`}
			</p>
			<div className='flex gap-2'>
				<Button type='button' variant='outline' onClick={onCancel}>
					Hủy
				</Button>
				<Button type='submit' disabled={isPending}>
					{isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
				</Button>
			</div>
		</div>
	)
}
