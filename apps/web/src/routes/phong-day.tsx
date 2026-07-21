import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import TeacherClassroomPage from '@/components/teacher-classroom-page'
import { SidebarInset } from '@/components/ui/sidebar'

export const Route = createFileRoute('/phong-day')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<SidebarInset>
				<TeacherClassroomPage />
			</SidebarInset>
		</ProtectedRoute>
	)
}
