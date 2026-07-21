import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamRoleGuard from '@/components/exam/ExamRoleGuard'
import ExamBankPage from '@/components/exam/ExamBankPage'

export const Route = createFileRoute('/de-thi/ngan-hang')({
	component: () => (
		<ProtectedRoute>
			<ExamRoleGuard navKey='bank'>
				<ExamBankPage />
			</ExamRoleGuard>
		</ProtectedRoute>
	)
})
