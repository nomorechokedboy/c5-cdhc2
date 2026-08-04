import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import PlaceholderPage from '@/components/leave-management/PlaceholderPage'

export const Route = createFileRoute('/quan-ly-phep/quan-nhan')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='flex flex-1 flex-col space-y-8 p-6 md:p-8'>
					<PlaceholderPage />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
