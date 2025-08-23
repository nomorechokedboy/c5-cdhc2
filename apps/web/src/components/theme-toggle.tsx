import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
	DropdownMenuSeparator,
	DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { useEffect, useState } from 'react'
import type { AppTheme } from '@/types'

export function applyTheme(currentTheme: AppTheme) {
	const root = document.documentElement
	const themes: AppTheme[] = [
		'light',
		'dark',
		'red',
		'blue',
		'green',
		'purple',
		'orange',
		'stone',
		'zinc',
		'gray',
		'slate'
	]
	root.classList.remove(...themes)

	let themeToApply = currentTheme

	if (currentTheme === 'system') {
		themeToApply = window.matchMedia('(prefers-color-scheme: dark)').matches
			? 'dark'
			: 'light'
	}

	root.classList.add(themeToApply)
}

type ThemeOption = { name: AppTheme; label: string; icon?: any; color?: string }

export function ThemeToggle() {
	const [theme, setTheme] = useState<AppTheme>('none')

	const themes: ThemeOption[] = [
		{ name: 'light', label: 'Light', icon: Sun },
		{ name: 'dark', label: 'Dark', icon: Moon },
		{ name: 'system', label: 'System', icon: Monitor }
	]

	const colorThemes: ThemeOption[] = [
		{ name: 'blue', label: 'Blue', color: 'bg-blue-500' },
		{ name: 'green', label: 'Green', color: 'bg-green-500' },
		{ name: 'purple', label: 'Purple', color: 'bg-purple-500' },
		{ name: 'orange', label: 'Orange', color: 'bg-orange-500' },
		{ name: 'red', label: 'Red', color: 'bg-red-500' },
		{ name: 'zinc', label: 'Zinc', color: 'bg-zinc-500' },
		{ name: 'gray', label: 'Gray', color: 'bg-gray-500' },
		{ name: 'stone', label: 'Stone', color: 'bg-stone-500' },
		{ name: 'slate', label: 'Slate', color: 'bg-slate-500' }
	]

	const updateTheme = (newTheme: AppTheme) => {
		setTheme(newTheme)
		localStorage.setItem('qlhvTheme', newTheme)
		applyTheme(newTheme)
	}

	useEffect(() => {
		const loadedTheme = localStorage.getItem('qlhvTheme') || 'os'
		setTheme(loadedTheme as AppTheme)
	}, [])

	useEffect(() => {
		const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
		const handleChange = () => {
			if (theme === 'system') {
				applyTheme('system')
			}
		}
		mediaQuery.addEventListener('change', handleChange)
		return () => mediaQuery.removeEventListener('change', handleChange)
	}, [theme])

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='outline' size='icon'>
					<Sun className='h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0' />
					<Moon className='absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100' />
					<span className='sr-only'>Toggle theme</span>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-48'>
				<DropdownMenuLabel>Theme Mode</DropdownMenuLabel>
				{themes.map((themeOption) => {
					const Icon = themeOption.icon
					return (
						<DropdownMenuItem
							key={themeOption.name}
							onClick={() => updateTheme(themeOption.name)}
							className='flex items-center gap-2'
						>
							<Icon className='h-4 w-4' />
							{themeOption.label}
							{theme === themeOption.name && (
								<span className='ml-auto'>✓</span>
							)}
						</DropdownMenuItem>
					)
				})}

				<DropdownMenuSeparator />
				<DropdownMenuLabel>Color Themes</DropdownMenuLabel>
				{colorThemes.map((colorTheme) => (
					<DropdownMenuItem
						key={colorTheme.name}
						onClick={() => updateTheme(colorTheme.name)}
						className='flex items-center gap-2'
					>
						<div
							className={`h-4 w-4 rounded-full ${colorTheme.color}`}
						/>
						{colorTheme.label}
						{theme === colorTheme.name && (
							<span className='ml-auto'>✓</span>
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	)
}
