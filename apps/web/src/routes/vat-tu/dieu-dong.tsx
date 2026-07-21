import ProtectedRoute from '@/components/ProtectedRoute'
import TransferRecallPage from '@/components/asset-management/TransferRecallPage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/dieu-dong')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<TransferRecallPage />
		</ProtectedRoute>
	)
}
