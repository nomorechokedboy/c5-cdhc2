/**
 * Nhãn tiếng Việt cho nhật ký cập nhật vật tư (tăng / giảm / điều chỉnh).
 */

export const MOVEMENT_TYPE_LABELS: Record<string, string> = {
	INCREASE: 'Tăng',
	DECREASE: 'Giảm',
	ADJUST: 'Điều chỉnh',
	TRANSFER: 'Điều động',
	RECALL: 'Thu hồi',
	GRADE_UP: 'Tăng phân cấp'
}

/** Lý do tăng */
export const INCREASE_REASON_LABELS: Record<string, string> = {
	FROM_SUPERIOR: 'Trên cấp',
	PURCHASE: 'Mua sắm',
	GRADE_UP: 'Tăng phân cấp',
	INVENTORY: 'Kiểm kê',
	OTHER: 'Khác'
}

/** Lý do giảm */
export const DECREASE_REASON_LABELS: Record<string, string> = {
	RETURN_SUPERIOR: 'Trả trên',
	LOSS: 'Hao hụt',
	LIQUIDATION: 'Thanh lý',
	DAMAGED: 'Hư hỏng',
	INVENTORY: 'Kiểm kê',
	OTHER: 'Khác',
	// legacy / điều chỉnh
	ADJUST: 'Điều chỉnh',
	GRADE_UP: 'Tăng phân cấp'
}

/**
 * Lý do import file — mỗi lý do gắn sẵn Tăng/Giảm (không chọn hướng riêng).
 * Không gồm GRADE_UP (cần form tăng phân cấp riêng).
 */
export type ImportReasonOption = {
	/** key duy nhất form/select (INVENTORY tăng/giảm tách key) */
	key: string
	reasonCode: string
	label: string
	movementType: 'INCREASE' | 'DECREASE'
}

export const IMPORT_REASON_OPTIONS: ImportReasonOption[] = [
	// Tăng
	{
		key: 'FROM_SUPERIOR',
		reasonCode: 'FROM_SUPERIOR',
		label: 'Trên cấp',
		movementType: 'INCREASE'
	},
	{
		key: 'PURCHASE',
		reasonCode: 'PURCHASE',
		label: 'Mua sắm',
		movementType: 'INCREASE'
	},
	{
		key: 'INVENTORY_INC',
		reasonCode: 'INVENTORY',
		label: 'Kiểm kê (tăng)',
		movementType: 'INCREASE'
	},
	{
		key: 'OTHER_INC',
		reasonCode: 'OTHER',
		label: 'Khác (tăng)',
		movementType: 'INCREASE'
	},
	// Giảm
	{
		key: 'RETURN_SUPERIOR',
		reasonCode: 'RETURN_SUPERIOR',
		label: 'Trả trên',
		movementType: 'DECREASE'
	},
	{
		key: 'LOSS',
		reasonCode: 'LOSS',
		label: 'Hao hụt',
		movementType: 'DECREASE'
	},
	{
		key: 'LIQUIDATION',
		reasonCode: 'LIQUIDATION',
		label: 'Thanh lý',
		movementType: 'DECREASE'
	},
	{
		key: 'INVENTORY_DEC',
		reasonCode: 'INVENTORY',
		label: 'Kiểm kê (giảm)',
		movementType: 'DECREASE'
	},
	{
		key: 'OTHER_DEC',
		reasonCode: 'OTHER',
		label: 'Khác (giảm)',
		movementType: 'DECREASE'
	}
]

function normReasonText(s: string): string {
	return s
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'd')
		.toLocaleLowerCase('vi')
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * Suy lý do + tăng/giảm từ text cột «Lý do» (file) hoặc nhãn.
 * Ví dụ: «Mua sắm» → INCREASE/PURCHASE; «Thanh lý» → DECREASE/LIQUIDATION.
 */
