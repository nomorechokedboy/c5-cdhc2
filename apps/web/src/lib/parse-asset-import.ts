/**
 * Parse file Excel / CSV / Word (bảng) → danh sách vật tư để import vào phòng.
 *
 * Hỗ trợ:
 *  - Mẫu import phẳng (cột Mã VT, Tên, SL…)
 *  - File báo cáo (thực lực / kho): chỉ lấy dòng vật tư trong bảng,
 *    bỏ tiêu đề, phạm vi, đề mục ngành/loại, TỔNG CỘNG, sheet hướng dẫn.
 *
 * Cột «Lý do» (nếu có) quyết định Tăng / Giảm.
 */
import * as XLSX from 'xlsx'
import { resolveImportReason } from '@/lib/asset-movement-labels'

export type ImportedAssetRow = {
	/** Index 1-based trong file (hoặc thứ tự dòng dữ liệu) */
	rowIndex: number
	code: string
	name: string
	category: string
	quantity: number
	unit: string
	grade: number
	manufactureYear?: number
	usageYear?: number
	/** Địa chỉ lắp đặt đọc từ file (cột trong Excel) */
	installAddress?: string
	/**
	 * Snapshot địa chỉ đúng như file — không bị form mặc định ghi đè.
	 * Import/xử lý luôn ưu tiên field này nếu có.
	 */
	fileInstallAddress?: string
	/**
	 * Đơn vị sử dụng trong file (nếu có cột «Đơn vị sử dụng»).
	 * Không suy từ địa chỉ — thiếu thì form mặc định.
	 */
	holdingUnitRaw?: string
	fileHoldingUnitRaw?: string
	description?: string
	/** Text gốc cột Lý do trong file */
	reasonRaw?: string
	/** Mã lý do (PURCHASE, LIQUIDATION…) — suy từ reasonRaw hoặc form */
	reasonCode?: string
	/** INCREASE | DECREASE — suy từ lý do */
	movementType?: 'INCREASE' | 'DECREASE'
	/** Nhãn lý do hiển thị */
	reasonLabel?: string
	/** Lý do khác (khi reasonCode = OTHER) */
	reasonOther?: string
	/** Lỗi parse dòng (bỏ qua khi import) */
	error?: string
}

type FieldKey = keyof ImportedAssetRow | 'skip' | 'stt'

