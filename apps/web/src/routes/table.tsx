import { SidebarInset } from '@/components/ui/sidebar';
import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/table')({
  loader: () => {
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';
    if (!isAuthenticated) {
      return redirect({ to: '/login' });
    }
    return null;
  },
  component: TableTest,
});

function TableTest() {
        return <SidebarInset></SidebarInset>;
}