export function resolveImportReason(
	raw: string | null | undefined,
	fallback?: ImportReasonOption | null
): {
	reasonCode: string
	movementType: 'INCREASE' | 'DECREASE'
	label: string
	reasonOther?: string
	matched: boolean
} {
	const text = String(raw ?? '').trim()
	if (!text) {
		if (fallback) {
			return {
				reasonCode: fallback.reasonCode,
				movementType: fallback.movementType,
				label: fallback.label,
				matched: true
			}
		}
		return {
			reasonCode: 'OTHER',
			movementType: 'INCREASE',
			label: 'Khác',
			reasonOther: 'Import file',
			matched: false
		}
	}

	const n = normReasonText(text)
	const codeU = text.toUpperCase().replace(/\s+/g, '_')

	// Mã code trực tiếp
	for (const opt of IMPORT_REASON_OPTIONS) {
		if (opt.reasonCode === codeU || opt.key === codeU) {
			return {
				reasonCode: opt.reasonCode,
				movementType: opt.movementType,
				label: opt.label,
				matched: true
			}
		}
	}

	// Nhãn đầy đủ / một phần
	const byNorm = IMPORT_REASON_OPTIONS.map((o) => ({
		o,
		n: normReasonText(o.label)
	}))
	for (const { o, n: ln } of byNorm) {
		if (n === ln || n.includes(ln) || ln.includes(n)) {
			return {
				reasonCode: o.reasonCode,
				movementType: o.movementType,
				label: o.label,
				matched: true
			}
		}
	}

	// Alias tiếng Việt thường gặp
	const aliases: Array<{
		re: RegExp
		reasonCode: string
		movementType: 'INCREASE' | 'DECREASE'
		label: string
	}> = [
		{
			re: /mua\s*sam|purchase/,
			reasonCode: 'PURCHASE',
			movementType: 'INCREASE',
			label: 'Mua sắm'
		},
		{
			re: /tren\s*cap|from_superior/,
			reasonCode: 'FROM_SUPERIOR',
			movementType: 'INCREASE',
			label: 'Trên cấp'
		},
		{
			re: /tra\s*tren|return_superior/,
			reasonCode: 'RETURN_SUPERIOR',
			movementType: 'DECREASE',
			label: 'Trả trên'
		},
		{
			re: /hao\s*hut|loss/,
			reasonCode: 'LOSS',
			movementType: 'DECREASE',
			label: 'Hao hụt'
		},
		{
			re: /thanh\s*ly|liquidation/,
			reasonCode: 'LIQUIDATION',
			movementType: 'DECREASE',
			label: 'Thanh lý'
		},
		{
			re: /hu\s*hong|damaged/,
			reasonCode: 'DAMAGED',
			movementType: 'DECREASE',
			label: 'Hư hỏng'
		},
		{
			re: /kiem\s*ke.*giam|giam.*kiem\s*ke/,
			reasonCode: 'INVENTORY',
			movementType: 'DECREASE',
			label: 'Kiểm kê (giảm)'
		},
		{
			re: /kiem\s*ke.*tang|tang.*kiem\s*ke|kiem\s*ke/,
			reasonCode: 'INVENTORY',
			movementType: 'INCREASE',
			label: 'Kiểm kê (tăng)'
		},
		{
			re: /^tang(\s|$)|increase/,
			reasonCode: 'OTHER',
			movementType: 'INCREASE',
			label: 'Khác (tăng)'
		},
		{
			re: /^giam(\s|$)|decrease/,
			reasonCode: 'OTHER',
			movementType: 'DECREASE',
			label: 'Khác (giảm)'
		}
	]
	for (const a of aliases) {
		if (a.re.test(n)) {
			const isOther = a.reasonCode === 'OTHER'
			return {
				reasonCode: a.reasonCode,
				movementType: a.movementType,
				label: a.label,
				reasonOther: isOther ? text : undefined,
				matched: true
			}
		}
	}

	// Free text: dùng fallback hướng (mặc định tăng) + OTHER
	if (fallback) {
		return {
			reasonCode: 'OTHER',
			movementType: fallback.movementType,
			label: text,
			reasonOther: text,
			matched: true
		}
	}
	return {
		reasonCode: 'OTHER',
		movementType: 'INCREASE',
		label: text,
		reasonOther: text,
		matched: true
	}
}

const ALL_REASON_LABELS: Record<string, string> = {
	...INCREASE_REASON_LABELS,
	...DECREASE_REASON_LABELS
}

export function movementTypeLabel(type?: string | null): string {
	if (!type) return '—'
	return MOVEMENT_TYPE_LABELS[type] ?? type
}

export function reasonCodeLabel(code?: string | null): string {
	if (!code) return ''
	return ALL_REASON_LABELS[code] ?? code
}

/**
 * Cột «Lý do» trên nhật ký cập nhật.
 * Ví dụ:
 *  - Tăng + PURCHASE → «Tăng do mua sắm»
 *  - Giảm + LIQUIDATION → «Giảm do thanh lý»
 *  - Giảm + OTHER + text → «Giảm do …»
 */
