import ProtectedRoute from '@/components/ProtectedRoute'
import AssetSearchPage from '@/components/asset-management/AssetSearchPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/tim-kiem')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<AssetSearchPage />
		</ProtectedRoute>
	)
}
