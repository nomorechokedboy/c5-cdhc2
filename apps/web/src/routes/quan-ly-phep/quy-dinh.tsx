import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import RegulationsPage from '@/components/leave-management/RegulationsPage'

export const Route = createFileRoute('/quan-ly-phep/quy-dinh')({
	component: () => (
		<ProtectedRoute>
			<SidebarInset>
				<div className='p-6 md:p-8'>
					<RegulationsPage />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
})