export function formatMovementReason(r: {
	movementType?: string | null
	reasonCode?: string | null
	reasonOther?: string | null
	explanation?: string | null
	note?: string | null
}): string {
	const code = (r.reasonCode || '').trim()
	const other = (r.reasonOther || '').trim()
	const explanation = (r.explanation || '').trim()
	const type = (r.movementType || '').trim().toUpperCase()

	// Tăng phân cấp (có thể movementType = INCREASE hoặc ADJUST)
	if (code === 'GRADE_UP') {
		const base = 'Tăng do tăng phân cấp'
		const note = (r.note || '').trim()
		if (note && !/^Import\s+từ/i.test(note)) {
			const clean = note.split('|')[0]?.trim() || note
			return clean ? `${base}: ${clean}` : base
		}
		return explanation || base
	}

	// ADJUST thuần: ưu tiên diễn giải người dùng
	if (type === 'ADJUST' || code === 'ADJUST') {
		if (explanation) return explanation
		return reasonCodeLabel(code) || 'Điều chỉnh'
	}

	// Phần «do …» từ mã lý do
	let due = ''
	if (code === 'OTHER' && other) {
		due = other
	} else {
		const label = reasonCodeLabel(code)
		if (label && other && code !== 'OTHER') {
			due = `${label}: ${other}`
		} else if (label) {
			due = label
		} else if (other) {
			due = other
		} else if (explanation) {
			due = explanation
		}
	}

	if (!due) return '—'

	// Chuẩn hóa chữ thường sau «do» cho gọn (Mua sắm → mua sắm)
	const dueLower =
		due.length > 0
			? due.charAt(0).toLocaleLowerCase('vi') + due.slice(1)
			: due

	if (type === 'INCREASE') return `Tăng do ${dueLower}`
	if (type === 'DECREASE') return `Giảm do ${dueLower}`
	return due
}

/** Tách «Đề xuất từ: …» / «Phê duyệt: …» từ note / reasonOther */
function extractLabeledField(
	text: string | null | undefined,
	label: RegExp
): string | null {
	const raw = (text || '').trim()
	if (!raw) return null
	const m = raw.match(label)
	if (!m?.[1]) return null
	return (
		m[1]
			.replace(/\s*[|·;].*$/, '')
			.replace(/\s+/g, ' ')
			.trim() || null
	)
}

/**
 * Ghi chú báo cáo Word/Excel nhật ký tăng–giảm:
 * «Tăng/Giảm do …; Đề xuất từ: … / Không có đề xuất; Phê duyệt: …»
 */
export function formatMovementReportNote(r: {
	movementType?: string | null
	reasonCode?: string | null
	reasonOther?: string | null
	explanation?: string | null
	note?: string | null
	signer?: string | null
	performer?: string | null
	decisionNumber?: string | null
}): string {
	const reason = formatMovementReason(r)
	const blob = [r.note, r.reasonOther, r.explanation]
		.filter(Boolean)
		.join(' | ')

	let proposed =
		extractLabeledField(
			blob,
			/(?:Đề xuất từ|De xuat tu|Tu de xuat|Người đề xuất|Nguoi de xuat)\s*[:：]\s*([^|·;\n]+)/i
		) || extractLabeledField(blob, /proposedBy\s*[=:]\s*([^|·;\n]+)/i)

	// Legacy: «đề xuất #5» / «Đề xuất thu hồi #12»
	if (!proposed) {
		const idM = blob.match(/đề\s*xuất(?:\s+thu\s*hồi)?\s*#?\s*(\d+)/i)
		if (idM) proposed = `đề xuất #${idM[1]}`
	}

	let approved =
		extractLabeledField(
			blob,
			/(?:Phê duyệt|Phe duyet|Người phê duyệt|Nguoi phe duyet|Duyệt bởi)\s*[:：]\s*([^|·;\n]+)/i
		) ||
		extractLabeledField(blob, /approvedBy\s*[=:]\s*([^|·;\n]+)/i) ||
		(r.signer || '').trim() ||
		null

	// Không có đề xuất → phê duyệt = người thực hiện (người cập nhật)
	if (!proposed && !approved) {
		approved = (r.performer || '').trim() || null
	} else if (!approved) {
		approved = (r.performer || '').trim() || null
	}

	const parts = [reason]
	parts.push(proposed ? `Đề xuất từ: ${proposed}` : 'Không có đề xuất')
	parts.push(approved ? `Phê duyệt: ${approved}` : 'Phê duyệt: —')
	return parts.join('; ')
}
