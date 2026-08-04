import { createFileRoute, redirect } from '@tanstack/react-router'
import { SidebarInset } from '@/components/ui/sidebar'
import ProtectedRoute from '@/components/ProtectedRoute'
import ApproveLeavePage from '@/components/leave-management/ApproveLeavePage'
import { isSuperAdmin } from '@/lib/utils'
import { GetLeaveMyAccess } from '@/api/leave'

export const Route = createFileRoute('/quan-ly-phep/duyet')({
	beforeLoad: async () => {
		if (isSuperAdmin()) return
		try {
			const access = await GetLeaveMyAccess()
			if (!access.isCommander && !access.isAgency && !access.isAdmin) {
				throw redirect({ to: '/quan-ly-phep/danh-sach' })
			}
		} catch (e) {
			if (e && typeof e === 'object' && 'to' in e) throw e
		}
	},
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='flex flex-1 flex-col space-y-8 p-6 md:p-8'>
					<ApproveLeavePage />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
