import {
	Outlet,
	createRootRouteWithContext,
	useNavigate
} from '@tanstack/react-router'
import useAuth from '@/hooks/useAuth'
import React, { useRef } from 'react'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '../components/Header'
import TanStackQueryLayout from '../integrations/tanstack-query/layout'
import { type QueryClient } from '@tanstack/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import NganhUserAccessGuard from '@/components/NganhUserAccessGuard'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import type { notifications, StreamIn } from '@/api/client'
import { useEffectOnce } from 'react-use'
import { requestClient } from '@/api'
import useInfiniteNotification from '@/hooks/useInfiniteNotification'
import useUnreadNotificationCount from '@/hooks/useUnreadNotificationCount'
import Cdhc2Logo from '@/assets/cdhc2.png'
import useIsInitAdmin from '@/hooks/useIsInitAdmin'

interface MyRouterContext {
	queryClient: QueryClient
}

export const NavbarContext = React.createContext(true)

function RootLayout() {
	const navigate = useNavigate()
	const { isAuthenticated } = useAuth()
	const { refetch: refetchNotifications } = useInfiniteNotification()
	const { refetch: refetchUnreadNoti } = useUnreadNotificationCount()
	const streamRef = useRef<StreamIn<notifications.Message>>(null)
	const { data: isInitAdmin } = useIsInitAdmin()

	if (isInitAdmin === false) {
		navigate({ to: '/khoi-tao-qtv', replace: true })
	}

	function handleRefreshNoti() {
		refetchUnreadNoti()
		refetchNotifications()
	}

	function createWebNotification({
		message,
		title,
		icon = Cdhc2Logo
	}: {
		title: string
		message: string
		icon?: string
	}) {
		if (window.Notification && Notification.permission === 'granted') {
			new Notification(title, {
				body: message,
				icon
			})
		}
	}

	async function setupStream() {
		try {
			const stream = await requestClient.notifications.NotificationStream(
				{
					userId: 0
				}
			)

			streamRef.current = stream

			stream.socket.on('open', () => {
				console.log('Notification stream connected')
			})

			stream.socket.on('close', () => {
				console.log('Notification stream disconnected')
			})

			stream.socket.on('error', (error: any) => {
				console.error('Notification stream error:', error)
			})

			for await (const notificationEvent of stream) {
				if (notificationEvent.type === 'ping') {
					continue
				}

				console.log('Received notification:', notificationEvent)
				handleRefreshNoti()
				createWebNotification({
					title: notificationEvent.data.title,
					message: notificationEvent.data.message
				})
			}
		} catch (err) {
			console.error('Failed to start stream', err)
		}
	}

	const stopNotificationStream = () => {
		if (streamRef.current) {
			streamRef.current.socket.close()
			streamRef.current = null
		}
	}

	useEffectOnce(() => {
		if (isAuthenticated !== true) {
			return
		}

		setupStream()

		return () => {
			stopNotificationStream()
		}
	})

	return (
		<>
			<SidebarProvider className='h-full max-h-dvh overflow-hidden'>
				{isAuthenticated && <AppSidebar collapsible='icon' />}
				{isAuthenticated && <NganhUserAccessGuard />}
				<Toaster richColors position='top-center' />
				{/*
				 * Khung đồng bộ PC / laptop:
				 * - Header cố định (không cuộn theo)
				 * - Nội dung cuộn trong .app-shell-main — cùng hành vi mọi độ phân giải
				 */}
				<div className='app-shell'>
					{isAuthenticated && <Header />}
					<main className='app-shell-main'>
						<Outlet />
					</main>
				</div>
			</SidebarProvider>
			<TanStackRouterDevtools />
			<TanStackQueryLayout />
		</>
	)
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootLayout
})
