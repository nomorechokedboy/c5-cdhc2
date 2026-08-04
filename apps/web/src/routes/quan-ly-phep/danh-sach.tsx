import { createFileRoute } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import LeaveListPage from '@/components/leave-management/LeaveListPage'

export const Route = createFileRoute('/quan-ly-phep/danh-sach')({
	component: () => (
		<ProtectedRoute>
			<SidebarInset>
				<div className='p-6 md:p-8'>
					<LeaveListPage />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
})
