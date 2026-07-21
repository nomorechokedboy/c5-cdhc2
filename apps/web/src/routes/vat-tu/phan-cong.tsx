import ProtectedRoute from '@/components/ProtectedRoute'
import RepairDispatchPage from '@/components/asset-management/RepairDispatchPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/phan-cong')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<RepairDispatchPage />
		</ProtectedRoute>
	)
}
