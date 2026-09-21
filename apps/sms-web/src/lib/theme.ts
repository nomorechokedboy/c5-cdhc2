export type Theme = 'light' | 'dark'

export const THEME_KEY = 'sms-theme'

/** Giao diện đã lưu; chưa lưu thì theo cài đặt sáng/tối của hệ điều hành */
export function readTheme(
	storage: Pick<Storage, 'getItem'> | undefined,
	prefersDark: boolean
): Theme {
	let saved: string | null = null
	try {
		saved = storage?.getItem(THEME_KEY) ?? null
	} catch {
		// Trình duyệt chặn localStorage: dùng mặc định
	}
	if (saved === 'light' || saved === 'dark') return saved
	return prefersDark ? 'dark' : 'light'
}

export const otherTheme = (theme: Theme): Theme =>
	theme === 'dark' ? 'light' : 'dark'