/** Alias header (có/không dấu) — sẽ chuẩn hóa không dấu khi build map */
const HEADER_ALIASES: Array<[string, FieldKey]> = [
	// stt
	['stt', 'stt'],
	['stt.', 'stt'],
	// mã
	['mã', 'code'],
	['ma', 'code'],
	['mã số', 'code'],
	['ma so', 'code'],
	['mã vt', 'code'],
	['mã vật tư', 'code'],
	['mã thiết bị', 'code'],
	['code', 'code'],
	// tên
	['tên', 'name'],
	['ten', 'name'],
	['tên vt', 'name'],
	['tên vật tư', 'name'],
	['tên thiết bị', 'name'],
	['tên vật tư trang bị', 'name'],
	['ten vat tu trang bi', 'name'],
	['name', 'name'],
	// loại
	['loại', 'category'],
	['loai', 'category'],
	['loại vt', 'category'],
	['loại vật', 'category'],
	['category', 'category'],
	// sl / thực lực
	['sl', 'quantity'],
	['số lượng', 'quantity'],
	['soluong', 'quantity'],
	['quantity', 'quantity'],
	['thực lực', 'quantity'],
	['thuc luc', 'quantity'],
	['thực lực ngày', 'quantity'],
	['tổng', 'quantity'],
	['tong', 'quantity'],
	// đvt (đơn vị tính — không nhầm với đơn vị sử dụng)
	['đvt', 'unit'],
	['dvt', 'unit'],
	['đơn vị tính', 'unit'],
	['don vi tinh', 'unit'],
	// chỉ «đơn vị» thuần → ĐVT (mẫu cũ); ưu tiên map «đơn vị sử dụng» trước (khóa dài hơn)
	['đơn vị', 'unit'],
	['unit', 'unit'],
	// đơn vị sử dụng / giữ (holding unit)
	['đơn vị sử dụng', 'holdingUnitRaw'],
	['don vi su dung', 'holdingUnitRaw'],
	['đơn vị giữ', 'holdingUnitRaw'],
	['don vi giu', 'holdingUnitRaw'],
	['holding unit', 'holdingUnitRaw'],
	['holdingunit', 'holdingUnitRaw'],
	['đv sử dụng', 'holdingUnitRaw'],
	['dv su dung', 'holdingUnitRaw'],
	// phân cấp
	['phân cấp', 'grade'],
	['phan cap', 'grade'],
	['phancap', 'grade'],
	['cấp', 'grade'],
	['cap', 'grade'],
	['phẩm', 'grade'],
	['pham', 'grade'],
	['grade', 'grade'],
	// năm
	['năm sx', 'manufactureYear'],
	['năm sản xuất', 'manufactureYear'],
	['namsx', 'manufactureYear'],
	['manufactureyear', 'manufactureYear'],
	['năm sd', 'usageYear'],
	['năm sử dụng', 'usageYear'],
	['namsd', 'usageYear'],
	['usageyear', 'usageYear'],
	// địa chỉ lắp đặt (không dùng «vị trí» thuần — dễ khớp nhầm header báo cáo «Vị trí Q.Lý…Tên VT»)
	['địa chỉ lắp đặt', 'installAddress'],
	['dia chi lap dat', 'installAddress'],
	['địa chỉ', 'installAddress'],
	['dia chi', 'installAddress'],
	['vị trí lắp đặt', 'installAddress'],
	['vi tri lap dat', 'installAddress'],
	['install address', 'installAddress'],
	['installaddress', 'installAddress'],
	['diachi', 'installAddress'],
	// lý do
	['lý do', 'reasonRaw'],
	['ly do', 'reasonRaw'],
	['lydo', 'reasonRaw'],
	['reason', 'reasonRaw'],
	// mô tả
	['mô tả', 'description'],
	['mo ta', 'description'],
	['mota', 'description'],
	['ghi chú', 'description'],
	['ghi chu', 'description'],
	['description', 'description'],
	['note', 'description'],
	// cột báo cáo không import
	['kho', 'skip'],
	['thực lực các đơn vị', 'skip']
]

function normalizeHeader(h: string): string {
	return h
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'd')
		.toLocaleLowerCase('vi')
		.replace(/\s+/g, ' ')
		.trim()
}

/** Map khóa đã chuẩn hóa (không dấu) → field */
const HEADER_MAP: Record<string, FieldKey> = (() => {
	const m: Record<string, FieldKey> = {}
	for (const [alias, field] of HEADER_ALIASES) {
		m[normalizeHeader(alias)] = field
	}
	return m
})()

function mapHeader(h: string): FieldKey | null {
	const n = normalizeHeader(h)
	if (!n) return null
	if (HEADER_MAP[n]) return HEADER_MAP[n]
	// partial — ưu tiên khóa dài hơn; tránh "ma" khớp "may tinh"
	const keys = Object.keys(HEADER_MAP).sort((a, b) => b.length - a.length)
	for (const k of keys) {
		if (k.length < 2) continue
		// "ma" quá ngắn — chỉ exact
		if (k.length <= 2) {
			if (n === k) return HEADER_MAP[k] ?? null
			continue
		}
		if (n.includes(k) || (k.length >= 4 && k.includes(n))) {
			return HEADER_MAP[k] ?? null
		}
	}
	// "Thực lực ngày 13/07/2026"
	if (/^thuc\s*luc/.test(n)) return 'quantity'
	// "n" dưới cột Phẩm
	if (n === 'n') return 'grade'
	return null
}

