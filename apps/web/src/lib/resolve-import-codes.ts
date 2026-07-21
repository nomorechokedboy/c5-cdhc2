/**
 * Gán / sinh mã VT khi import chỉ có tên (+ loại).
 *
 * 1. File đã có mã HC2… hợp lệ → giữ nguyên
 * 2. Trong loại (chuyên ngành): tên trùng danh mục → lấy mã VT đó
 * 3. Không trùng → sinh mã tiếp theo theo cấu trúc loại (HC2A12 + 01, 02…)
 */
import type { CatalogCategory, CatalogMaterial } from '@/api/asset'
import type { ImportedAssetRow } from '@/lib/parse-asset-import'
import { extractMaterialBaseCode } from '@/lib/nganh'

export type CodeResolveSource = 'file' | 'matched' | 'generated' | 'unresolved'

export type ResolvedImportRow = ImportedAssetRow & {
	/** Nguồn mã sau resolve */
	codeSource: CodeResolveSource
	/** Ghi chú ngắn cho admin (vd. Khớp «Máy tính Asus Core I3») */
	codeNote?: string
	/** Mã gốc trên file (nếu có) */
	fileCode?: string
	/** Mã chuyên ngành (HC2A01…) dùng khi sinh / khớp */
	chuyenNganhCode?: string
	/** Ngành (HC2A) khi sinh loại mới */
	nganhCode?: string
	/** Tên VT danh mục đã khớp */
	matchedMaterialName?: string
}

