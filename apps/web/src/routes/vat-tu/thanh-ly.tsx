import ProtectedRoute from '@/components/ProtectedRoute'
import LiquidationPage from '@/components/asset-management/LiquidationPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/thanh-ly')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<LiquidationPage />
		</ProtectedRoute>
	)
}
