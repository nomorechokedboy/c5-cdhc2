import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanstackDevtools } from '@tanstack/react-devtools'
import Header from '../components/Header'
import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'
import type { QueryClient } from '@tanstack/react-query'
import { Fragment } from 'react/jsx-runtime'
import { SidebarProvider } from '@repo/ui/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import useAuth from '@/hooks/useAuth'
import { Toaster } from '@repo/ui/components/ui/sonner'

interface MyRouterContext {
	queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: () => {
		const { isAuthenticated } = useAuth()

		return (
			<Fragment>
				<SidebarProvider>
					{isAuthenticated === true && (
						<AppSidebar collapsible='icon' />
					)}
					<Toaster richColors position='top-center' />
					<div className='flex flex-col w-full'>
						{isAuthenticated === true && <Header />}
						<Outlet />
					</div>
					<TanstackDevtools
						config={{
							position: 'bottom-left'
						}}
						plugins={[
							{
								name: 'Tanstack Router',
								render: <TanStackRouterDevtoolsPanel />
							},
							TanStackQueryDevtools
						]}
					/>
				</SidebarProvider>
			</Fragment>
		)
	}
})
