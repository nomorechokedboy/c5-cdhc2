import { Check, Monitor, Moon, Sun } from 'lucide-react'
import type { ComponentType } from 'react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { AppTheme } from '@/types'

const STORAGE_KEY = 'qlhvTheme'

const OPTIONS: Array<{
	name: AppTheme
	label: string
	icon: ComponentType<{ className?: string }>
}> = [
	{ name: 'light', label: 'Sáng', icon: Sun },
	{ name: 'dark', label: 'Tối', icon: Moon },
	{ name: 'system', label: 'Theo thiết bị', icon: Monitor }
]

export function applyTheme(theme: AppTheme) {
	const dark =
		theme === 'dark' ||
		(theme === 'system' &&
			window.matchMedia('(prefers-color-scheme: dark)').matches)
	document.documentElement.classList.toggle('dark', dark)
}

function readStoredTheme(): AppTheme {
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		return stored === 'light' || stored === 'dark' ? stored : 'system'
	} catch {
		return 'system'
	}
}

export function ThemeToggle({ className }: { className?: string }) {
	const [theme, setTheme] = useState<AppTheme>(readStoredTheme)

	const updateTheme = (next: AppTheme) => {
		setTheme(next)
		try {
			localStorage.setItem(STORAGE_KEY, next)
		} catch {
			// bỏ qua: chế độ riêng tư có thể chặn localStorage
		}
		applyTheme(next)
	}

	useEffect(() => {
		if (theme !== 'system') return
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		const handleChange = () => applyTheme('system')
		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [theme])

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant='outline'
					size='icon'
					className={cn('relative', className)}
				>
					<Sun className='h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
					<Moon className='absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
					<span className='sr-only'>Chế độ hiển thị</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-48'>
				<DropdownMenuLabel>Chế độ hiển thị</DropdownMenuLabel>
				{OPTIONS.map(({ name, label, icon: Icon }) => (
					<DropdownMenuItem
						key={name}
						onClick={() => updateTheme(name)}
						className='flex items-center gap-2'
					>
						<Icon className='h-4 w-4' />
						{label}
						{theme === name && (
							<Check className='ml-auto h-4 w-4' />
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
