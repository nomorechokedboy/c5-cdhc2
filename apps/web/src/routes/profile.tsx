import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { SidebarInset } from '@/components/ui/sidebar'
import ProfileView from '@/components/profile/profile-view'

export const Route = createFileRoute('/profile')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<SidebarInset>
				<div className='hidden h-full flex-1 flex-col space-y-8 p-8 md:flex'>
					<div className='flex items-center justify-between space-y-2'>
						<div>
							<h2 className='text-2xl font-bold tracking-tight'>
								Trang cá nhân
							</h2>
						</div>
					</div>
					<ProfileView />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
