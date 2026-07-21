/**
 * Quy ước mã vật tư:
 *
 * 1) Danh mục / thực lực (chuẩn):
 *    {mãVT danh mục}-G{cấp}-{alias đơn vị}
 *    VD: HC2A0113-G2-D1  (thiết bị HC2A0113, cấp 2, Đại đội 1)
 *
 * 2) Mã vị trí cũ (legacy, hiếm):
 *    {mãTòa}{sốTầng}.{số/mãPhòng}-{viếtTắt}  → A1.101-PC
 */

/** Mã danh mục thuần hoặc đầy đủ cấp+đơn vị */
export function isCatalogStyleAssetCode(code: string): boolean {
	const s = (code || '').trim().toUpperCase()
	return /^HC2[A-Z]\d{2,}(-G[1-5](-[A-Z0-9]+)?)?$/.test(s)
}

/**
 * Gỡ prefix vị trí nhầm: CDHC20.CDHC2-D1-HC2A0113 → HC2A0113
 */
export function stripLocationPrefixFromCatalog(code: string): string {
	const raw = (code || '').trim()
	const m = raw
		.toUpperCase()
		.match(/HC2[A-Z]\d{2,}(?:-G[1-5](?:-[A-Z0-9]+)?)?/)
	if (m && !isCatalogStyleAssetCode(raw)) {
		return m[0]!
	}
	return raw
}

/**
 * Mã VT phòng theo danh mục + cấp + đơn vị.
 * HC2A0113 + grade 2 + D1 → HC2A0113-G2-D1
 */
export function buildCatalogRoomAssetCode(
	materialCode: string,
	grade: number | string,
	unitAlias: string | null | undefined
): string {
	const base = (materialCode || '').trim().toUpperCase()
	if (!base) return ''
	// Nếu đã đủ HC2…-G2-D1 thì giữ
	if (/^HC2[A-Z]\d{2,}-G[1-5]-[A-Z0-9]+$/i.test(base)) {
		return base
	}
	// Bỏ hậu tố -G… nếu có rồi ghép lại
	const mat = base.replace(/-G[1-5](-[A-Z0-9]+)?$/i, '')
	const g = Math.min(5, Math.max(1, Number(grade) || 1))
	const alias = (unitAlias || '').trim().toUpperCase()
	if (!alias) return `${mat}-G${g}`
	return `${mat}-G${g}-${alias}`
}

/**
 * Suy alias đơn vị từ VT trong phòng / mã phòng.
 * Ưu tiên: holdingUnitId (cần map ngoài) → hậu tố mã HC2…-G2-D1 → roomCode.
 */
export function extractUnitAliasFromAssetCode(
	code: string | null | undefined
): string | null {
	const raw = (code || '').trim().toUpperCase()
	const m = raw.match(/^HC2[A-Z]\d{2,}-G[1-5]-([A-Z0-9]+)$/)
	return m ? m[1]! : null
}

/** Lấy hậu tố đơn vị phổ biến nhất trong danh sách mã VT phòng */
export function resolveUnitAliasFromCodes(
	codes: Array<string | null | undefined>,
	roomCode?: string | null
): string | null {
	const counts = new Map<string, number>()
	for (const c of codes) {
		const a = extractUnitAliasFromAssetCode(c)
		if (!a) continue
		counts.set(a, (counts.get(a) || 0) + 1)
	}
	if (counts.size > 0) {
		let best = ''
		let n = 0
		for (const [k, v] of counts) {
			if (v > n) {
				best = k
				n = v
			}
		}
		if (best) return best
	}
	// room_code kiểu CDHC2-D1 / …-BGH → lấy phần sau dấu - cuối
	const rc = (roomCode || '').trim().toUpperCase()
	if (rc.includes('-')) {
		const tail = rc.split('-').pop() || ''
		if (/^[A-Z][A-Z0-9]{0,11}$/.test(tail)) return tail
	}
	return null
}

/** Lấy phần số/mã phòng từ roomCode (vd. "A1.101" → "101", "101" → "101") */
export function extractRoomNumberPart(
	roomCode: string,
	buildingCode?: string | null,
	floorNumber?: number | null
): string {
	let part = (roomCode ?? '').trim()
	if (!part) return ''

	const b = (buildingCode ?? '').trim()
	if (b && floorNumber != null) {
		const prefix = `${b}${floorNumber}.`
		if (part.toUpperCase().startsWith(prefix.toUpperCase())) {
			part = part.slice(prefix.length)
		}
	}

	// Nếu còn dạng X.Y.Z hoặc A1.101 → lấy sau dấu chấm cuối
	if (part.includes('.')) {
		part = part.split('.').pop() ?? part
	}

	// Dạng cũ "A-101" / "P-102" → lấy số phòng "101"
	if (/^[A-Za-z]+-\d+[A-Za-z]?$/.test(part)) {
		part = part.split('-').pop() ?? part
	}

	return part.trim()
}

/**
 * Mã vị trí phòng: A1.101
 * Ưu tiên ghép từ tòa + tầng + số phòng (không dùng roomCode thô nếu lệch chuẩn).
 */
export function buildLocationCode(
	buildingCode: string | null | undefined,
	floorNumber: number | null | undefined,
	roomCode: string | null | undefined
): string {
	const b = (buildingCode ?? '').trim()
	const roomPart = extractRoomNumberPart(
		roomCode ?? '',
		buildingCode,
		floorNumber
	)

	if (b && floorNumber != null && roomPart) {
		return `${b}${floorNumber}.${roomPart}`
	}
	// Fallback: roomCode đã chuẩn (vd. A1.101)
	if (roomCode?.trim()) return roomCode.trim()
	if (b && floorNumber != null) return `${b}${floorNumber}`
	return ''
}

/** Prefix nhập mã VT: "A1.101-" */
export function buildAssetCodePrefix(
	buildingCode: string | null | undefined,
	floorNumber: number | null | undefined,
	roomCode: string | null | undefined
): string {
	const loc = buildLocationCode(buildingCode, floorNumber, roomCode)
	return loc ? `${loc}-` : ''
}

/**
 * Mã vật tư đầy đủ: A1.101-PC
 * suffix = viết tắt thiết bị (PC, TV, MC…)
 */
export function buildAssetCode(
	buildingCode: string | null | undefined,
	floorNumber: number | null | undefined,
	roomCode: string | null | undefined,
	suffix: string
): string {
	const s = (suffix ?? '').trim().replace(/^-+/, '').toUpperCase()
	const prefix = buildAssetCodePrefix(buildingCode, floorNumber, roomCode)
	if (!s) return prefix.replace(/-$/, '')
	if (!prefix) return s
	// Nếu user dán cả mã đầy đủ, chuẩn hóa lại
	if (s.includes('-') || s.includes('.')) {
		const last = s.split('-').pop() ?? s
		return `${prefix}${last}`
	}
	return `${prefix}${s}`
}
