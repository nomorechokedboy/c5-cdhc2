import { useStore } from '@tanstack/react-form'
import useUnitOptions from '@/hooks/useUnitOptions'
import { ApprovedStamp } from '../student-profile/approved-stamp'
import { RecordCard } from '../student-record/RecordCard'
import { recordFromValues, type RecordView } from '../student-record/record'

/**
 * Thẻ hồ sơ đọc thẳng từ giá trị form. Có `frozen` (sau khi tạo xong, lúc form
 * đã được xoá) thì hiện bản đã chụp và đóng dấu «Đã lập hồ sơ».
 */
export function LiveRecordCard({
	form,
	frozen,
	done,
	total
}: {
	form: any
	frozen: RecordView | null
	done: number
	total: number
}) {
	const values = useStore(form.store, (s: any) => s.values)
	const { options } = useUnitOptions('class')
	const record = frozen ?? recordFromValues(values)
	const unitLabel = options.find(
		(o) => o.value === String(record.unitId ?? '')
	)?.label

	return (
		<RecordCard
			record={record}
			unitLabel={unitLabel}
			footer={
				<p className='text-sm text-sidebar-foreground/70'>
					<span className='tabular font-display text-lg font-semibold text-gold'>
						{done}/{total}
					</span>{' '}
					phần đã ghi
				</p>
			}
			overlay={
				frozen && (
					<div className='absolute inset-0 grid place-items-center bg-sidebar/70'>
						<ApprovedStamp
							label='Đã lập hồ sơ'
							ariaLabel='Hồ sơ đã lập'
							className='size-44'
						/>
					</div>
				)
			}
		/>
	)
}
