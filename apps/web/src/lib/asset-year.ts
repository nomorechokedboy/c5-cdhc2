/** Năm sản xuất / năm sử dụng tối thiểu (theo quy định) */
export const MIN_ASSET_YEAR = 2000

export function maxAssetYear(): number {
	return new Date().getFullYear() + 1
}

/**
 * Kiểm tra năm SX / năm SD.
 * @returns thông báo lỗi hoặc null nếu hợp lệ (trống = bỏ qua)
 */
export function validateAssetYears(opts: {
	manufactureYear?: string | number | null
	usageYear?: string | number | null
}): string | null {
	const maxY = maxAssetYear()
	const parse = (v: string | number | null | undefined): number | null => {
		if (v === undefined || v === null || v === '') return null
		const n = typeof v === 'number' ? v : Number(String(v).trim())
		if (!Number.isFinite(n)) return NaN
		return Math.floor(n)
	}
	const mfg = parse(opts.manufactureYear)
	const use = parse(opts.usageYear)
	if (mfg !== null) {
		if (Number.isNaN(mfg)) return 'Năm sản xuất không hợp lệ'
		if (mfg < MIN_ASSET_YEAR)
			return `Năm sản xuất phải từ ${MIN_ASSET_YEAR} trở đi`
		if (mfg > maxY) return `Năm sản xuất không được lớn hơn ${maxY}`
	}
	if (use !== null) {
		if (Number.isNaN(use)) return 'Năm sử dụng không hợp lệ'
		if (use < MIN_ASSET_YEAR)
			return `Năm sử dụng phải từ ${MIN_ASSET_YEAR} trở đi`
		if (use > maxY) return `Năm sử dụng không được lớn hơn ${maxY}`
	}
	if (mfg !== null && use !== null && use < mfg) {
		return 'Năm sử dụng không được nhỏ hơn năm sản xuất'
	}
	return null
}

/** Clamp input năm khi gõ (không cho < 2000 nếu đã đủ 4 chữ số) */
export function clampAssetYearInput(raw: string): string {
	if (raw === '') return ''
	const digits = raw.replace(/[^\d]/g, '').slice(0, 4)
	if (!digits) return ''
	const n = Number(digits)
	if (digits.length === 4 && n < MIN_ASSET_YEAR) {
		return String(MIN_ASSET_YEAR)
	}
	const maxY = maxAssetYear()
	if (digits.length === 4 && n > maxY) return String(maxY)
	return digits
}
