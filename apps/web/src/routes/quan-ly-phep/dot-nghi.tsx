import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import LeaveBatchesPage from '@/components/leave-management/LeaveBatchesPage'

export const Route = createFileRoute('/quan-ly-phep/dot-nghi')({
	component: () => (
		<ProtectedRoute>
			<SidebarInset>
				<div className='p-6 md:p-8'>
					<LeaveBatchesPage />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
})
