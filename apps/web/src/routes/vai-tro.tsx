import ProtectedRoute from '@/components/ProtectedRoute'
import RolesTab from '@/components/role'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vai-tro')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<RolesTab />
		</ProtectedRoute>
	)
}
