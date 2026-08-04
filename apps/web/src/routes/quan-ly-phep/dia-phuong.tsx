import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import PlaceholderPage from '@/components/leave-management/PlaceholderPage'

export const Route = createFileRoute('/quan-ly-phep/dia-phuong')({
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