function cellStr(v: unknown): string {
	if (v == null) return ''
	if (typeof v === 'number' && Number.isFinite(v)) return String(v)
	return String(v).trim()
}

function cellNum(v: unknown, fallback = 0): number {
	if (typeof v === 'number' && Number.isFinite(v)) return v
	const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
	return Number.isFinite(n) ? n : fallback
}

/** Mã VT danh mục / instance: HC2A0101, HC2A0101-G2-D1, … */
function looksLikeAssetCode(s: string): boolean {
	const t = s.trim().toUpperCase()
	if (!t) return false
	if (/^HC2[A-Z]\d{2,}/i.test(t)) return true
	if (/^[A-Z]{2,6}\d{2,}([-_/][A-Z0-9]+)+$/i.test(t)) return true
	// VT-IMP-… (mẫu hệ thống)
	if (/^VT[-_]/i.test(t)) return true
	return false
}

/** Dòng tiêu đề / meta báo cáo (không phải header cột, không phải data) */
function isMetaOrTitleRow(cells: string[]): boolean {
	const joined = cells.filter(Boolean).join(' ').trim()
	if (!joined) return true
	const n = normalizeHeader(joined)
	if (
		/bao\s*cao|thong\s*ke|thuc\s*luc|so\s*lieu\s*den\s*ngay|pham\s*vi|ngay\s*xuat|so:\s*|cong\s*hoa|doc\s*lap|truong\s*cao\s*dang|noi\s*nhan|chi\s*huy/.test(
			n
		)
	) {
		return true
	}
	// Một ô dài, không có mã VT
	if (cells.filter((c) => c).length <= 2 && joined.length > 40) {
		if (!cells.some((c) => looksLikeAssetCode(c))) return true
	}
	return false
}

/** Dòng đề mục ngành / loại vật / tổng cộng trong bảng báo cáo */
function isSectionOrTotalRow(
	cells: string[],
	mapped: Partial<Record<string, string>>
): boolean {
	const name = (mapped.name || '').trim()
	const code = (mapped.code || '').trim()
	const stt = (mapped.stt || '').trim()
	const joined = cells.filter(Boolean).join(' ').trim()
	const nName = normalizeHeader(name || joined)

	// Tổng cộng
	if (/^tổng\s*cộng|^tong\s*cong|^cộng\s*$|^total/i.test(nName)) return true
	if (/tổng\s*cộng|tong\s*cong/i.test(normalizeHeader(joined))) {
		// chỉ khi không có mã VT
		if (!looksLikeAssetCode(code)) return true
	}

	// Đề mục ngành: * Công nghệ thông tin
	if (/^\*\s*/.test(name) || /^\*\s*/.test(joined)) return true

	// Có STT số + mã VT → chắc là data
	if (stt && /^\d+$/.test(stt) && (looksLikeAssetCode(code) || name)) {
		return false
	}

	// Có mã VT chuẩn → data
	if (looksLikeAssetCode(code)) return false

	// Không mã, không STT số, chỉ còn tên (hoặc tên + vài ô trống) → đề mục loại/ngành
	const nonEmpty = cells.filter((c) => cellStr(c)).length
	if (!code && !/^\d+$/.test(stt) && name && nonEmpty <= 3) {
		// Tên không giống tên thiết bị dài có số model? vẫn có thể là "Bảng tương tác"
		// Nếu không có SL/ĐVT/cấp hợp lệ trong các cột số → section
		const hasQtyLike = cells.some((c, i) => {
			if (i === 0) return false
			const s = cellStr(c)
			return (
				s !== '' &&
				/^\d+(\.\d+)?$/.test(s) &&
				Number(s) > 0 &&
				Number(s) < 100000
			)
		})
		// Section headers trong export Excel không có số lượng
		if (!hasQtyLike) return true
		// Có số nhưng không có ĐVT điển hình và không có mã → vẫn có thể là section với tổng ngành
		if (!mapped.unit && !mapped.grade && !looksLikeAssetCode(code)) {
			// Nếu name ngắn và toàn chữ (không model) → section
			if (name.length < 48 && !/\d{2,}/.test(name) && nonEmpty <= 4) {
				return true
			}
		}
	}

	return false
}

