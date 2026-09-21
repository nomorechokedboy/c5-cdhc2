import type { ImportRow } from './parse'
import { reviewFields } from './review-fields'

/**
 * Toàn bộ dữ liệu của một dòng file, đúng thứ tự cột mẫu, để đối chiếu trước khi
 * import. Ô file để trống hiện «-» mờ.
 */
export function RowDetail({ row }: { row: ImportRow }) {
	return (
		<dl
			aria-label={`Chi tiết dòng ${row.rowNumber}`}
			className='grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2 xl:grid-cols-3'
		>
			{reviewFields(row).map(({ key, label, value }) => (
				<div key={key} className='min-w-0'>
					<dt className='text-xs text-muted-foreground'>{label}</dt>
					<dd className='break-words'>
						{value || (
							<span className='text-muted-foreground/60'>-</span>
						)}
					</dd>
				</div>
			))}
		</dl>
	)
}
