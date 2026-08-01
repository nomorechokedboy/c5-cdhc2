import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamRoleGuard from '@/components/exam/ExamRoleGuard'
import ExamFacultiesPage from '@/components/exam/ExamFacultiesPage'

export const Route = createFileRoute('/de-thi/khoa')({
	component: () => (
		<ProtectedRoute>
			<ExamRoleGuard navKey='catalog'>
				<ExamFacultiesPage />
			</ExamRoleGuard>
		</ProtectedRoute>
	)
})
