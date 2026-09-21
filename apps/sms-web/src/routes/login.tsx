import { AuthController } from '@/biz'
import { initiateOAuth2Login } from '@/biz/oauth2'
import useAuth, { AUTH_QUERY_KEY } from '@/hooks/useAuth'
import type { TokenEvent } from '@/types'
import { Button } from '@repo/ui/components/ui/button'
import { SidebarInset } from '@repo/ui/components/ui/sidebar'
import { toast } from '@repo/ui/components/ui/sonner'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import Cdhc2Logo from '@/assets/cdhc2.png'
import { ThemeToggle } from '@/components/theme-toggle'

export const Route = createFileRoute('/login')({
	component: Login,
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: (search.redirect as string) || '/'
	})
})

export default function Login() {
	const { t } = useTranslation()
	const { isAuthenticated, isAuthLoading, queryClient } = useAuth()
	const { redirect } = Route.useSearch()

	const handleLoginWithMoodle = () => {
		initiateOAuth2Login()
	}

	const handleEventListener = (event: MessageEvent<TokenEvent>) => {
		if (event.data?.token) {
			const { accessToken, refreshToken } = event.data.token
			AuthController.setTokens({ accessToken, refreshToken })
			toast.success(t('auth.loginSuccess'))
			queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY })
		}
	}

	useEffect(() => {
		window.addEventListener('message', handleEventListener)
		return () => {
			window.removeEventListener('message', handleEventListener)
		}
	}, [])

	if (isAuthenticated && !isAuthLoading) {
		return <Navigate to={redirect} replace />
	}

	return (
		<SidebarInset className='paper'>
			<div className='relative flex min-h-screen items-center justify-center p-4'>
				<ThemeToggle className='absolute top-4 right-4' />
				<main className='w-full max-w-md overflow-hidden rounded-lg border bg-card shadow-[6px_6px_0_0_var(--primary)]'>
					{/* Bìa sổ: gáy xanh than mang huy hiệu trường */}
					<div className='flex flex-col items-center gap-4 bg-sidebar px-8 pt-8 pb-7 text-center text-sidebar-foreground'>
						<div className='grid size-28 place-items-center rounded-full bg-white ring-4 ring-sidebar-primary'>
							<img
								src={Cdhc2Logo}
								alt='Logo Trường Cao đẳng Hậu cần 2'
								width={96}
								height={96}
							/>
						</div>
						<div className='space-y-1'>
							<h1 className='ink-in font-serif text-3xl leading-tight text-balance font-semibold'>
								{t('auth.loginTitle')}
							</h1>
							<p className='text-sm text-sidebar-foreground/75'>
								{t('nav.appSubtitle')}
							</p>
						</div>
					</div>
					<div className='space-y-5 px-8 py-7'>
						<p className='text-center text-muted-foreground'>
							{t('auth.loginSubtitle')}
						</p>
						<Button
							size='lg'
							className='h-12 w-full text-base'
							onClick={handleLoginWithMoodle}
						>
							<img
								src={Cdhc2Logo}
								alt='Logo Học liệu số'
								width={24}
								height={24}
								className='rounded-full bg-white p-px'
							/>
							{t('auth.loginButton')}
						</Button>
					</div>
				</main>
			</div>
		</SidebarInset>
	)
}
