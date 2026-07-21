import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamRoleGuard from '@/components/exam/ExamRoleGuard'
import ExamAssignmentPage from '@/components/exam/ExamAssignmentPage'

export const Route = createFileRoute('/de-thi/phan-cong')({
	component: () => (
		<ProtectedRoute>
			<ExamRoleGuard navKey='assign'>
				<ExamAssignmentPage />
			</ExamRoleGuard>
		</ProtectedRoute>
	)
})