/** Điểm ưu tiên sheet Excel (bảng VT thật > tóm tắt / hướng dẫn) */
function sheetScore(name: string, matrix: unknown[][]): number {
	const n = normalizeHeader(name)
	let score = 0
	if (/chi\s*tiet|import|vattu|vat\s*tu/.test(n)) score += 25
	if (/tong\s*hop|thuc\s*luc|bao\s*cao|kho|sheet1/.test(n)) score += 15
	if (/don\s*vi|huong\s*dan|tom\s*tat|danh\s*muc$|ghi\s*chu/.test(n)) {
		score -= 50
	}
	// Có bao nhiêu dòng giống mã VT
	let codeHits = 0
	let headerHits = 0
	let hasInstallCol = false
	for (let i = 0; i < Math.min(matrix.length, 80); i++) {
		const row = (matrix[i] ?? []).map(cellStr)
		if (row.some((c) => looksLikeAssetCode(c))) codeHits++
		const mapped = row.map((c) => mapHeader(c))
		if (mapped.includes('installAddress')) hasInstallCol = true
		const hit = mapped.filter(
			(x) => x && x !== 'skip' && x !== 'stt'
		).length
		if (hit >= 3) headerHits++
	}
	// Ưu tiên sheet có cột địa chỉ lắp đặt (tránh chọn «Tong hop» không có cột này)
	if (hasInstallCol) score += 50
	score += Math.min(codeHits, 40) * 2
	score += headerHits * 5
	score += Math.min(matrix.length, 100) * 0.1
	return score
}

/** Chấm điểm kết quả parse: ưu tiên sheet có nhiều dòng + địa chỉ file */
function parsedRowsScore(rows: ImportedAssetRow[]): number {
	if (!rows.length) return Number.NEGATIVE_INFINITY
	const withAddr = rows.filter((r) =>
		String(r.fileInstallAddress || r.installAddress || '').trim()
	).length
	return rows.length * 10 + withAddr * 30
}

function findBestHeader(matrix: unknown[][]): {
	headerIdx: number
	mapping: Array<FieldKey | null>
} {
	let bestIdx = -1
	let bestMap: Array<FieldKey | null> = []
	let bestScore = -1

	// Quét rộng hơn vì báo cáo có 4–8 dòng tiêu đề trước bảng
	const limit = Math.min(matrix.length, 40)
	for (let i = 0; i < limit; i++) {
		const row = matrix[i] ?? []
		const cells = row.map(cellStr)
		if (
			isMetaOrTitleRow(cells) &&
			!cells.some((c) => mapHeader(c) === 'code')
		) {
			// vẫn cho map nếu có "Mã số"
		}
		const m = cells.map((c) => mapHeader(c))
		const fields = m.filter((x) => x && x !== 'skip')
		const unique = new Set(fields)
		const hasCode = unique.has('code')
		const hasName = unique.has('name')
		const hasQty = unique.has('quantity')
		const hasUnit = unique.has('unit')
		const hasGrade = unique.has('grade')
		const hasStt = unique.has('stt')

		let sc = unique.size * 2
		if (hasCode) sc += 8
		if (hasName) sc += 6
		if (hasQty) sc += 4
		if (hasUnit) sc += 3
		if (hasGrade) sc += 2
		if (hasStt) sc += 2
		// Header báo cáo điển hình
		if (hasCode && hasName && (hasQty || hasUnit)) sc += 10
		// Tránh nhầm dòng data có mã VT
		if (cells.some((c) => looksLikeAssetCode(c)) && !hasName) sc -= 20

		if (sc > bestScore && unique.size >= 2 && (hasCode || hasName)) {
			bestScore = sc
			bestIdx = i
			bestMap = m
		}
	}

	if (bestIdx < 0) {
		return {
			headerIdx: -1,
			mapping: [
				'code',
				'name',
				'category',
				'quantity',
				'unit',
				'grade',
				'manufactureYear',
				'usageYear',
				'installAddress',
				'reasonRaw',
				'description'
			]
		}
	}
	return { headerIdx: bestIdx, mapping: bestMap }
}

