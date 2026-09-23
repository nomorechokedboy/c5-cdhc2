import type { ReactNode } from 'react'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ClassResults } from '@/components/reports/ClassResultsPage'
import useAuth from '@/hooks/useAuth'

export const Route = createFileRoute('/khoa-hoc/$categoryIdnumber/ket-qua')({
	component: RouteComponent
})

// Class reports are for admin and manager; everyone else goes home.
function StaffOnly({ children }: { children: ReactNode }) {
	const { isAdmin, isManager } = useAuth()
	if (!isAdmin && !isManager) return <Navigate to='/' replace />
	return <>{children}</>
}

function RouteComponent() {
	const { categoryIdnumber } = Route.useParams()
	return (
		<ProtectedRoute>
			<StaffOnly>
				<ClassResults categoryParam={categoryIdnumber} />
			</StaffOnly>
		</ProtectedRoute>
	)
}
