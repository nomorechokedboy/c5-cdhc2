/**
 * Khớp mờ loại / tên thiết bị (bỏ dấu, không phân biệt hoa thường).
 * Dùng khi user chọn «Khác» và gõ tay — map về danh mục có sẵn hoặc sinh mã mới.
 */
import type { CatalogCategory, CatalogMaterial } from '@/api/asset'
import { nextMaterialCode } from '@/lib/resolve-import-codes'

export function normText(s: string): string {
	return s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'd')
		.toLocaleLowerCase('vi')
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
}

function tokens(s: string): string[] {
	return normText(s)
		.split(' ')
		.filter((t) => t.length > 1)
}

/** Độ tương đồng token (0–1) */
export function tokenScore(a: string, b: string): number {
	const ta = new Set(tokens(a))
	const tb = new Set(tokens(b))
	if (!ta.size || !tb.size) return 0
	let inter = 0
	for (const t of ta) if (tb.has(t)) inter++
	return inter / Math.max(ta.size, tb.size)
}

/** Trùng gần đúng: exact norm, chứa nhau, hoặc token score ≥ threshold */
export function fuzzyEqual(a: string, b: string, threshold = 0.72): boolean {
	const na = normText(a)
	const nb = normText(b)
	if (!na || !nb) return false
	if (na === nb) return true
	if (na.includes(nb) || nb.includes(na)) {
		// "may tinh de ban" ⊆ "may tinh de ban core i3"
		const shorter = na.length <= nb.length ? na : nb
		const longer = na.length <= nb.length ? nb : na
		if (shorter.length >= 6 && longer.includes(shorter)) return true
	}
	return tokenScore(a, b) >= threshold
}

export type FuzzyCategoryMatch = {
	kind: 'matched' | 'new'
	/** Tên loại dùng lưu (category room_asset) */
	categoryName: string
	/** Mã chuyên ngành nếu khớp / sinh */
	chuyenNganhCode?: string
	/** Ghi chú UI */
	note?: string
}

export type FuzzyMaterialMatch = {
	kind: 'matched' | 'new'
	name: string
	materialCode?: string
	unit?: string | null
	chuyenNganhCode?: string
	note?: string
}

/**
 * Khớp loại (chuyên ngành) trong ngành đã chọn.
 * Ưu tiên exact norm → token score cao nhất ≥ threshold.
 */
export function resolveCategoryFuzzy(
	input: string,
	chuyenNganh: CatalogCategory[],
	nganhCode: string,
	opts?: { createCode?: boolean; existingCnCodes?: string[] }
): FuzzyCategoryMatch {
	const raw = input.trim()
	if (!raw) {
		return { kind: 'new', categoryName: '' }
	}
	const prefix = nganhCode.trim().toUpperCase()
	const pool = chuyenNganh.filter(
		(c) =>
			(c.nganhCode || '').toUpperCase() === prefix ||
			c.code.toUpperCase().startsWith(prefix)
	)

	let best: CatalogCategory | null = null
	let bestScore = 0
	for (const c of pool) {
		if (fuzzyEqual(raw, c.name)) {
			const sc = tokenScore(raw, c.name) || 1
			if (sc > bestScore) {
				best = c
				bestScore = sc
			}
		}
	}
	// exact norm pass if fuzzyEqual missed edge cases
	if (!best) {
		const n = normText(raw)
		best = pool.find((c) => normText(c.name) === n) ?? null
	}

	if (best) {
		return {
			kind: 'matched',
			categoryName: best.name.trim(),
			chuyenNganhCode: best.code,
			note: `Khớp loại «${best.name}» (${best.code})`
		}
	}

	// Sinh mã chuyên ngành mới theo cấu trúc ngành
	if (opts?.createCode !== false) {
		const existing = opts?.existingCnCodes ?? pool.map((c) => c.code)
		const code = nextChuyenNganhCode(prefix, existing)
		return {
			kind: 'new',
			categoryName: raw,
			chuyenNganhCode: code,
			note: `Loại mới — mã ${code}`
		}
	}

	return {
		kind: 'new',
		categoryName: raw,
		note: 'Loại mới (chưa sinh mã)'
	}
}

function nextChuyenNganhCode(nganhCode: string, existing: string[]): string {
	const prefix = nganhCode.trim().toUpperCase()
	let maxSeq = 0
	for (const c of existing) {
		const u = c.trim().toUpperCase()
		if (!u.startsWith(prefix)) continue
		const rest = u.slice(prefix.length)
		const n = parseInt(rest, 10)
		if (Number.isFinite(n) && n > maxSeq) maxSeq = n
	}
	return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
}

/**
 * Khớp tên thiết bị trong chuyên ngành / toàn ngành.
 */
export function resolveMaterialFuzzy(
	input: string,
	materials: CatalogMaterial[],
	chuyenNganhCode: string | undefined,
	opts?: { existingMaterialCodes?: string[] }
): FuzzyMaterialMatch {
	const raw = input.trim()
	if (!raw) {
		return { kind: 'new', name: '' }
	}

	const pool = chuyenNganhCode
		? materials.filter(
				(m) =>
					(m.categoryCode || '').toUpperCase() ===
					chuyenNganhCode.toUpperCase()
			)
		: materials

	let best: CatalogMaterial | null = null
	let bestScore = 0
	for (const m of pool) {
		if (fuzzyEqual(raw, m.name)) {
			const sc = tokenScore(raw, m.name) || 1
			if (sc > bestScore) {
				best = m
				bestScore = sc
			}
		}
	}
	if (!best) {
		const n = normText(raw)
		best = pool.find((m) => normText(m.name) === n) ?? null
	}

	if (best) {
		return {
			kind: 'matched',
			name: best.name.trim(),
			materialCode: best.code,
			unit: best.unit,
			chuyenNganhCode: best.categoryCode || chuyenNganhCode,
			note: `Khớp tên «${best.name}» (${best.code})`
		}
	}

	const cn = (chuyenNganhCode || '').trim().toUpperCase()
	if (cn) {
		const existing =
			opts?.existingMaterialCodes ?? materials.map((m) => m.code)
		const code = nextMaterialCode(cn, existing)
		return {
			kind: 'new',
			name: raw,
			materialCode: code,
			chuyenNganhCode: cn,
			note: `Tên mới — mã ${code}`
		}
	}

	return {
		kind: 'new',
		name: raw,
		note: 'Tên mới (chưa có mã chuyên ngành)'
	}
}

/** Tìm chuỗi trong list (loại/tên phòng) theo fuzzy */
export function findFuzzyInList(input: string, list: string[]): string | null {
	const raw = input.trim()
	if (!raw) return null
	for (const item of list) {
		if (fuzzyEqual(raw, item)) return item
	}
	const n = normText(raw)
	return list.find((x) => normText(x) === n) ?? null
}