function rowToMapped(
	row: unknown[],
	mapping: Array<FieldKey | null>
): Partial<Record<string, string>> & { _cells: string[] } {
	const cells = row.map(cellStr)
	const mapped: Partial<Record<string, string>> & { _cells: string[] } = {
		_cells: cells
	}
	// quantity: ưu tiên cột «Thực lực» trước «TỔNG» nếu trùng key — lấy giá trị đầu > 0
	const qtyCandidates: number[] = []
	for (let c = 0; c < mapping.length; c++) {
		const key = mapping[c]
		if (!key || key === 'skip') continue
		const raw = row[c]
		const s = cellStr(raw)
		if (key === 'quantity') {
			const n = cellNum(raw, NaN)
			if (Number.isFinite(n)) qtyCandidates.push(n)
			continue
		}
		if (key === 'grade') {
			const g = cellNum(raw, 0)
			if (g >= 1 && g <= 5) mapped.grade = String(g)
			continue
		}
		if (key === 'manufactureYear' || key === 'usageYear') {
			const y = cellNum(raw, 0)
			if (y >= 1990 && y <= 2100) mapped[key] = String(y)
			continue
		}
		if (!mapped[key] || key === 'code' || key === 'name') {
			if (s) mapped[key] = s
		}
	}
	// SL: lấy giá trị > 0 đầu tiên, không thì 0
	const qPos = qtyCandidates.find((n) => n > 0)
	if (qPos != null) mapped.quantity = String(qPos)
	else if (qtyCandidates.length) mapped.quantity = String(qtyCandidates[0])

	// Fallback: ô có mã HC2… dù cột lệch
	if (!mapped.code) {
		const hit = cells.find((c) => looksLikeAssetCode(c))
		if (hit) mapped.code = hit
	}
	return mapped
}

function isAssetDataRow(
	mapped: Partial<Record<string, string>> & { _cells: string[] }
): boolean {
	const code = (mapped.code || '').trim()
	const name = (mapped.name || '').trim()
	const stt = (mapped.stt || '').trim()
	const cells = mapped._cells

	if (isMetaOrTitleRow(cells)) return false
	if (isSectionOrTotalRow(cells, mapped)) return false

	// Có mã VT chuẩn
	if (looksLikeAssetCode(code)) return true

	// STT số + tên thiết bị + (SL hoặc ĐVT)
	if (/^\d+$/.test(stt) && name.length >= 2) {
		const qty = cellNum(mapped.quantity, 0)
		if (qty > 0 || mapped.unit || mapped.grade) return true
	}

	// Mẫu phẳng: có tên + SL, không giống section
	if (name.length >= 2 && !code.startsWith('*')) {
		const qty = cellNum(mapped.quantity, 0)
		if (
			qty > 0 &&
			(mapped.unit || mapped.grade || looksLikeAssetCode(code))
		) {
			return true
		}
		// Import template: name + code bất kỳ
		if (code && qty >= 0 && name) {
			// Tránh nhận section: code không được là số thuần (STT nhầm cột)
			if (!/^\d{1,4}$/.test(code)) return true
		}
	}

	return false
}

