import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamRoleGuard from '@/components/exam/ExamRoleGuard'
import ExamDrawPage from '@/components/exam/ExamDrawPage'

export const Route = createFileRoute('/de-thi/rut-de')({
	component: () => (
		<ProtectedRoute>
			<ExamRoleGuard navKey='draw'>
				<ExamDrawPage />
			</ExamRoleGuard>
		</ProtectedRoute>
	)
})
