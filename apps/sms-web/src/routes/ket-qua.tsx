import type { ReactNode } from 'react'
import { Navigate, createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { MyResultsPage } from '@/components/reports/MyResultsPage'
import useAuth from '@/hooks/useAuth'

export const Route = createFileRoute('/ket-qua')({
	component: RouteComponent
})

// Staff have the class report instead; only students see their own result.
function StudentOnly({ children }: { children: ReactNode }) {
	const { isStudent } = useAuth()
	if (!isStudent) return <Navigate to='/' replace />
	return <>{children}</>
}

function RouteComponent() {
	return (
		<ProtectedRoute>
			<StudentOnly>
				<MyResultsPage />
			</StudentOnly>
		</ProtectedRoute>
	)
}
