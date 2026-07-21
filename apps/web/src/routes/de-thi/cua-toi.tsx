import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import MyExamsPage from '@/components/exam/MyExamsPage'

export const Route = createFileRoute('/de-thi/cua-toi')({
	component: () => (
		<ProtectedRoute>
			<MyExamsPage />
		</ProtectedRoute>
	)
})
