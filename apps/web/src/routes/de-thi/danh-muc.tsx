import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamRoleGuard from '@/components/exam/ExamRoleGuard'
import ExamCatalogPage from '@/components/exam/ExamCatalogPage'

export const Route = createFileRoute('/de-thi/danh-muc')({
	component: () => (
		<ProtectedRoute>
			<ExamRoleGuard navKey='catalog'>
				<ExamCatalogPage />
			</ExamRoleGuard>
		</ProtectedRoute>
	)
})
