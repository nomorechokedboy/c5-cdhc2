import { Outlet, createRootRouteWithContext } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';

import Header from '../components/Header';

import TanStackQueryLayout from '../integrations/tanstack-query/layout.tsx';

import type { QueryClient } from '@tanstack/react-query';
import { AppSidebar } from '@/components/app-sidebar';
import {
        Breadcrumb,
        BreadcrumbList,
        BreadcrumbItem,
        BreadcrumbLink,
        BreadcrumbSeparator,
        BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
        SidebarProvider,
        SidebarInset,
        SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@radix-ui/react-select';

interface MyRouterContext {
        queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
        component: () => (
                <>
                        <SidebarProvider>
                                <AppSidebar />

                                <Outlet />
                        </SidebarProvider>
                        <TanStackRouterDevtools />

                        <TanStackQueryLayout />
                </>
        ),
});
