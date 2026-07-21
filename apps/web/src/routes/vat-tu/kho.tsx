import ProtectedRoute from '@/components/ProtectedRoute'
import WarehousePage from '@/components/asset-management/WarehousePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/kho')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<WarehousePage />
		</ProtectedRoute>
	)
}
