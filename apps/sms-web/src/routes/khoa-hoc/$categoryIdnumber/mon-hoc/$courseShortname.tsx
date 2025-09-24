import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute(
	'/khoa-hoc/$categoryIdnumber/mon-hoc/$courseShortname'
)({
	component: RouteComponent
})

function RouteComponent() {
	const { courseShortname, categoryIdnumber } = Route.useParams()

	return (
		<div>
			Hello "/khoa-hoc/{categoryIdnumber}/mon-hoc/{courseShortname}"!
		</div>
	)
}
