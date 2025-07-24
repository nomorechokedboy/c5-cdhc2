import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import Header from '../components/Header';
import TanStackQueryLayout from '../integrations/tanstack-query/layout';
import type { QueryClient } from '@tanstack/react-query';
import { AppSidebar } from '@/components/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/sonner';

interface MyRouterContext {
        queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
        component: () => (
                <>
                        <SidebarProvider>
                                <AppSidebar />

                                <Toaster richColors position="top-center" />
                                <div className="flex flex-col w-full">
                                        <Header />
                                        <Outlet />
                                </div>
                        </SidebarProvider>
                        <TanStackRouterDevtools />

                        <TanStackQueryLayout />
                </>
        ),
});
