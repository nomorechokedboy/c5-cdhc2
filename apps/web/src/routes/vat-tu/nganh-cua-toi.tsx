import ProtectedRoute from '@/components/ProtectedRoute'
import MyNganhCatalog from '@/components/asset-management/MyNganhCatalog'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/nganh-cua-toi')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<MyNganhCatalog />
		</ProtectedRoute>
	)
}
