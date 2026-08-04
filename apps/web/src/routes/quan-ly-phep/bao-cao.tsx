import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import LeaveReportsPage from '@/components/leave-management/LeaveReportsPage'

export const Route = createFileRoute('/quan-ly-phep/bao-cao')({
	component: () => (
		<ProtectedRoute>
			<SidebarInset>
				<div className='p-6 md:p-8'>
					<LeaveReportsPage />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
})
