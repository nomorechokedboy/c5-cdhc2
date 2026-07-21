/**
 * Ngành quản lý vật tư (mã 4 ký tự HC2A…HC2Z, gồm J) + helpers mã VT.
 * Danh sách fallback — nguồn chính là API /asset-catalog.
 */

export type Nganh = { code: string; name: string }

/** Danh mục ngành fallback (thứ tự mã; HC2J có thể thêm qua UI) */
export const NGANH_LIST: Nganh[] = [
	{ code: 'HC2A', name: 'Công nghệ thông tin' },
	{ code: 'HC2B', name: 'Thông tin' },
	{ code: 'HC2C', name: 'Giáo dục - Đào tạo' },
	{ code: 'HC2D', name: 'Công tác đảng - Công tác chính trị' },
	{ code: 'HC2E', name: 'Tác huấn' },
	{ code: 'HC2F', name: 'Cứu hộ cứu nạn' },
	{ code: 'HC2G', name: 'Phòng cháy - chữa cháy' },
	{ code: 'HC2H', name: 'Quân y' },
	{ code: 'HC2I', name: 'Quân khí' },
	{ code: 'HC2K', name: 'Xe máy' },
	{ code: 'HC2L', name: 'Quân nhu' },
	{ code: 'HC2M', name: 'Doanh trại' },
	{ code: 'HC2N', name: 'Xăng dầu' },
	{ code: 'HC2O', name: 'Cơ yếu' }
]

const BY_CODE = new Map(NGANH_LIST.map((n) => [n.code.toUpperCase(), n]))

/** Label hiển thị: HC2A — Công nghệ thông tin */
export function nganhLabel(n: Nganh | { code: string; name: string }): string {
	return `${n.code} — ${n.name}`
}

export function findNganhByCode(code: string | null | undefined): Nganh | null {
	if (!code) return null
	const u = code.trim().toUpperCase()
	const known = BY_CODE.get(u)
	if (known) return known
	// Ngành mới (API) chưa có trong list fallback — vẫn nhận mã HC2A–HC2Z
	if (/^HC2[A-Z]$/.test(u)) return { code: u, name: u }
	return null
}

/**
 * Lấy mã ngành từ mã VT / mã chuyên ngành.
 * HC2A0102-G2-BGH → HC2A
 * HC2A01 → HC2A
 * HC2A → HC2A
 */
export function extractNganhCode(
	assetCode: string | null | undefined
): string | null {
	const raw = (assetCode || '').trim().toUpperCase()
	if (!raw) return null
	// Mã VT chuẩn: HC2 + 1 chữ cái ngành A–Z (+ số chuyên ngành / suffix)
	const m = raw.match(/^(HC2[A-Z])/)
	if (m) return m[1]!
	// Fallback: 4 ký tự đầu nếu trùng danh mục
	const p4 = raw.slice(0, 4)
	if (BY_CODE.has(p4)) return p4
	return null
}

/**
 * Mã chuyên ngành: HC2A0102-G2 → HC2A01 ; HC2A01 → HC2A01
 */
export function extractChuyenNganhCode(
	assetCode: string | null | undefined
): string | null {
	const raw = (assetCode || '').trim().toUpperCase()
	if (!raw) return null
	const m = raw.match(/^(HC2[A-Z]\d{2})/)
	return m ? m[1]! : null
}

/**
 * Mã VT gốc trong danh mục: HC2A0102-G2-BGH → HC2A0102
 */
export function extractMaterialBaseCode(
	assetCode: string | null | undefined
): string | null {
	const raw = (assetCode || '').trim().toUpperCase()
	if (!raw) return null
	// Cắt suffix sau dấu - (đơn vị / vị trí)
	const head = raw.split('-')[0] || raw
	const m = head.match(/^(HC2[A-Z]\d{4,})/)
	if (m) return m[1]!
	// Đúng mã danh mục 8 ký tự HC2A0102
	if (/^HC2[A-Z]\d{4}$/.test(head)) return head
	return head || null
}

/**
 * Suy ngành từ mã VT hoặc (phụ) tên chuyên ngành trên room_assets.category.
 * Không khớp → null (báo cáo xếp «Chưa phân ngành»).
 */
export function resolveNganh(opts: {
	code?: string | null
	/** Tên chuyên ngành / nhóm (room_assets.category) — hiện chỉ hỗ trợ qua mã */
	category?: string | null
}): Nganh | null {
	const fromCode = extractNganhCode(opts.code)
	if (fromCode) return findNganhByCode(fromCode)
	return null
}

/** Nhãn nhóm trên file xuất (dòng header ngành) */
export function nganhGroupLabel(nganh: Nganh | null): string {
	if (!nganh) return 'Chưa phân ngành'
	return nganhLabel(nganh)
}

/** room_assets.code có thuộc mã VT danh mục? HC2A0102-xxx khớp HC2A0102 */
export function assetMatchesMaterialCode(
	assetCode: string | null | undefined,
	materialCode: string
): boolean {
	const base = extractMaterialBaseCode(assetCode)
	if (!base) return false
	const mat = materialCode.trim().toUpperCase()
	return base === mat || base.startsWith(mat)
}
