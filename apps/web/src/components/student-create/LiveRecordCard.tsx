import { useStore } from '@tanstack/react-form'
import { RecordCard } from './RecordCard'
import { recordFromValues, type RecordView } from './record'

/**
 * Thẻ hồ sơ đọc thẳng từ giá trị form. Có `frozen` (sau khi tạo xong, lúc form
 * đã được xoá) thì hiện bản đã chụp và đóng dấu.
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
	return (
		<RecordCard
			record={frozen ?? recordFromValues(values)}
			done={done}
			total={total}
			stamped={!!frozen}
		/>
	)
}