function rowsFromMatrix(matrix: unknown[][]): ImportedAssetRow[] {
	if (!matrix.length) return []

	const { headerIdx, mapping } = findBestHeader(matrix)
	const start = headerIdx >= 0 ? headerIdx + 1 : 0

	const out: ImportedAssetRow[] = []
	/** Thừa kế loại vật từ dòng đề mục trước đó */
	let currentCategory = 'Khác'
	/** Thừa kế ngành (chỉ ghi mô tả, không chặn) */
	let currentNganh = ''

	for (let r = start; r < matrix.length; r++) {
		const row = matrix[r] ?? []
		const cells = row.map(cellStr)
		if (cells.every((c) => !c)) continue

		const mapped = rowToMapped(row, mapping)
		const name = (mapped.name || '').trim()
		const code = (mapped.code || '').trim()

		// Cập nhật ngữ cảnh đề mục (không import)
		if (isSectionOrTotalRow(cells, mapped) || isMetaOrTitleRow(cells)) {
			if (name || cells.filter(Boolean).length === 1) {
				const label = name || cells.find(Boolean) || ''
				const n = normalizeHeader(label)
				if (
					/^\*|cong\s*nghe|nganh|hc2[a-z]\s/i.test(label) ||
					/^\*/.test(label)
				) {
					currentNganh = label.replace(/^\*\s*/, '').trim()
				} else if (
					!/tổng|tong|cong\s*$/i.test(n) &&
					label.length > 1 &&
					label.length < 80
				) {
					// Đề mục loại vật: Bảng tương tác, Camera giám sát…
					currentCategory =
						label.replace(/^\d+\.\s*/, '').trim() || currentCategory
				}
			}
			continue
		}

		if (!isAssetDataRow(mapped)) continue

		const item: ImportedAssetRow = {
			rowIndex: r + 1,
			code: code || '',
			name: name || code || '',
			category:
				(mapped.category || '').trim() || currentCategory || 'Khác',
			quantity: Math.max(0, cellNum(mapped.quantity, 0)),
			unit: (mapped.unit || '').trim() || 'Bộ',
			grade: Math.min(5, Math.max(1, cellNum(mapped.grade, 1) || 1))
		}

		if (mapped.manufactureYear) {
			item.manufactureYear =
				cellNum(mapped.manufactureYear, 0) || undefined
		}
		if (mapped.usageYear) {
			item.usageYear = cellNum(mapped.usageYear, 0) || undefined
		}
		if (mapped.installAddress) {
			const addr = String(mapped.installAddress)
				.replace(/\u00a0/g, ' ')
				.trim()
			if (addr) {
				item.installAddress = addr
				// Snapshot — handleImport chỉ dùng form khi field này trống
				item.fileInstallAddress = addr
			}
		}
		if (mapped.holdingUnitRaw) {
			const hu = String(mapped.holdingUnitRaw)
				.replace(/\u00a0/g, ' ')
				.trim()
			if (hu) {
				item.holdingUnitRaw = hu
				item.fileHoldingUnitRaw = hu
			}
		}
		if (mapped.description) {
			item.description = mapped.description
		}
		if (mapped.reasonRaw) {
			item.reasonRaw = mapped.reasonRaw
		}

		// Thiếu cả tên và mã → bỏ
		if (!item.code && !item.name) {
			continue
		}
		if (!item.name) item.name = item.code
		// Không gán mã giả: để trống → resolveImportAssetCodes khớp danh mục / sinh mã

		if (item.quantity < 0) item.quantity = 0
		// Dòng SL=0 vẫn giữ (danh mục); import form sẽ chặn qty<1

		if (item.reasonRaw?.trim()) {
			const rr = resolveImportReason(item.reasonRaw)
			item.reasonCode = rr.reasonCode
			item.movementType = rr.movementType
			item.reasonLabel = rr.label
			if (rr.reasonOther) item.reasonOther = rr.reasonOther
		}

		out.push(item)
	}

	return out
}

