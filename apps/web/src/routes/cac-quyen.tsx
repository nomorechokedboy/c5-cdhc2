import PermissionsTab from '@/components/permission'
import ProtectedRoute from '@/components/ProtectedRoute'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/cac-quyen')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<PermissionsTab />
		</ProtectedRoute>
	)
}
