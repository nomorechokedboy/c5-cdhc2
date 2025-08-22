import { PoliticalQualityDashboard } from '@/components/politics-quality-report'
import ProtectedRoute from '@/components/ProtectedRoute'
import { SidebarInset } from '@/components/ui/sidebar'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/thong-ke-chinh-tri')({
	component: RouteComponent
})

function RouteComponent() {
	return (
		<ProtectedRoute>
			<SidebarInset>
				<PoliticalQualityDashboard />
			</SidebarInset>
		</ProtectedRoute>
	)
}
