import { createFileRoute } from '@tanstack/react-router'
import ProtectedRoute from '@/components/ProtectedRoute'
import ExamEditorPage from '@/components/exam/ExamEditorPage'

export const Route = createFileRoute('/de-thi/soan/$id')({
	component: RouteComponent
})

function RouteComponent() {
	const { id } = Route.useParams()
	return (
		<ProtectedRoute>
			<ExamEditorPage examId={Number(id)} />
		</ProtectedRoute>
	)
}
