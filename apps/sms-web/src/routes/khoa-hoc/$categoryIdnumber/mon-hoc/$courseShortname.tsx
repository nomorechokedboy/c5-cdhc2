import ProtectedRoute from '@/components/ProtectedRoute'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
	'/khoa-hoc/$categoryIdnumber/mon-hoc/$courseShortname'
)({
	component: RouteComponent
})

function RouteComponent() {
	const { courseShortname, categoryIdnumber } = Route.useParams()

	return (
		<ProtectedRoute>
			<div>
				Hello "/khoa-hoc/{categoryIdnumber}/mon-hoc/{courseShortname}"!
			</div>
		</ProtectedRoute>
	)
}
