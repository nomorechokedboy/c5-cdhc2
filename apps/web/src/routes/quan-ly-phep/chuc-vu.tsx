import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { SidebarInset } from '@/components/ui/sidebar'
import PlaceholderPage from '@/components/leave-management/PlaceholderPage'

export const Route = createFileRoute('/quan-ly-phep/chuc-vu')({
	component: () => (
		<ProtectedRoute>
			<SidebarInset>
				<div className='p-6 md:p-8'>
					<PlaceholderPage />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
})
