/** Mục menu tối thiểu mà việc xác định "đang mở" cần biết. */
export interface NavLike {
	url: string
	search?: Record<string, string>
	items?: NavLike[]
}

export interface NavLocation {
	pathname: string
	search?: Record<string, unknown>
}

function pathMatches(url: string, pathname: string): boolean {
	if (url === '/') return pathname === '/'
	const base = url.endsWith('/') ? url.slice(0, -1) : url
	return pathname === base || pathname.startsWith(`${base}/`)
}

function searchMatches(
	item: NavLike,
	search: Record<string, unknown> | undefined
): boolean {
	if (!item.search) return true
	return Object.entries(item.search).every(
		([key, value]) => String(search?.[key] ?? '') === value
	)
}

/** Khoá ổn định của một mục (url + search) để so sánh giữa các lần render. */
export function navItemKey(item: NavLike): string {
	return item.search ? `${item.url}?${JSON.stringify(item.search)}` : item.url
}

function leaves(items: NavLike[]): NavLike[] {
	return items.flatMap((item) =>
		item.items?.length ? leaves(item.items) : [item]
	)
}

/**
 * Mục lá khớp nhất với vị trí hiện tại: url dài nhất thắng, ngang nhau thì mục
 * có điều kiện search khớp thắng mục không có. Chỉ một mục được đánh dấu để
 * `/vat-tu` và `/vat-tu/danh-muc-nganh` không cùng sáng.
 */
export function findActiveNavItem(
	items: NavLike[],
	location: NavLocation
): NavLike | undefined {
	let best: NavLike | undefined
	let bestScore = -1
	for (const item of leaves(items)) {
		if (!pathMatches(item.url, location.pathname)) continue
		if (!searchMatches(item, location.search)) continue
		const score = item.url.length * 2 + (item.search ? 1 : 0)
		if (score > bestScore) {
			best = item
			bestScore = score
		}
	}
	return best
}

/** Nhóm/mục cha có chứa mục đang mở không — dùng để mở sẵn nhóm đó. */
export function navContainsKey(item: NavLike, key: string | undefined) {
	if (!key) return false
	if (!item.items?.length) return navItemKey(item) === key
	return item.items.some((child) => navContainsKey(child, key))
}
