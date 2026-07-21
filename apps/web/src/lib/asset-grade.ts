/**
 * Phân cấp chất lượng vật tư 1–5
 * 1 rất tốt · 2 tốt · 3 bình thường · 4 có khả năng hư hỏng · 5 hỏng
 */
export const ASSET_GRADES = [
	{ value: 1, label: '1 — Rất tốt', short: 'Rất tốt' },
	{ value: 2, label: '2 — Tốt', short: 'Tốt' },
	{ value: 3, label: '3 — Bình thường', short: 'Bình thường' },
	{
		value: 4,
		label: '4 — Có khả năng hư hỏng',
		short: 'Có khả năng hư hỏng'
	},
	{ value: 5, label: '5 — Hỏng', short: 'Hỏng' }
] as const

/** Tăng phân cấp chỉ cho phép về cấp 1–4 (không phải 5) */
export const GRADE_UP_TARGET_GRADES = ASSET_GRADES.filter((g) => g.value <= 4)

export function gradeLabel(grade: number | null | undefined): string {
	const g = grade ?? 1
	const found = ASSET_GRADES.find((x) => x.value === g)
	return found ? found.label : `Cấp ${g}`
}

export function gradeShort(grade: number | null | undefined): string {
	const g = grade ?? 1
	const found = ASSET_GRADES.find((x) => x.value === g)
	return found ? `${g} (${found.short})` : String(g)
}

/** Đã hoàn thành sửa chữa (có ngày hoàn thành) */
export function isAssetRepaired(asset: {
	repairCompletedAt?: string | null
	status?: string | null
}): boolean {
	return !!(asset.repairCompletedAt && String(asset.repairCompletedAt).trim())
}

/**
 * Kiểm tra được phép "Tăng phân cấp" (GRADE_UP).
 * - Cấp sau khi tăng chỉ 1–4 (cấp 5 = hỏng, bắt buộc sửa, không dùng tăng cấp)
 * - Nếu đang cấp 5 / hỏng / đang sửa: phải đã hoàn thành sửa chữa
 */
export function validateGradeUp(params: {
	currentGrade: number
	newGrade: number
	status?: string | null
	repairCompletedAt?: string | null
}): { ok: true } | { ok: false; message: string } {
	const current = params.currentGrade || 1
	const next = params.newGrade

	if (next < 1 || next > 4) {
		return {
			ok: false,
			message:
				'Tăng phân cấp chỉ được đặt cấp 1, 2, 3 hoặc 4. Cấp 5 là hỏng — bắt buộc sửa chữa, không dùng tăng phân cấp.'
		}
	}

	const needsRepairGate =
		current === 5 ||
		params.status === 'BROKEN' ||
		params.status === 'REPAIRING'

	if (needsRepairGate && !isAssetRepaired(params)) {
		return {
			ok: false,
			message: `Vật tư đang ${gradeShort(current)}${
				params.status === 'BROKEN'
					? ' (hỏng)'
					: params.status === 'REPAIRING'
						? ' (đang sửa)'
						: ''
			} và chưa hoàn thành sửa chữa — không được cập nhật tăng phân cấp. Hãy hoàn thành sửa chữa trước.`
		}
	}

	return { ok: true }
}
