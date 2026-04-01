import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import { StudentDashboard } from '@/components/student/dashboard'
import { TeacherDashboard } from '@/components/teacher/dashboard'
import { ManagerDashboard } from '@/components/manager/dashboard'
import { AdminDashboard } from '@/components/admin/dashboard'
import useAuth from '@/hooks/useAuth'

export const Route = createFileRoute('/')({
	component: App
})

function App() {
	const { role } = useAuth()

	return (
		<ProtectedRoute>
			{role === 'student' && <StudentDashboard />}
			{role === 'teacher' && <TeacherDashboard />}
			{role === 'manager' && <ManagerDashboard />}
			{role === 'admin' && <AdminDashboard />}
		</ProtectedRoute>
	)
}
