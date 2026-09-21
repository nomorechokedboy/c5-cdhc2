import { toDisplayDate } from '@/lib/student-dates'
import { cn } from '@/lib/utils'

export interface ProfileFieldItem {
	label: string
	value?: string | number | null
	/** Giá trị lưu là mã (vd. «cpv»); cho nhãn hiển thị tương ứng */
	options?: ReadonlyArray<{ label: string; value: string }>
	/** Giá trị là ngày lưu yyyy-mm-dd; hiển thị dd/mm/yyyy như ô sửa */
	date?: boolean
}

function displayValue({ value, options, date }: ProfileFieldItem) {
	if (value === undefined || value === null || value === '') return undefined
	if (date) return toDisplayDate(String(value)) || undefined
	if (!options) return String(value)
	return options.find((option) => option.value === String(value))?.label
}

/** Một cặp nhãn – giá trị chỉ đọc; thiếu dữ liệu hiện «-» mờ */
export function ProfileField({
	className,
	...item
}: ProfileFieldItem & { className?: string }) {
	const shown = displayValue(item)
	return (
		<div className={cn('min-w-0', className)}>
			<p className='text-xs font-medium text-muted-foreground'>
				{item.label}
			</p>
			<p className={cn('break-words', !shown && 'text-muted-foreground')}>
				{shown ?? '-'}
			</p>
		</div>
	)
}

/** Danh sách field khai báo bằng dữ liệu; đặt trong lưới của `FormSection` */
export function ProfileFields({ items }: { items: ProfileFieldItem[] }) {
	return (
		<>
			{items.map((item) => (
				<ProfileField key={item.label} {...item} />
			))}
		</>
	)
}
