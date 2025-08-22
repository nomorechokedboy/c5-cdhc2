import { AppSidebarSkeleton } from '@/components/app-sidebar-skeleton'
import { SidebarProvider } from '@/components/ui/sidebar'
import SidebarChildrenSkeleton from './sidebar-children-skeleton'

export function PageSkeleton() {
	return (
		<SidebarProvider>
			<AppSidebarSkeleton />
			<SidebarChildrenSkeleton />
		</SidebarProvider>
	)
}