function parseExcelBuffer(buf: ArrayBuffer): ImportedAssetRow[] {
	const wb = XLSX.read(buf, { type: 'array' })
	if (!wb.SheetNames.length) return []

	// Parse mọi sheet ứng viên, chọn sheet có VT + nhiều địa chỉ lắp đặt nhất
	// (tránh lấy «Tong hop» không có cột địa chỉ trong khi «Chi tiet» có)
	let bestRows: ImportedAssetRow[] = []
	let bestSc = Number.NEGATIVE_INFINITY

	for (const name of wb.SheetNames) {
		const sheet = wb.Sheets[name]
		if (!sheet) continue
		const n = normalizeHeader(name)
		if (/don\s*vi|huong\s*dan|tom\s*tat|ghi\s*chu/.test(n)) continue

		const matrix = XLSX.utils.sheet_to_json(sheet, {
			header: 1,
			defval: '',
			raw: false
		}) as unknown[][]
		const nameSc = sheetScore(name, matrix)
		const tryRows = rowsFromMatrix(matrix)
		const sc = nameSc + parsedRowsScore(tryRows)
		if (sc > bestSc && tryRows.length > 0) {
			bestSc = sc
			bestRows = tryRows
		}
	}

	// Fallback: sheet đầu nếu không parse được gì
	if (!bestRows.length) {
		const sheet = wb.Sheets[wb.SheetNames[0]!]
		if (sheet) {
			const matrix = XLSX.utils.sheet_to_json(sheet, {
				header: 1,
				defval: '',
				raw: false
			}) as unknown[][]
			bestRows = rowsFromMatrix(matrix)
		}
	}

	return bestRows
}

/** Extract tables from docx (word/document.xml) */
async function parseDocxBuffer(buf: ArrayBuffer): Promise<ImportedAssetRow[]> {
	const JSZip = (await import('jszip')).default
	const zip = await JSZip.loadAsync(buf)
	const docXml = await zip.file('word/document.xml')?.async('string')
	if (!docXml) throw new Error('File Word không hợp lệ (thiếu document.xml)')

	const tables: string[][][] = []
	const tblRe = /<w:tbl[\s>][\s\S]*?<\/w:tbl>/gi
	let tblMatch: RegExpExecArray | null
	while ((tblMatch = tblRe.exec(docXml))) {
		const tbl = tblMatch[0]
		const rows: string[][] = []
		const trRe = /<w:tr[\s>][\s\S]*?<\/w:tr>/gi
		let trMatch: RegExpExecArray | null
		while ((trMatch = trRe.exec(tbl))) {
			const tr = trMatch[0]
			const cells: string[] = []
			const tcRe = /<w:tc[\s>][\s\S]*?<\/w:tc>/gi
			let tcMatch: RegExpExecArray | null
			while ((tcMatch = tcRe.exec(tr))) {
				const tc = tcMatch[0]
				const texts: string[] = []
				const tRe = /<w:t[^>]*>([^<]*)<\/w:t>/gi
				let tMatch: RegExpExecArray | null
				while ((tMatch = tRe.exec(tc))) {
					texts.push(tMatch[1] ?? '')
				}
				cells.push(texts.join('').trim())
			}
			if (cells.length) rows.push(cells)
		}
		if (rows.length >= 2) tables.push(rows)
	}

	if (!tables.length) {
		throw new Error(
			'Không tìm thấy bảng trong file Word. Hãy dùng bảng Word hoặc file Excel (.xlsx).'
		)
	}

	// Ưu tiên bảng có nhiều mã VT / header rõ
	let best = tables[0]!
	let bestSc = -1
	for (const t of tables) {
		const sc = sheetScore('table', t)
		if (sc > bestSc) {
			bestSc = sc
			best = t
		}
	}
	return rowsFromMatrix(best)
}

