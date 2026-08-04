import type { LeaveObjectType } from '../schema/leave-management'

/** Mã chuẩn theo tài liệu */
export const CANONICAL_OBJECT_TYPES: LeaveObjectType[] = [
	'SQ',
	'QNCN',
	'CNQP',
	'VCQP',
	'HSQBS',
	'HV',
	'KHAC'
]

/** Map legacy → chuẩn */
const LEGACY_OBJECT_MAP: Record<string, LeaveObjectType> = {
	QN: 'SQ',
	CN: 'CNQP',
	HSQ: 'HSQBS',
	BS: 'HSQBS',
	SQ: 'SQ',
	QNCN: 'QNCN',
	CNQP: 'CNQP',
	VCQP: 'VCQP',
	HSQBS: 'HSQBS',
	HV: 'HV',
	KHAC: 'KHAC'
}

/** Đối tượng được nghỉ thêm (theo tiêu chuẩn phép thêm) */
export const EXTRA_ELIGIBLE: LeaveObjectType[] = [
	'SQ',
	'QNCN',
	'CNQP',
	'VCQP',
	// legacy
	'QN',
	'CN'
]

/** Đối tượng phép đặc biệt */
export const SPECIAL_ELIGIBLE: LeaveObjectType[] = [
	'SQ',
	'QNCN',
	'CNQP',
	'VCQP',
	'QN',
	'CN'
]

export const OBJECT_TYPE_LABELS: Record<string, string> = {
	SQ: 'Sỹ quan',
	QNCN: 'Quân nhân chuyên nghiệp',
	CNQP: 'Công nhân quốc phòng',
	VCQP: 'Viên chức quốc phòng',
	HSQBS: 'Hạ sỹ quan, Binh sỹ',
	HV: 'Học viên',
	KHAC: 'Đối tượng khác',
	// legacy labels
	QN: 'Sỹ quan',
	CN: 'Công nhân quốc phòng',
	HSQ: 'Hạ sỹ quan, Binh sỹ',
	BS: 'Hạ sỹ quan, Binh sỹ'
}

/**
 * Lý do nghỉ thêm — fallback cứng (MS 01–06).
 * Ưu tiên đọc từ bảng leave_extra_standards khi có.
 * Code chuẩn: '01'..'06'; giữ alias semantic cũ để tương thích dữ liệu.
 */
export const EXTRA_10_REASONS = [
	{
		code: '01',
		label: 'Đóng quân ở đơn vị xa nơi đăng ký nghỉ phép (nơi cư trú của vợ hoặc chồng; con đẻ, con nuôi hợp pháp; bố, mẹ, người nuôi dưỡng hợp pháp của bản thân, của vợ hoặc của chồng) cách từ 500 km trở lên'
	},
	{
		code: '02',
		label: 'Đóng quân ở địa bàn có điều kiện kinh tế xã hội đặc biệt khó khăn; địa bàn vùng sâu, vùng xa, vùng biên giới cách nơi đăng ký nghỉ phép (nơi cư trú của vợ hoặc chồng; con đẻ, con nuôi hợp pháp; bố, mẹ, người nuôi dưỡng hợp pháp của bản thân, của vợ hoặc của chồng) từ 300 km trở lên.'
	},
	{
		code: '03',
		label: 'Đóng quân tại các đảo thuộc quần đảo Trường Sa và Nhà giàn DK'
	},
	// alias cũ
	{
		code: 'DISTANCE_GTE_500',
		label: 'Đơn vị đóng quân cách nơi đăng ký nghỉ phép từ 500km trở lên'
	},
	{
		code: 'DIFFICULT_AREA_GTE_300',
		label: 'Đóng quân ở địa bàn KTXH đặc biệt khó khăn, vùng sâu, vùng xa, vùng biên giới cách nơi đăng ký nghỉ phép từ 300km trở lên'
	},
	{
		code: 'ISLAND_TRUONG_SA_DK',
		label: 'Đóng quân tại các đảo thuộc quần đảo Trường Sa và Nhà giàn DK'
	}
] as const

