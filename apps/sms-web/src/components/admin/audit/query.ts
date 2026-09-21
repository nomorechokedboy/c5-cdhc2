import type { Filters } from './types'

/** Chuỗi truy vấn của /audit/logs: chỉ mang những bộ lọc đã điền, ngày đổi sang ISO. */
export function buildLogQuery(page: number, limit: number, f: Filters) {
	const p = new URLSearchParams({ page: String(page), limit: String(limit) })
	if (f.event_type) p.set('event_type', f.event_type)
	if (f.outcome) p.set('outcome', f.outcome)
	if (f.actor_id) p.set('actor_id', f.actor_id)
	if (f.from) p.set('from', new Date(f.from).toISOString())
	if (f.to) p.set('to', new Date(f.to).toISOString())
	if (f.search) p.set('search', f.search)
	return p
}

/** Tối đa năm số trang quanh trang hiện tại, dồn vào trong khoảng [1, totalPages]. */
export function pageWindow(page: number, totalPages: number) {
	const start = Math.max(1, Math.min(totalPages - 4, page - 2))
	return Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i)
}
