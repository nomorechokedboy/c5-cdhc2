import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { StudentDashboard } from '@/components/student/dashboard'
import useAuth from '@/hooks/useAuth'

export const Route = createFileRoute('/')({
	component: App
})

function App() {
	const { role } = useAuth()
	return (
		<ProtectedRoute>
			{role === 'student' && <StudentDashboard />}
		</ProtectedRoute>
	)
}
