import { Outlet, createRootRouteWithContext, useRouter } from '@tanstack/react-router';
import { useAuth } from '@/context/AuthContext';
import React from 'react';
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

export const NavbarContext = React.createContext(true);

function RootLayout() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const currentPath = router.state.location.pathname;
  const showNavbar = isAuthenticated && currentPath !== '/login';

  return (
    <NavbarContext.Provider value={showNavbar}>
      {showNavbar ? (
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
      ) : (
        <div className="min-h-svh w-full flex items-center justify-center">
          <Outlet />
        </div>
      )}
    </NavbarContext.Provider>
  );
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  component: RootLayout,
});
