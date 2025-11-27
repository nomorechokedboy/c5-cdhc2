import { AuthController } from '@/biz'
import { initiateOAuth2Login } from '@/biz/oauth2'
import useAuth from '@/hooks/useAuth'
import type { TokenEvent } from '@/types'
import { Button } from '@repo/ui/components/ui/button'
import {
	Card,
	CardHeader,
	CardDescription,
	CardTitle,
	CardContent
} from '@repo/ui/components/ui/card'
import { SidebarInset } from '@repo/ui/components/ui/sidebar'
import { toast } from '@repo/ui/components/ui/sonner'
import { Navigate, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import Cdhc2Logo from '@/assets/cdhc2.png'

export const Route = createFileRoute('/login')({
	component: Login,
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: (search.redirect as string) || '/'
	})
})

export default function Login() {
	const navigate = useNavigate()
	const { isAuthenticated, isAuthLoading } = useAuth()
	const { redirect } = Route.useSearch()

	const handleLoginWithMoodle = () => {
		initiateOAuth2Login()
	}

	const handleEventListener = (event: MessageEvent<TokenEvent>) => {
		if (event.data?.token) {
			const { accessToken, refreshToken } = event.data.token
			AuthController.setTokens({ accessToken, refreshToken })
			toast.success('Đăng nhập thành công!')
			navigate({ to: '/', replace: true })
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
		<SidebarInset>
			<div className='min-h-screen flex items-center justify-center bg-background p-4'>
				<div className='w-full max-w-md'>
					<Card className='w-full'>
						<div className='flex items-center justify-center'>
							<img
								src={Cdhc2Logo}
								alt='Logo Trường Cao đẳng Hậu cần 2'
								width={128}
								height={128}
							/>
						</div>
						<CardHeader className='text-center'>
							<CardTitle className='text-2xl font-bold'>
								Chào mừng bạn đã quay lại
							</CardTitle>
							<CardDescription className='text-base'>
								Hệ thống quản lý điểm số Trường Cao đẳng Hậu cần
								2
							</CardDescription>
						</CardHeader>
						<CardContent className='space-y-4'>
							<Button
								variant='outline'
								className='w-full h-12 text-base bg-transparent'
								onClick={handleLoginWithMoodle}
							>
								<img
									src={Cdhc2Logo}
									alt='Logo Học liệu số'
									width={24}
									height={24}
								/>
								Đăng nhập bằng Học liệu số
							</Button>
						</CardContent>
					</Card>
				</div>
			</div>
		</SidebarInset>
	)
}
