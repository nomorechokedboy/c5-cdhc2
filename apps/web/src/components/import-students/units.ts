import { normalize } from '@/components/ui/searchable-select'
import type { UnitOption } from '@/hooks/useUnitOptions'

/** "Lớp 1 - Đại đội 1" — nhãn dùng trong file Excel và bảng xem trước */
export function unitLabel(option: UnitOption): string {
	return option.group ? `${option.label} - ${option.group}` : option.label
}

export type UnitResolution =
	| { unitId: number; problem?: undefined }
	| { unitId?: undefined; problem: 'empty' | 'notFound' | 'ambiguous' }

/**
 * Ô "Lớp" trong file → id lớp. Chấp nhận:
 *  1. ID lớp (file mẫu cũ)
 *  2. "Tên lớp - Tên đại đội" (giá trị dropdown của file mẫu mới)
 *  3. Tên lớp hoặc mã (alias) nếu không trùng với lớp khác
 * Trùng tên giữa các đại đội → `ambiguous`, người dùng chọn lại ở bảng xem trước.
 */
export function resolveUnit(
	input: string,
	options: UnitOption[]
): UnitResolution {
	const text = input.trim()
	if (!text) return { problem: 'empty' }

	if (/^\d+$/.test(text)) {
		const byId = options.find((o) => o.value === text)
		if (byId) return { unitId: Number(byId.value) }
	}

	const key = normalize(text)
	const tiers: Array<(o: UnitOption) => string | undefined> = [
		(o) => unitLabel(o),
		(o) => o.label,
		(o) => o.unit.alias
	]

	for (const pick of tiers) {
		const matches = options.filter((o) => {
			const candidate = pick(o)
			return candidate !== undefined && normalize(candidate) === key
		})
		if (matches.length === 1) return { unitId: Number(matches[0].value) }
		if (matches.length > 1) return { problem: 'ambiguous' }
	}
	return { problem: 'notFound' }
}
