import { SearchableSelect } from '@/components/ui/searchable-select'
import useUnitOptions from '@/hooks/useUnitOptions'
import type { Unit, UnitLevel } from '@/types'

export interface UnitSelectProps {
	/** Cấp đơn vị được chọn (mặc định: lớp) */
	level?: UnitLevel
	/** Chỉ hiện đơn vị con của đơn vị này (vd. lớp của một đại đội) */
	parentId?: number
	/** Chấp nhận cả number lẫn string (giá trị từ form/API/Excel) */
	value?: number | string | null
	onChange: (id: number | undefined, unit?: Unit) => void
	placeholder?: string
	searchPlaceholder?: string
	disabled?: boolean
	compact?: boolean
	className?: string
}

const DEFAULT_PLACEHOLDER: Record<UnitLevel, string> = {
	battalion: 'Chọn tiểu đoàn',
	company: 'Chọn đại đội',
	class: 'Chọn lớp'
}

/**
 * Dropdown chọn đơn vị dùng chung toàn web: tìm không dấu theo tên/alias/đơn vị cha,
 * nhóm theo đơn vị cha (lớp theo đại đội, đại đội theo tiểu đoàn).
 */
export default function UnitSelect({
	level = 'class',
	parentId,
	value,
	onChange,
	placeholder,
	searchPlaceholder = 'Gõ tên hoặc mã để tìm…',
	disabled,
	compact,
	className
}: UnitSelectProps) {
	const { options, isLoading } = useUnitOptions(level, { parentId })
	const selected =
		value === null || value === undefined || value === ''
			? ''
			: String(value)

	return (
		<SearchableSelect
			options={options}
			value={selected}
			onValueChange={(v) => {
				const opt = options.find((o) => o.value === v)
				onChange(v === '' ? undefined : Number(v), opt?.unit)
			}}
			placeholder={
				isLoading
					? 'Đang tải…'
					: (placeholder ?? DEFAULT_PLACEHOLDER[level])
			}
			searchPlaceholder={searchPlaceholder}
			disabled={disabled || isLoading}
			compact={compact}
			className={className}
		/>
	)
}
