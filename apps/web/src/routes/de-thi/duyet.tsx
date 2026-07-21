import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamRoleGuard from '@/components/exam/ExamRoleGuard'
import ExamApprovalPage from '@/components/exam/ExamApprovalPage'

export const Route = createFileRoute('/de-thi/duyet')({
	component: () => (
		<ProtectedRoute>
			<ExamRoleGuard navKey='approve'>
				<ExamApprovalPage />
			</ExamRoleGuard>
		</ProtectedRoute>
	)
})
