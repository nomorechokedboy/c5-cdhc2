import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamDetailPage from '@/components/exam/ExamDetailPage'

export const Route = createFileRoute('/de-thi/chi-tiet/$id')({
	component: RouteComponent
})

function RouteComponent() {
	const { id } = Route.useParams()
	return (
		<ProtectedRoute>
			<ExamDetailPage examId={Number(id)} />
		</ProtectedRoute>
	)
}
