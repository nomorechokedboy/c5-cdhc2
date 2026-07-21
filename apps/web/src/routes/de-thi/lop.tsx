import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamRoleGuard from '@/components/exam/ExamRoleGuard'
import ExamClassesPage from '@/components/exam/ExamClassesPage'

export const Route = createFileRoute('/de-thi/lop')({
	component: () => (
		<ProtectedRoute>
			<ExamRoleGuard navKey='classes'>
				<ExamClassesPage />
			</ExamRoleGuard>
		</ProtectedRoute>
	)
})
