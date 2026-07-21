import ProtectedRoute from '@/components/ProtectedRoute'
import AssetUpdatePage from '@/components/asset-management/AssetUpdatePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/cap-nhat')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<AssetUpdatePage />
		</ProtectedRoute>
	)
}