export const EXTRA_5_REASONS = [
	{
		code: '04',
		label: 'Đơn vị đóng quân cách nơi đăng ký nghỉ phép (nơi cư trú của vợ hoặc chồng; con đẻ, con nuôi hợp pháp; bố, mẹ, người nuôi dưỡng hợp pháp của bản thân, của vợ hoặc của chồng) từ 300 km đến dưới 500 km'
	},
	{
		code: '05',
		label: 'Đóng quân ở địa bàn vùng sâu, vùng xa, vùng biên giới cách nơi đăng ký nghỉ phép (nơi cư trú của vợ hoặc chồng; con đẻ, con nuôi hợp pháp; bố, mẹ, người nuôi dưỡng hợp pháp của bản thân, của vợ hoặc của chồng) từ 200 km đến dưới 300 km.'
	},
	{
		code: '06',
		label: 'Đóng quân tại các đảo được hưởng phụ cấp khu vực.'
	},
	// alias cũ
	{
		code: 'DISTANCE_300_500',
		label: 'Đóng quân cách nơi đăng ký nghỉ phép từ 300km đến dưới 500km'
	},
	{
		code: 'DIFFICULT_AREA_200_300',
		label: 'Đóng quân ở địa bàn KTXH đặc biệt khó khăn, vùng sâu, vùng xa, vùng biên giới cách nơi đăng ký nghỉ phép từ 200km tới dưới 300km'
	},
	{
		code: 'ISLAND_AREA_ALLOWANCE',
		label: 'Đóng quân tại các đảo được hưởng phụ cấp khu vực'
	}
] as const

export type Extra10Code = (typeof EXTRA_10_REASONS)[number]['code']
export type Extra5Code = (typeof EXTRA_5_REASONS)[number]['code']

/** Chuẩn hoá mã đối tượng (legacy → canonical) */
export function normalizeObjectType(v: string): LeaveObjectType | null {
	const key = String(v || '')
		.trim()
		.toUpperCase()
	return (LEGACY_OBJECT_MAP[key] as LeaveObjectType) || null
}

export function isLeaveObjectType(v: string): v is LeaveObjectType {
	return normalizeObjectType(v) != null
}

/**
 * Tính thâm niên (năm) từ ngày nhập ngũ / tuyển dụng.
 * Theo tài liệu: lấy tháng/năm bắt đầu nghỉ phép trừ tháng/năm tuyển dụng.
 * @param asOf — mặc định hôm nay; khi đề xuất dùng startDate
 */
export function computeServiceYears(
	enlistmentDate: string | null | undefined,
	asOf: Date = new Date()
): number {
	if (!enlistmentDate) return 0
	const d = new Date(enlistmentDate)
	if (Number.isNaN(d.getTime())) return 0
	let years = asOf.getFullYear() - d.getFullYear()
	const m = asOf.getMonth() - d.getMonth()
	if (m < 0 || (m === 0 && asOf.getDate() < d.getDate())) {
		years -= 1
	}
	return Math.max(0, years)
}

/** Parse asOf từ chuỗi ngày YYYY-MM-DD */
export function asOfFromDate(dateStr: string | null | undefined): Date {
	if (!dateStr) return new Date()
	const d = new Date(dateStr)
	if (Number.isNaN(d.getTime())) return new Date()
	return d
}

/**
 * Quy định phép hằng năm (fallback cứng nếu DB thiếu rule):
 * - HSQBS: 10 ngày
 * - SQ/QNCN/CNQP/VCQP: <15 → 20; 15–25 → 25; ≥25 → 30
 * - HV / KHAC: 0 (cấu hình trên DB)
 */
