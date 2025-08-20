import {
	Outlet,
	createRootRouteWithContext,
	useRouter
} from '@tanstack/react-router'
import { useAuth } from '@/context/AuthContext'
import React, { useRef } from 'react'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import Header from '../components/Header'
import TanStackQueryLayout from '../integrations/tanstack-query/layout'
import type { QueryClient } from '@tanstack/react-query'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import type { notifications, StreamIn } from '@/api/client'
import { useEffectOnce } from 'react-use'
import { requestClient } from '@/api'
import useInfiniteNotification from '@/hooks/useInfiniteNotification'
import useUnreadNotificationCount from '@/hooks/useUnreadNotificationCount'
import Cdhc2Logo from '@/assets/cdhc2.png'

interface MyRouterContext {
	queryClient: QueryClient
}

export const NavbarContext = React.createContext(true)

function RootLayout() {
	const router = useRouter()
	const { isAuthenticated } = useAuth()
	const currentPath = router.state.location.pathname
	const showNavbar = isAuthenticated && currentPath !== '/login'
	const { refetch: refetchNotifications } = useInfiniteNotification()
	const { refetch: refetchUnreadNoti } = useUnreadNotificationCount()

	const streamRef = useRef<StreamIn<notifications.Message>>(null)

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
		setupStream()

		return () => {
			stopNotificationStream()
		}
	})

	return (
		<NavbarContext.Provider value={showNavbar}>
			{showNavbar ? (
				<>
					<SidebarProvider>
						<AppSidebar collapsible='icon' />
						<Toaster richColors position='top-center' />
						<div className='flex flex-col w-full'>
							<Header />
							<Outlet />
						</div>
					</SidebarProvider>
					<TanStackRouterDevtools />
					<TanStackQueryLayout />
				</>
			) : (
				<div className='min-h-svh w-full flex items-center justify-center'>
					<Outlet />
				</div>
			)}
		</NavbarContext.Provider>
	)
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootLayout
})
