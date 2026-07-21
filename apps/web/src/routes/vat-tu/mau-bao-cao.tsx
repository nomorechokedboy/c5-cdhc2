import ProtectedRoute from '@/components/ProtectedRoute'
import ReportTemplatePage from '@/components/asset-management/ReportTemplatePage'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/vat-tu/mau-bao-cao')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<ReportTemplatePage />
		</ProtectedRoute>
	)
}