export function resolveAnnualBaseDays(
	objectType: LeaveObjectType | string,
	serviceYears: number
): number {
	const ot = normalizeObjectType(String(objectType)) || objectType
	if (ot === 'HSQBS' || ot === 'HSQ' || ot === 'BS') return 10
	if (ot === 'HV' || ot === 'KHAC') return 0
	if (
		ot === 'SQ' ||
		ot === 'QNCN' ||
		ot === 'CNQP' ||
		ot === 'VCQP' ||
		ot === 'QN' ||
		ot === 'CN'
	) {
		if (serviceYears < 15) return 20
		if (serviceYears < 25) return 25
		return 30
	}
	return 0
}

export function canTakeExtraLeave(
	objectType: LeaveObjectType | string
): boolean {
	const ot = normalizeObjectType(String(objectType))
	if (!ot) return false
	return (['SQ', 'QNCN', 'CNQP', 'VCQP'] as string[]).includes(ot)
}

export function validateExtraReasons(
	extraDays: number,
	reasons: string[]
): string | null {
	if (extraDays === 0) return null
	if (extraDays !== 5 && extraDays !== 10) {
		return 'Nghỉ thêm chỉ được chọn 5 hoặc 10 ngày'
	}
	if (!reasons.length) {
		return 'Vui lòng chọn ít nhất một lý do nghỉ thêm'
	}
	const allowed =
		extraDays === 10
			? EXTRA_10_REASONS.map((r) => r.code)
			: EXTRA_5_REASONS.map((r) => r.code)
	const invalid = reasons.filter((c) => !allowed.includes(c as never))
	if (invalid.length) {
		return `Lý do nghỉ thêm không hợp lệ cho ${extraDays} ngày: ${invalid.join(', ')}`
	}
	return null
}

export const SPECIAL_MAX_DAYS = 10

/** Lý do phép đặc biệt (theo quy định) */
export const SPECIAL_REASONS = [
	{
		code: 'MARRIAGE',
		label: 'Bản thân kết hôn, hoặc con đẻ / con nuôi hợp pháp kết hôn'
	},
	{
		code: 'FAMILY_HARDSHIP',
		label: 'Gia đình gặp khó khăn đột xuất do vợ hoặc chồng, con đẻ / con nuôi hợp pháp, bố mẹ / người nuôi dưỡng hợp pháp của bản thân, của vợ hoặc của chồng bị đau ốm nặng, tai nạn rủi ro, hy sinh, từ trần, hoặc bị thiệt hại nặng về tài sản do thiên tai, hỏa hoạn, dịch bệnh nguy hiểm gây ra'
	}
] as const

export type SpecialReasonCode = (typeof SPECIAL_REASONS)[number]['code']

export function canTakeSpecialLeave(
	objectType: LeaveObjectType | string
): boolean {
	const ot = normalizeObjectType(String(objectType))
	if (!ot) return false
	return (['SQ', 'QNCN', 'CNQP', 'VCQP'] as string[]).includes(ot)
}

export function validateSpecialLeave(
	objectType: LeaveObjectType | string,
	specialDays: number,
	reasons: string[]
): string | null {
	if (!canTakeSpecialLeave(objectType)) {
		return 'Chỉ sỹ quan, QNCN, công nhân QP và viên chức QP được nghỉ phép đặc biệt'
	}
	if (
		!Number.isFinite(specialDays) ||
		specialDays < 1 ||
		specialDays > SPECIAL_MAX_DAYS
	) {
		return `Phép đặc biệt mỗi lần không quá ${SPECIAL_MAX_DAYS} ngày (tối thiểu 1 ngày)`
	}
	if (!reasons.length) {
		return 'Vui lòng chọn ít nhất một lý do phép đặc biệt'
	}
	const allowed = SPECIAL_REASONS.map((r) => r.code)
	const invalid = reasons.filter((c) => !allowed.includes(c as never))
	if (invalid.length) {
		return `Lý do phép đặc biệt không hợp lệ: ${invalid.join(', ')}`
	}
	return null
}

export function nowIso(): string {
	return new Date().toISOString()
}

export function objectTypeLabel(code: string | null | undefined): string {
	if (!code) return ''
	const n = normalizeObjectType(code) || code
	return OBJECT_TYPE_LABELS[n] || OBJECT_TYPE_LABELS[code] || code
}