export async function parseAssetImportFile(
	file: File
): Promise<ImportedAssetRow[]> {
	const name = file.name.toLowerCase()
	const buf = await file.arrayBuffer()

	if (
		name.endsWith('.xlsx') ||
		name.endsWith('.xls') ||
		name.endsWith('.csv') ||
		name.endsWith('.ods')
	) {
		return parseExcelBuffer(buf)
	}
	if (name.endsWith('.docx')) {
		return parseDocxBuffer(buf)
	}
	if (name.endsWith('.doc')) {
		throw new Error(
			'File .doc (Word cũ) không hỗ trợ. Lưu thành .docx hoặc .xlsx.'
		)
	}
	try {
		return parseExcelBuffer(buf)
	} catch {
		throw new Error(
			'Định dạng không hỗ trợ. Dùng Excel (.xlsx/.xls/.csv) hoặc Word (.docx) có bảng.'
		)
	}
}

/** Mẫu cột gợi ý khi tải template */
export const IMPORT_TEMPLATE_HEADERS = [
	'Mã VT',
	'Tên vật tư',
	'Loại',
	'Số lượng',
	'ĐVT',
	'Phân cấp',
	'Năm SX',
	'Năm SD',
	'Địa chỉ lắp đặt',
	'Đơn vị sử dụng',
	'Lý do',
	'Mô tả'
] as const

export function buildImportTemplateWorkbook(): Blob {
	const ws = XLSX.utils.aoa_to_sheet([
		[...IMPORT_TEMPLATE_HEADERS],
		// Có mã sẵn
		[
			'HC2A0101',
			'Máy tính để bàn',
			'Máy tính để bàn',
			'2',
			'Bộ',
			'2',
			'2020',
			'2021',
			'Phòng A101',
			'',
			'Mua sắm',
			''
		],
		// Không mã — khớp danh mục theo tên + loại
		[
			'',
			'Máy tính Asus Core I5',
			'Máy tính để bàn',
			'1',
			'Bộ',
			'2',
			'',
			'',
			'Giảng đường H1.204',
			'D2',
			'Mua sắm',
			''
		],
		// Không mã — tên mới → sinh mã trong loại
		[
			'',
			'Bảng tương tác 86 inch loại mới',
			'Bảng tương tác',
			'1',
			'Cái',
			'2',
			'',
			'',
			'Phòng họp tầng 2',
			'',
			'Mua sắm',
			''
		]
	])
	const note = XLSX.utils.aoa_to_sheet([
		['Cột Lý do quyết định Tăng hoặc Giảm (không cần cột hướng riêng)'],
		[],
		['Lý do Tăng', 'Lý do Giảm'],
		['Mua sắm', 'Trả trên'],
		['Trên cấp', 'Hao hụt'],
		['Kiểm kê (tăng)', 'Thanh lý'],
		['Khác (tăng)', 'Kiểm kê (giảm)'],
		['', 'Khác (giảm)'],
		[],
		['Địa chỉ lắp đặt vs Đơn vị sử dụng'],
		[
			'— Địa chỉ lắp đặt: vị trí lắp thật (lấy đúng từ file; trống → form)',
			'— Đơn vị sử dụng: D1/D2/PTMHC… (có trong file thì dùng file; trống → form mặc định)',
			'— Không suy đơn vị từ địa chỉ lắp đặt'
		],
		[],
		['Mã VT (tuỳ chọn)'],
		[
			'— Có mã HC2…: dùng nguyên mã file',
			'— Trống + có Tên + Loại: khớp danh mục theo tên trong loại → lấy mã; không khớp → sinh mã mới (HC2A1204…)',
			'— Loại = tên chuyên ngành danh mục (vd. Máy tính để bàn, Camera giám sát, Bảng tương tác)'
		]
	])
	const wb = XLSX.utils.book_new()
	XLSX.utils.book_append_sheet(wb, ws, 'VatTu')
	XLSX.utils.book_append_sheet(wb, note, 'Huong dan ly do')
	const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
	return new Blob([out], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	})
}
