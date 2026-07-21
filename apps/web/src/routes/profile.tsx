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
				{/* Hiện mọi kích thước (kể cả mobile) — GV cần vào đổi chữ ký / mật khẩu */}
				<div className='flex h-full flex-1 flex-col space-y-6 p-4 md:space-y-8 md:p-8'>
					<div className='flex items-center justify-between space-y-2'>
						<div>
							<h2 className='text-2xl font-bold tracking-tight'>
								Trang cá nhân
							</h2>
							<p className='text-muted-foreground text-sm'>
								Thông tin, đổi mật khẩu, chữ ký số (in form đề)
							</p>
						</div>
					</div>
					<ProfileView />
				</div>
			</SidebarInset>
		</ProtectedRoute>
	)
}
