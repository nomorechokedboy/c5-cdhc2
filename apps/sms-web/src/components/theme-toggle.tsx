import { Moon, Sun } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@repo/ui/components/ui/button'
import { THEME_KEY, otherTheme, readTheme, type Theme } from '@/lib/theme'

const current = (): Theme =>
	document.documentElement.classList.contains('dark') ? 'dark' : 'light'

/** Nút đổi giao diện sáng/tối; lựa chọn được nhớ trong trình duyệt */
export function ThemeToggle({ className }: { className?: string }) {
	const { t } = useTranslation()
	const [theme, setTheme] = useState<Theme>(() =>
		typeof document === 'undefined'
			? readTheme(undefined, false)
			: current()
	)

	const toggle = () => {
		const next = otherTheme(theme)
		document.documentElement.classList.toggle('dark', next === 'dark')
		try {
			localStorage.setItem(THEME_KEY, next)
		} catch {
			// Không lưu được thì chỉ đổi cho phiên này
		}
		setTheme(next)
	}

	return (
		<Button
			type='button'
			variant='ghost'
			size='icon'
			onClick={toggle}
			className={className}
			aria-label={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
			title={t(theme === 'dark' ? 'theme.toLight' : 'theme.toDark')}
		>
			{theme === 'dark' ? <Sun /> : <Moon />}
		</Button>
	)
}
