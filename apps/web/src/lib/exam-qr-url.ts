/**
 * QR đề thi: token lưu DB + URL để camera điện thoại mở trang thông tin.
 */

/** Token nội bộ (lưu DB / tra cứu) */
export function isExamQrToken(s: string): boolean {
	return /^EXAM:\d+:/i.test(String(s || '').trim())
}

/**
 * URL khi quét camera — mở trang /de-thi/qr hiển thị thông tin đề.
 * origin: window.location.origin (hoặc VITE public URL).
 */
export function buildExamQrScanUrl(
	tokenOrPayload: string,
	origin?: string
): string {
	const token = String(tokenOrPayload || '').trim()
	if (!token) return ''
	// Đã là URL trang qr → giữ nguyên
	if (/^https?:\/\//i.test(token) && /\/de-thi\/qr/i.test(token)) {
		return token
	}
	// URL khác nhưng có ?c=
	try {
		if (/^https?:\/\//i.test(token)) {
			const u = new URL(token)
			if (u.searchParams.get('c')) return token
		}
	} catch {
		/* ignore */
	}
	const base =
		origin ||
		(typeof window !== 'undefined' ? window.location.origin : '') ||
		''
	const c = isExamQrToken(token)
		? token
		: token.startsWith('EXAM:')
			? token
			: token
	return `${base.replace(/\/$/, '')}/de-thi/qr?c=${encodeURIComponent(c)}`
}

/** Rút token EXAM:… từ payload QR (URL hoặc token thuần) */
export function extractExamQrToken(raw: string): string {
	const text = String(raw || '').trim()
	if (!text) return ''
	if (isExamQrToken(text)) return text
	try {
		const u = text.includes('://')
			? new URL(text)
			: text.startsWith('/')
				? new URL(text, 'http://local.invalid')
				: null
		if (u) {
			const c =
				u.searchParams.get('c') ||
				u.searchParams.get('code') ||
				u.searchParams.get('q')
			if (c) return decodeURIComponent(c)
		}
	} catch {
		/* ignore */
	}
	return text
}
