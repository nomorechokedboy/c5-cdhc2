import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import UnitsPage from '@/components/leave-management/UnitsPage'

export const Route = createFileRoute('/quan-ly-phep/don-vi')({
	component: () => (
		<ProtectedRoute>
			<SidebarInset>
				<div className='p-6 md:p-8'>
					<UnitsPage />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
})