function normText(s: string): string {
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
function tokenScore(a: string, b: string): number {
	const ta = new Set(tokens(a))
	const tb = new Set(tokens(b))
	if (!ta.size || !tb.size) return 0
	let inter = 0
	for (const t of ta) if (tb.has(t)) inter++
	return inter / Math.max(ta.size, tb.size)
}

function isCatalogCode(code: string | null | undefined): boolean {
	const u = (code || '').trim().toUpperCase()
	if (!u) return false
	// HC2A0101 hoặc HC2A0101-G2-…
	if (/^HC2[A-Z]\d{4,}/i.test(u)) return true
	const base = extractMaterialBaseCode(u)
	return !!(base && /^HC2[A-Z]\d{4,}$/i.test(base))
}

/** Mã giả từ parser cũ / STT nhầm */
function isPlaceholderCode(code: string | null | undefined): boolean {
	const u = (code || '').trim()
	if (!u) return true
	if (/^VT[-_]?IMP/i.test(u)) return true
	if (/^\d{1,4}$/.test(u)) return true
	return false
}

/**
 * Sinh mã VT tiếp theo trong chuyên ngành: HC2A01 + 01 → HC2A0101
 * (cùng quy tắc API nextMaterialCode)
 */
export function nextMaterialCode(
	chuyenNganhCode: string,
	existingCodes: string[]
): string {
	const prefix = chuyenNganhCode.trim().toUpperCase()
	let maxSeq = 0
	for (const c of existingCodes) {
		const u = c.trim().toUpperCase()
		if (!u.startsWith(prefix)) continue
		const rest = u.slice(prefix.length)
		// Chỉ lấy phần số thuần đầu (tránh -G2)
		const m = rest.match(/^(\d+)/)
		const n = m ? parseInt(m[1]!, 10) : NaN
		if (Number.isFinite(n) && n > maxSeq) maxSeq = n
	}
	const next = maxSeq + 1
	const seq = String(next).padStart(2, '0')
	return `${prefix}${seq}`
}

/** Sinh mã loại vật (chuyên ngành): HC2A + 01, 02… */
export function nextChuyenNganhCode(
	nganhCode: string,
	existingCodes: string[]
): string {
	const prefix = nganhCode.trim().toUpperCase()
	let maxSeq = 0
	for (const c of existingCodes) {
		const u = c.trim().toUpperCase()
		if (!u.startsWith(prefix) || u.length !== prefix.length + 2) continue
		const rest = u.slice(prefix.length)
		if (!/^\d{2}$/.test(rest)) continue
		const n = parseInt(rest, 10)
		if (Number.isFinite(n) && n > maxSeq) maxSeq = n
	}
	return `${prefix}${String(maxSeq + 1).padStart(2, '0')}`
}

function scoreNameMatch(importName: string, catalogName: string): number {
	const a = normText(importName)
	const b = normText(catalogName)
	if (!a || !b) return 0
	if (a === b) return 1
	if (a.includes(b) || b.includes(a)) {
		// Ưu tiên tên gần bằng nhau
		const ratio =
			Math.min(a.length, b.length) / Math.max(a.length, b.length)
		return 0.85 + 0.1 * ratio
	}
	const ts = tokenScore(importName, catalogName)
	if (ts >= 0.75) return 0.7 + ts * 0.2
	if (ts >= 0.55) return 0.55 + ts * 0.15
	return ts * 0.5
}

function findBestMaterial(
	name: string,
	pool: CatalogMaterial[]
): { mat: CatalogMaterial; score: number } | null {
	let best: CatalogMaterial | null = null
	let bestSc = 0
	for (const m of pool) {
		const sc = scoreNameMatch(name, m.name)
		if (sc > bestSc) {
			bestSc = sc
			best = m
		}
	}
	// Chỉ trả về ứng viên; ngưỡng chấp nhận ở ngoài (chặt hơn)
	if (best && bestSc >= 0.5) return { mat: best, score: bestSc }
	return null
}

function resolveCategory(
	row: ImportedAssetRow,
	materials: CatalogMaterial[],
	chuyenNganh: CatalogCategory[]
): {
	chuyenNganhCode: string
	categoryName: string
	pool: CatalogMaterial[]
} | null {
	const catRaw = (row.category || '').trim()
	if (!catRaw || /^khác$/i.test(catRaw)) {
		// Không có loại: để null — sẽ match global
		return null
	}
	const nCat = normText(catRaw)

	// 1) Khớp chuyên ngành theo tên / mã
	for (const cn of chuyenNganh) {
		const code = (cn.code || '').trim().toUpperCase()
		if (code.length <= 4) continue
		const nName = normText(cn.name || '')
		const nCode = normText(code)
		if (
			nCat === nName ||
			nCat === nCode ||
			nName.includes(nCat) ||
			nCat.includes(nName) ||
			tokenScore(catRaw, cn.name || '') >= 0.7
		) {
			const pool = materials.filter(
				(m) => (m.categoryCode || '').toUpperCase() === code
			)
			return {
				chuyenNganhCode: code,
				categoryName: cn.name || code,
				pool
			}
		}
	}

	// 2) Khớp qua categoryName trên materials
	const byCatName = new Map<string, CatalogMaterial[]>()
	for (const m of materials) {
		const key = normText(m.categoryName || '')
		if (!key) continue
		const list = byCatName.get(key) || []
		list.push(m)
		byCatName.set(key, list)
	}
	for (const [key, pool] of byCatName) {
		if (
			key === nCat ||
			key.includes(nCat) ||
			nCat.includes(key) ||
			tokenScore(catRaw, pool[0]?.categoryName || '') >= 0.7
		) {
			const code = (pool[0]?.categoryCode || '').toUpperCase()
			if (!code || code.length <= 4) continue
			return {
				chuyenNganhCode: code,
				categoryName: pool[0]?.categoryName || catRaw,
				pool
			}
		}
	}

	return null
}

/**
 * Resolve mã cho từng dòng import.
 * `usedCodes` theo dõi mã đã gán trong batch (tránh trùng khi sinh nhiều dòng).
 */
export function resolveImportAssetCodes(
	rows: ImportedAssetRow[],
	opts: {
		materials: CatalogMaterial[]
		chuyenNganh: CatalogCategory[]
		/**
		 * Ngành mặc định (HC2A…) khi file chỉ có tên loại + tên VT.
		 * Dùng để sinh mã loại mới nếu loại chưa có trong danh mục.
		 */
		defaultNganhCode?: string
		/** Danh sách ngành (để map tên → mã) */
		nganh?: CatalogCategory[]
	}
): ResolvedImportRow[] {
	const materials = opts.materials || []
	const chuyenNganh = opts.chuyenNganh || []
	const nganhList = opts.nganh || []
	const defaultNganh = (opts.defaultNganhCode || '').trim().toUpperCase()

	/** Mã đã dùng (danh mục + file + đã sinh trong batch) */
	const usedCodes = new Set(
		materials.map((m) => m.code.trim().toUpperCase()).filter(Boolean)
	)

	// Codes per chuyên ngành for generation
	const codesByCn = new Map<string, string[]>()
	for (const m of materials) {
		const cn = (m.categoryCode || '').toUpperCase()
		if (!cn) continue
		const list = codesByCn.get(cn) || []
		list.push(m.code)
		codesByCn.set(cn, list)
	}

	/** Mã loại đã sinh trong batch (tên loại mới) */
	const generatedCnByName = new Map<string, string>()
	const usedCnCodes = new Set(
		chuyenNganh.map((c) => c.code.trim().toUpperCase()).filter(Boolean)
	)

	return rows.map((row) => {
		const fileCode = (row.code || '').trim()
		const name = (row.name || '').trim()

		// Giữ địa chỉ từ file (không để bước resolve mã làm mất)
		const fileInstall =
			String(row.fileInstallAddress ?? row.installAddress ?? '').trim() ||
			undefined

		// ── 1. File đã có mã danh mục hợp lệ ──────────────────────
		if (
			fileCode &&
			isCatalogCode(fileCode) &&
			!isPlaceholderCode(fileCode)
		) {
			const base =
				extractMaterialBaseCode(fileCode) || fileCode.toUpperCase()
			usedCodes.add(base)
			const mat = materials.find((m) => m.code.toUpperCase() === base)
			return {
				...row,
				code: fileCode,
				fileCode,
				installAddress: fileInstall ?? row.installAddress,
				fileInstallAddress: fileInstall ?? row.fileInstallAddress,
				codeSource: 'file' as const,
				codeNote: mat ? `Từ file · danh mục «${mat.name}»` : 'Từ file',
				chuyenNganhCode: mat?.categoryCode,
				matchedMaterialName: mat?.name,
				// Bổ sung unit/category nếu trống
				unit: row.unit || mat?.unit || row.unit,
				category:
					!row.category || /^khác$/i.test(row.category)
						? mat?.categoryName || row.category
						: row.category
			}
		}

		if (!name) {
			return {
				...row,
				fileCode: fileCode || undefined,
				codeSource: 'unresolved' as const,
				codeNote: 'Thiếu tên vật tư — không gán được mã',
				error: row.error || 'Thiếu tên vật tư'
			}
		}

		// ── 2. Xác định loại / chuyên ngành ───────────────────────
		const cat = resolveCategory(row, materials, chuyenNganh)

		// ── 3. Khớp tên trong loại (hoặc toàn danh mục) ───────────
		const pool = cat?.pool?.length ? cat.pool : materials // global fallback khi không có / không khớp loại

		const hit = findBestMaterial(name, pool)

		// Nếu tìm global mà row có loại không khớp — chỉ chấp nhận nếu score cao
		if (hit && cat && pool === cat.pool) {
			// matched in category — good
		}
		if (hit && !cat && hit.score < 0.85) {
			// Global match lỏng: chỉ nhận exact/contains mạnh
			// (tránh gán nhầm tên giống nhau khác ngành)
		}

		// Chặt: exact/contains (score≥0.85) hoặc rất giống (score≥0.78 trong loại)
		// Tránh gán nhầm «Bảng 100 inch» → «Bảng 98 inch» chỉ vì chung cụm loại
		const acceptMatch =
			hit &&
			(hit.score >= 0.92 ||
				(hit.score >= 0.85 && cat) ||
				(cat && hit.score >= 0.78) ||
				(!cat && hit.score >= 0.95))

		if (acceptMatch && hit) {
			const code = hit.mat.code.toUpperCase()
			usedCodes.add(code)
			return {
				...row,
				code,
				fileCode: fileCode || undefined,
				codeSource: 'matched' as const,
				codeNote: `Khớp danh mục «${hit.mat.name}» (${hit.mat.categoryName})`,
				chuyenNganhCode: hit.mat.categoryCode,
				matchedMaterialName: hit.mat.name,
				unit:
					row.unit && row.unit !== 'Bộ'
						? row.unit
						: hit.mat.unit || row.unit,
				category:
					!row.category || /^khác$/i.test(row.category)
						? hit.mat.categoryName
						: row.category
			}
		}

		// ── 4. Sinh mã mới theo cấu trúc loại ─────────────────────
		if (cat?.chuyenNganhCode) {
			const cn = cat.chuyenNganhCode
			const existing = [
				...(codesByCn.get(cn) || []),
				...[...usedCodes].filter((c) => c.startsWith(cn))
			]
			const newCode = nextMaterialCode(cn, existing)
			usedCodes.add(newCode)
			const list = codesByCn.get(cn) || []
			list.push(newCode)
			codesByCn.set(cn, list)

			return {
				...row,
				code: newCode,
				fileCode: fileCode || undefined,
				codeSource: 'generated' as const,
				codeNote: `Sinh mới trong «${cat.categoryName}» (${cn}) — chưa có trong danh mục`,
				chuyenNganhCode: cn,
				// unit giữ từ file
				category: row.category || cat.categoryName
			}
		}

		// ── 5. Loại mới (tên khác danh mục) + có ngành → sinh mã loại + VT ──
		const catName = (row.category || '').trim()
		const hasCatName = catName && !/^khác$/i.test(catName)
		let nganhForNew = defaultNganh
		// Ưu tiên map ngành theo tên nếu file ghi tên ngành trong category không khớp CN
		if (!nganhForNew && hasCatName) {
			for (const n of nganhList) {
				if (
					normText(n.name) === normText(catName) ||
					normText(n.code) === normText(catName)
				) {
					// Đây là tên ngành chứ không phải loại — không tạo loại
					nganhForNew = n.code.toUpperCase()
					break
				}
			}
		}
		if (hasCatName && nganhForNew && /^HC2[A-Z]$/.test(nganhForNew)) {
			const nameKey = normText(catName)
			const cn =
				generatedCnByName.get(nameKey) ||
				nextChuyenNganhCode(nganhForNew, [
					...usedCnCodes,
					...[...generatedCnByName.values()]
				])
			if (!generatedCnByName.has(nameKey)) {
				generatedCnByName.set(nameKey, cn)
				usedCnCodes.add(cn)
			}
			const existing = [
				...(codesByCn.get(cn) || []),
				...[...usedCodes].filter((c) => c.startsWith(cn))
			]
			const newCode = nextMaterialCode(cn, existing)
			usedCodes.add(newCode)
			const list = codesByCn.get(cn) || []
			list.push(newCode)
			codesByCn.set(cn, list)

			return {
				...row,
				code: newCode,
				fileCode: fileCode || undefined,
				codeSource: 'generated' as const,
				codeNote: `Sinh loại «${catName}» (${cn}) + VT mới trong ngành ${nganhForNew}`,
				chuyenNganhCode: cn,
				category: catName,
				nganhCode: nganhForNew
			}
		}

		// ── 6. Không có loại + không khớp tên ─────────────────────
		return {
			...row,
			code: fileCode && !isPlaceholderCode(fileCode) ? fileCode : '',
			fileCode: fileCode || undefined,
			codeSource: 'unresolved' as const,
			codeNote:
				'Không khớp danh mục — cần «Ngành» (form) + «Loại» (file) để sinh mã',
			error: row.error || 'Thiếu ngành / loại vật tư để gán mã danh mục'
		}
	})
}

export function codeSourceLabel(s: CodeResolveSource): string {
	switch (s) {
		case 'file':
			return 'Từ file'
		case 'matched':
			return 'Khớp DM'
		case 'generated':
			return 'Sinh mới'
		case 'unresolved':
			return 'Chưa gán'
		default:
			return s
	}
}
