import ProtectedRoute from '@/components/ProtectedRoute'
import AssetReports from '@/components/asset-management/AssetReports'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/bao-cao')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<AssetReports />
		</ProtectedRoute>
	)
}
