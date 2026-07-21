import ProtectedRoute from '@/components/ProtectedRoute'
import AssetActivityLogsPage from '@/components/asset-management/AssetActivityLogsPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/nhat-ky')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<AssetActivityLogsPage />
		</ProtectedRoute>
	)
}
