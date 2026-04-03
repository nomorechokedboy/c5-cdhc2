import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { AuditLogPage } from '@/components/admin/AuditLogPage'

export const Route = createFileRoute('/audit')({
	component: AuditRoute
})

function AuditRoute() {
	return (
		<ProtectedRoute>
			<AuditLogPage />
		</ProtectedRoute>
	)
}
