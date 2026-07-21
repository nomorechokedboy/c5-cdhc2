import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamRoleGuard from '@/components/exam/ExamRoleGuard'
import ExamTeachersPage from '@/components/exam/ExamTeachersPage'

export const Route = createFileRoute('/de-thi/giao-vien')({
	component: () => (
		<ProtectedRoute>
			<ExamRoleGuard navKey='teachers'>
				<ExamTeachersPage />
			</ExamRoleGuard>
		</ProtectedRoute>
	)
})
