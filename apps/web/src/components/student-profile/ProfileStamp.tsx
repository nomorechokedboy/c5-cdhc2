import { ApprovedStamp } from './approved-stamp'

/** Dấu đỏ «Đã xác nhận» trên thẻ hồ sơ; chỉ hồ sơ đã xác nhận mới có */
export function ProfileStamp({ status }: { status?: string }) {
	if (status !== 'confirmed') return null
	return <ApprovedStamp className='mx-auto size-28 lg:size-32' />
}

/** Nhãn «Chờ xác nhận» cho hồ sơ chưa xác nhận */
export function PendingBadge({ status }: { status?: string }) {
	if (status !== 'pending') return null
	return (
		<p className='w-fit rounded-full border border-gold bg-gold/15 px-3 py-0.5 text-sm font-medium text-sidebar-foreground'>
			Chờ xác nhận
		</p>
	)
}
