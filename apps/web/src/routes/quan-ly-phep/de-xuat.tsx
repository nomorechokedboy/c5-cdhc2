import { createFileRoute, redirect } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import LeaveRequestForm from '@/components/leave-management/LeaveRequestForm'
import { GetLeaveMyAccess } from '@/api/leave'

export const Route = createFileRoute('/quan-ly-phep/de-xuat')({
	beforeLoad: async () => {
		const access = await GetLeaveMyAccess()
		if (!access.canPropose || (access.isAgency && !access.isAdmin)) {
			throw redirect({ to: '/quan-ly-phep/duyet' })
		}
	},
	component: () => (
		<ProtectedRoute>
			<SidebarInset>
				<div className='p-6 md:p-8'>
					<LeaveRequestForm />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
})
