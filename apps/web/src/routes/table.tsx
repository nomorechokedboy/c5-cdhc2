import { SidebarInset } from '@/components/ui/sidebar';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/table')({
        component: TableTest,
});

function TableTest() {
        return <SidebarInset></SidebarInset>;
}
